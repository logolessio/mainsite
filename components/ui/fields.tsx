import { cn } from '@/lib/utils'

export const inputCls =
  'h-12 w-full border border-line-strong bg-ink/75 px-4 text-sm placeholder:text-mute focus:border-paper/60 focus:outline-none disabled:opacity-50'

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="font-mono text-xs text-mute">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint && <span className="mt-1.5 block text-xs text-mute">{hint}</span>}
    </label>
  )
}

export function Input(props: React.ComponentProps<'input'>) {
  return <input {...props} className={cn(inputCls, props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, 'h-auto min-h-32 py-3', props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, 'appearance-none', props.className)} />
}

export function PrimaryButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-50',
        className,
      )}
    />
  )
}

export function GhostButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 border border-line-strong px-6 text-sm transition-colors hover:bg-paper/10 disabled:opacity-50',
        className,
      )}
    />
  )
}
