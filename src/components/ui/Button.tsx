import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'danger' | 'ghost'
}

const variantClass: Record<NonNullable<Props['variant']>, string> = {
  default:
    'bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900',
  secondary:
    'bg-white text-slate-900 border border-slate-300 hover:border-slate-500 focus-visible:outline-slate-600',
  danger:
    'bg-rose-700 text-white hover:bg-rose-600 focus-visible:outline-rose-700',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-600',
}

export const Button = ({
  className = '',
  variant = 'default',
  type = 'button',
  ...props
}: Props) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]} ${className}`}
    {...props}
  />
)
