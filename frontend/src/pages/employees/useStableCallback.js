import { useCallback, useLayoutEffect, useRef } from "react";

// Returns a function with a stable identity that always calls the latest `fn`.
// Modal re-runs its focus effect when onClose changes, so handlers passed to it must be stable.
export const useStableCallback = (fn) => {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args) => ref.current?.(...args), []);
};
