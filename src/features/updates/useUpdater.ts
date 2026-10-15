import { useCallback, useState } from 'react'
import type { Update } from '@tauri-apps/plugin-updater'

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up-to-date' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number | null }
  | { status: 'error' }

export const useUpdater = () => {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const [pending, setPending] = useState<Update | null>(null)

  const check = useCallback(async () => {
    setState({ status: 'checking' })
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (!update) {
        setState({ status: 'up-to-date' })
        return
      }
      setPending(update)
      setState({ status: 'available', version: update.version })
    } catch {
      setState({ status: 'error' })
    }
  }, [])

  const install = useCallback(async () => {
    if (!pending) return
    try {
      setState({ status: 'downloading', percent: null })
      let total: number | null = null
      let received = 0
      await pending.downloadAndInstall((event) => {
        if (event.event === 'Started') total = event.data.contentLength ?? null
        if (event.event === 'Progress') {
          received += event.data.chunkLength
          setState({
            status: 'downloading',
            percent: total ? Math.round((received / total) * 100) : null,
          })
        }
      })
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch {
      setState({ status: 'error' })
    }
  }, [pending])

  return { state, check, install }
}
