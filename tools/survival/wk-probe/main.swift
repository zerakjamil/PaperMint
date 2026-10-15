// wkprobe — WKWebView localStorage durability probe (Gate 4, PaperMint).
//
// Question under test: after localStorage.setItem(...) returns inside the
// webview, is the value guaranteed to survive a SIGKILL of the host app?
// The app's autosave promise ("Autosaved…") is set after setItem returns, so
// this probe models exactly that promise.
//
// Modes:
//   reset              clear localStorage, delete the ack log, print RESET_OK
//   write [bytes]      continue from current seq; setItem loop; after each
//                      setItem returns, append "ACK n" to the log and
//                      F_FULLFSYNC it (the durable witness)
//   report             print the recovered state:
//                        REPORT seq=<n> rec_i=<n> ok=<0|1>
//                        ACKMAX <n>   (largest ACK ever fsynced)
//
// Invariant: at every report, seq must be >= ACKMAX. A violation means a
// setItem that had already returned was lost by SIGKILL — i.e. the promise
// is unsound and the app must not rely on localStorage for "zero loss".

import Cocoa
import WebKit
import Darwin

let args = CommandLine.arguments
let mode = args.count > 1 ? args[1] : "report"
let payloadBytes = args.count > 2 ? (Int(args[2]) ?? 65536) : 65536

let exeDir = URL(fileURLWithPath: args[0]).deletingLastPathComponent()
let ackPath = exeDir.appendingPathComponent("wkprobe.ack.log").path

let html = "<!doctype html><meta charset=utf-8><title>wkprobe</title><body>wkprobe</body>"
let baseURL = URL(string: "http://localhost/wkprobe")!

final class Probe: NSObject, WKNavigationDelegate {
    let webView: WKWebView
    let mode: String
    let ackPath: String
    let pad: String
    var counter = 0
    var ackHandle: FileHandle?

    init(webView: WKWebView, mode: String, payloadBytes: Int, ackPath: String) {
        self.webView = webView
        self.mode = mode
        self.ackPath = ackPath
        self.pad = String(repeating: "x", count: max(0, payloadBytes - 64))
        super.init()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        switch mode {
        case "reset": doReset()
        case "write": readSeqThenStart()
        default: doReport()
        }
    }

    func doReset() {
        webView.evaluateJavaScript("localStorage.clear(); 'OK'") { _, err in
            try? FileManager.default.removeItem(atPath: self.ackPath)
            print("RESET_OK\(err == nil ? "" : " ERR")")
            exit(err == nil ? 0 : 2)
        }
    }

    func readSeqThenStart() {
        webView.evaluateJavaScript("localStorage.getItem('seq') ?? '0'") { res, _ in
            if let s = res as? String, let n = Int(s) { self.counter = n }
            if !FileManager.default.fileExists(atPath: self.ackPath) {
                FileManager.default.createFile(atPath: self.ackPath, contents: nil)
            }
            self.ackHandle = FileHandle(forWritingAtPath: self.ackPath)
            self.ackHandle?.seekToEndOfFile()
            print("WRITE_START seq=\(self.counter)")
            self.loop()
        }
    }

    func loop() {
        counter += 1
        let js = "localStorage.setItem('seq', '\(counter)');" +
                 "localStorage.setItem('rec', '{\"i\":\(counter),\"pad\":\"\(pad)\"}');" +
                 "'\(counter)'"
        webView.evaluateJavaScript(js) { _, error in
            guard error == nil else {
                FileHandle.standardError.write("JSERR \(String(describing: error))\n".data(using: .utf8)!)
                exit(2)
            }
            let line = "ACK \(self.counter)\n"
            self.ackHandle?.write(line.data(using: .utf8)!)
            _ = fcntl(self.ackHandle?.fileDescriptor ?? -1, F_FULLFSYNC, 0)
            self.loop()
        }
    }

    func doReport() {
        let js = """
        (function(){
          var seq = localStorage.getItem('seq');
          var rec = localStorage.getItem('rec');
          var recI = 'null';
          try { recI = String(JSON.parse(rec).i); } catch (e) { if (rec !== null) recI = 'PARSE_ERR'; }
          return (seq === null ? 'null' : seq) + '|' + recI;
        })()
        """
        webView.evaluateJavaScript(js) { res, err in
            let payload = (res as? String) ?? "ERR"
            let parts = payload.split(separator: "|", maxSplits: 1, omittingEmptySubsequences: false)
            let seq = parts.count > 0 ? String(parts[0]) : "null"
            let recI = parts.count > 1 ? String(parts[1]) : "ERR"
            let ok = (seq == recI && seq != "null" && seq != "ERR") ? 1 : 0
            print("REPORT seq=\(seq) rec_i=\(recI) ok=\(ok)")
            var ackMax = -1
            if let data = FileManager.default.contents(atPath: self.ackPath),
               let text = String(data: data, encoding: .utf8) {
                for line in text.split(separator: "\n").reversed() where line.hasPrefix("ACK ") {
                    if let n = Int(line.dropFirst(4)) { ackMax = n; break }
                }
            }
            print("ACKMAX \(ackMax)")
            exit(err == nil ? 0 : 2)
        }
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let config = WKWebViewConfiguration()
let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 120, height: 80), configuration: config)

let window = NSWindow(contentRect: NSRect(x: 20, y: 20, width: 120, height: 80),
                      styleMask: [.borderless], backing: .buffered, defer: false)
window.contentView = webView
window.orderBack(nil)
window.isReleasedWhenClosed = false

let probe = Probe(webView: webView, mode: mode, payloadBytes: payloadBytes, ackPath: ackPath)
webView.navigationDelegate = probe
webView.loadHTMLString(html, baseURL: baseURL)

if mode != "write" {
    // Watchdog for report/reset: never hang a campaign.
    DispatchQueue.main.asyncAfter(deadline: .now() + 60) { exit(3) }
}

app.run()
