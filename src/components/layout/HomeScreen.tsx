import { Button } from '@/components/ui/Button'

type Props = {
  onNew: () => void
  onNewLinuxGuiTemplate: () => void
  onOpen: () => void
}

export const HomeScreen = ({ onNew, onNewLinuxGuiTemplate, onOpen }: Props) => (
  <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#f6f2ea,transparent_60%),linear-gradient(145deg,#f7f6f3,#ebe8df)] p-6">
    <div className="w-full max-w-3xl rounded-3xl border border-stone-300/70 bg-white/80 p-8 shadow-2xl backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Offline First</p>
      <h1 className="mt-2 text-4xl font-bold leading-tight text-stone-900">PaperMint Exam Builder</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-700">
        Build university exam papers with fixed academic styling, structured question blocks, and reliable export.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button className="px-5 py-3" onClick={onNew}>
          New Exam
        </Button>
        <Button className="px-5 py-3" variant="secondary" onClick={onNewLinuxGuiTemplate}>
          Linux GUI Template
        </Button>
        <Button className="px-5 py-3" variant="secondary" onClick={onOpen}>
          Open Project
        </Button>
      </div>
    </div>
  </main>
)
