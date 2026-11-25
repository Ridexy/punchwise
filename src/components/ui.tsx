import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ink-300/50 sm:p-6 ${className}`}>{children}</section>;
}

export function Button({ children, onClick, variant = 'primary', type = 'button', className = '', disabled, ariaLabel }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; type?: 'button' | 'submit';
  className?: string; disabled?: boolean; ariaLabel?: string;
}) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    secondary: 'bg-white text-ink-900 ring-1 ring-ink-300 hover:bg-ink-100',
    ghost: 'text-brand-700 hover:bg-brand-50',
    danger: 'bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint, htmlFor }: { label: string; children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export const inputCls = 'min-h-[44px] w-full rounded-xl border border-ink-300 bg-white px-3 text-base text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-ink-100';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,button,textarea,select')?.focus(), 0);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 sm:items-center" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-ink-500 hover:bg-ink-100">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Faq({ items }: { items: [string, ReactNode][] }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-2xl font-bold">Frequently asked questions</h2>
      <div className="divide-y divide-ink-300/60 rounded-2xl bg-white ring-1 ring-ink-300/50">
        {items.map(([q, a]) => (
          <details key={q} className="group p-4">
            <summary className="flex min-h-[32px] cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              <h3 className="text-base">{q}</h3>
              <span className="text-xl text-ink-500 transition group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <div className="prose-sm mt-2 text-ink-700">{a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="prose mt-10 max-w-none space-y-4 text-[16px] leading-relaxed text-ink-700 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink-900 [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc [&_a]:text-brand-700 [&_a]:underline [&_table]:w-full [&_td]:border-b [&_td]:border-ink-300/50 [&_td]:py-1.5 [&_th]:py-1.5 [&_th]:text-left">{children}</div>;
}

export function CtaCalculator({ text = 'Need a whole week, with overtime and a signed PDF?' }: { text?: string }) {
  return (
    <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-medium text-ink-900">{text}</p>
      <Link to="/" className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700">Open the time card calculator →</Link>
    </div>
  );
}

export function Toast({ message, action }: { message: string | null; action?: { label: string; onClick: () => void } | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
      {message && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {message}
          {action && <button onClick={action.onClick} className="min-h-[32px] rounded-full px-2 font-bold text-brand-100 underline">{action.label}</button>}
        </div>
      )}
    </div>
  );
}
