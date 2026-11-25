export function PrintButton({ label = 'Print chart' }: { label?: string }) {
  return <button onClick={() => window.print()} className="no-print min-h-[44px] rounded-xl px-3 text-sm font-semibold text-brand-700 ring-1 ring-ink-300 hover:bg-brand-50">🖨 {label}</button>;
}
