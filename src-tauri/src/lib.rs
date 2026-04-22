mod commands;
mod export;
mod fs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::import_docx_template])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
