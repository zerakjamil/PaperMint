import { useUpdater } from '@/features/updates/useUpdater'

export const UpdateCheck = () => {
  const { state, check, install } = useUpdater()
  const canInstall = state.status === 'available' || state.status === 'downloading'

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-200 pt-4 text-sm text-stone-600">
      {canInstall ? (
        <button
          type="button"
          onClick={install}
          disabled={state.status === 'downloading'}
          className="font-medium text-stone-800 underline decoration-stone-400 underline-offset-4 hover:text-stone-950 disabled:opacity-60"
        >
          {state.status === 'downloading'
            ? state.percent === null
              ? 'Downloading…'
              : `Downloading… ${state.percent}%`
            : `Install v${state.version} and restart`}
        </button>
      ) : (
        <button
          type="button"
          onClick={check}
          disabled={state.status === 'checking'}
          className="underline decoration-stone-300 underline-offset-4 hover:text-stone-900 disabled:opacity-60"
        >
          {state.status === 'checking' ? 'Checking…' : 'Check for updates'}
        </button>
      )}
      <span>
        {state.status === 'up-to-date' && "You're up to date."}
        {state.status === 'error' && "Couldn't check for updates."}
        {state.status === 'available' && `PaperMint v${state.version} is available.`}
      </span>
    </div>
  )
}
