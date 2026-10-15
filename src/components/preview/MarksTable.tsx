
type Props = {
  questionCount: number
  totalMarks: number
}

export const MarksTable = ({ questionCount, totalMarks }: Props) => {
  const rows = Array.from({ length: questionCount }, (_, i) => `پ${i + 1}`)

  return (
    <div
      className="flex border-[1.5px] border-slate-900 bg-white"
      dir="rtl"
      style={{ pageBreakInside: 'avoid' }}
    >
      {/* Right side: Questions breakdown */}
      <div className="flex flex-1 flex-col">
        {/* Header row */}
        <div className="flex border-b-[1.5px] border-slate-900 text-center text-sm font-bold">
          <div className="w-12 border-l-[1.5px] border-slate-900 py-1.5">پ</div>
          <div className="w-16 border-l-[1.5px] border-slate-900 py-1.5">نمره</div>
          <div className="flex-1 border-l-[1.5px] border-slate-900 py-1.5">نمره بەنووسین</div>
          <div className="flex-1 border-l-[1.5px] border-slate-900 py-1.5">واژووی مامۆستا</div>
          <div className="flex-1 py-1.5">واژووی وردبین</div>
        </div>

        {/* Rows for each question */}
        {rows.map((r) => (
          <div key={r} className="flex border-b-[1.5px] border-slate-900">
            <div className="w-12 border-l-[1.5px] border-slate-900 py-2.5 text-center text-sm">{r}</div>
            <div className="w-16 border-l-[1.5px] border-slate-900 py-2.5"></div>
            <div className="flex-1 border-l-[1.5px] border-slate-900 py-2.5"></div>
            <div className="flex-1 border-l-[1.5px] border-slate-900 py-2.5"></div>
            <div className="flex-1 py-2.5"></div>
          </div>
        ))}

        {/* Total row */}
        <div className="flex bg-slate-50">
          <div className="w-12 border-l-[1.5px] border-slate-900 py-2.5 text-center text-sm font-bold">کۆ</div>
          <div className="w-16 border-l-[1.5px] border-slate-900 py-2.5"></div>
          <div className="flex-1 border-l-[1.5px] border-slate-900 py-2.5"></div>
          <div className="flex-1 border-l-[1.5px] border-slate-900 py-2.5"></div>
          <div className="flex-1 py-2.5"></div>
        </div>
      </div>

      {/* Left side: Large Total Marks Box */}
      <div className="flex w-32 flex-col items-center justify-start border-r-[1.5px] border-slate-900 pt-2 relative">
        <div className="text-sm font-bold">كۆی گشتی نمرهكە</div>
        <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-900 text-4xl font-bold">
          {totalMarks}
        </div>
      </div>
    </div>
  )
}
