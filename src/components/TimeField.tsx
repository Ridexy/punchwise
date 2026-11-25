import { useEffect, useId, useState } from 'react';
import { displayTime, flipMeridiem, guessMeridiem, parseTimeInput } from '../lib/time';

/**
 * Free-typing time box: accepts 9, 930, 9:30, 9.30, 5p, 5:30 pm, 1730.
 * Shows how the entry was interpreted; ambiguous AM/PM gets a one-tap toggle.
 * Invalid entries are rejected (value cleared) and flagged, never guessed.
 */
export function TimeField({ value, onChange, clock, role, other, label, disabled }: {
  value: string; onChange: (v: string) => void; clock: 12 | 24; role: 'in' | 'out'; other: string; label: string; disabled?: boolean;
}) {
  const [text, setText] = useState(() => displayTime(value, clock));
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);
  const hintId = useId();

  // Reflect outside changes (punch now, copy day, load) when not typing.
  useEffect(() => { if (!focused) { setText(displayTime(value, clock)); if (!value) setError(false); } }, [value, clock, focused]);

  const commit = (raw: string) => {
    if (!raw.trim()) { setError(false); setAmbiguous(false); onChange(''); return; }
    const p = parseTimeInput(raw, clock, guessMeridiem(raw, role, other));
    if (!p) { setError(true); setAmbiguous(false); onChange(''); return; }
    setError(false); setAmbiguous(p.ambiguous); onChange(p.value);
  };

  return (
    <div className="relative">
      <input
        type="text" inputMode="text" autoComplete="off" spellCheck={false} disabled={disabled}
        aria-label={label} aria-invalid={error || undefined} aria-describedby={hintId}
        placeholder={clock === 12 ? 'e.g. 9 or 5:30p' : 'e.g. 0900'}
        className={`min-h-[44px] w-full rounded-xl border bg-white pl-3 ${clock === 12 && value ? 'pr-14' : 'pr-3'} text-base text-ink-900 placeholder:text-sm placeholder:text-ink-300 focus:outline-none focus:ring-2 disabled:bg-ink-100 ${error ? 'border-red-500 focus:ring-red-500/30' : 'border-ink-300 focus:border-brand-500 focus:ring-brand-500/30'}`}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => { setText(e.target.value); commit(e.target.value); }}
        onBlur={() => { setFocused(false); if (!error) setText(displayTime(value, clock)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
      {clock === 12 && value && !disabled && (
        <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()}
          onClick={() => { const v = flipMeridiem(value); onChange(v); setAmbiguous(false); setText(displayTime(v, clock)); }}
          aria-label={`Switch ${label} to ${value < '12:00' ? 'PM' : 'AM'}`} title={ambiguous ? 'We guessed AM/PM. Tap to switch.' : 'Tap to switch AM/PM'}
          className={`absolute right-1.5 top-1.5 h-8 rounded-lg px-2 text-xs font-bold ${ambiguous ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' : 'bg-ink-100 text-ink-700'}`}>
          {value < '12:00' ? 'AM' : 'PM'}
        </button>
      )}
      <p id={hintId} className={`mt-0.5 min-h-[16px] text-xs ${error ? 'text-red-700' : 'text-ink-500'}`} aria-live="polite">
        {error ? 'Not a valid time' : focused && value ? `= ${displayTime(value, clock)}${ambiguous ? ' (tap AM/PM to change)' : ''}` : ''}
      </p>
    </div>
  );
}
