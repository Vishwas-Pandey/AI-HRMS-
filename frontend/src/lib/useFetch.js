import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "./api";

// GET helper with loading/error state and a reload() for retry buttons and refreshes.
export const useFetch = (url, { enabled = true } = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled && url));

  const load = useCallback(async () => {
    if (!enabled || !url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
};
