import { useEffect, useRef, useState } from 'react';
import { decodeParams, encodeParams } from '../lib/share';

/** Tool-page state mirrored into the URL fragment so a result can be shared as a link. */
export function useHashState<T extends Record<string, string>>(defaults: T) {
  const [state, setState] = useState<T>(defaults);
  const ready = useRef(false);
  useEffect(() => {
    const read = () => {
      const fromHash = decodeParams(location.hash);
      const picked = Object.fromEntries(Object.keys(defaults).filter((k) => k in fromHash).map((k) => [k, fromHash[k].slice(0, 40)]));
      if (Object.keys(picked).length) setState((s) => ({ ...s, ...picked }));
    };
    read();
    ready.current = true;
    // A result link opened while the page is already showing (only the #fragment changes).
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready.current) return;
    const changed = Object.fromEntries(Object.entries(state).filter(([k, v]) => v !== defaults[k]));
    const h = encodeParams(changed as Record<string, string>);
    history.replaceState(null, '', location.pathname + (h ? '#' + h : ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const set = (k: keyof T, v: string) => setState((s) => ({ ...s, [k]: v }));
  return [state, set] as const;
}
