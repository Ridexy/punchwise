import { useState } from 'react';

export function CopyResultLink() {
  const [done, setDone] = useState(false);
  const copy = async () => {
    const url = location.href;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ url, title: document.title });
      else await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch { /* cancelled */ }
  };
  return (
    <button onClick={copy} className="min-h-[44px] rounded-xl px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">
      {done ? '✓ Link ready' : '🔗 Share this result'}
    </button>
  );
}
