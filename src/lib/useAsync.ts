// Tiny async-data hook so pages can load from the DataService with loading state.
import { useEffect, useState } from 'react';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): {
  data: T | undefined;
  loading: boolean;
  error: unknown;
} {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    setLoading(true);
    fn()
      .then((result) => {
        if (active) {
          setData(result);
          setError(undefined);
        }
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
