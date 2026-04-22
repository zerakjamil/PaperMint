import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  title?: string
  className?: string
}>

export const Panel = ({ title, className = '', children }: Props) => (
  <section className={`rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm ${className}`}>
    {title ? <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600">{title}</h3> : null}
    {children}
  </section>
)
