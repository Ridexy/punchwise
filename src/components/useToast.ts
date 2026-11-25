import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastAction = { label: string; onClick: () => void };

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [action, setAction] = useState<ToastAction | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string, a: ToastAction | null = null) => {
    setMsg(m);
    setAction(a);
    clearTimeout(t.current);
    t.current = setTimeout(() => { setMsg(null); setAction(null); }, a ? 6000 : 2600);
  }, []);
  useEffect(() => () => clearTimeout(t.current), []);
  return [msg, show, action] as const;
}
