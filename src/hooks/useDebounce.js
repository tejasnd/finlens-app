import { useState, useEffect } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms of
 * silence. Used to throttle expensive filter recomputations (e.g. the
 * transactions search field) without making the controlled input feel laggy —
 * the input still updates on every keystroke, only the downstream computation
 * waits.
 */
export function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
