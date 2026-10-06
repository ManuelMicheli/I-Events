import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

export type Query<T> = {
  data: T | undefined;
  error: unknown;
  /** True only for the first load, when there is nothing to show yet. */
  loading: boolean;
  /** True while a pull-to-refresh is running. */
  refreshing: boolean;
  refresh: () => Promise<void>;
};

type State<T> = { key: string | null; data?: T; error: unknown; loading: boolean };

/**
 * Loads data for a screen and keeps it fresh: again when the key changes, silently when the screen
 * comes back into focus, and on pull-to-refresh. A null key waits.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>): Query<T> {
  const [state, setState] = useState<State<T>>({ key, error: null, loading: key !== null });
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  const firstFocus = useRef(true);

  // A new key starts from scratch (state adjusted during render, as React recommends).
  if (state.key !== key) setState({ key, error: null, loading: key !== null });

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(async (forKey: string | null) => {
    if (forKey === null) return;
    try {
      const data = await fetcherRef.current();
      setState((s) => (s.key === forKey ? { key: forKey, data, error: null, loading: false } : s));
    } catch (error) {
      setState((s) => (s.key === forKey ? { ...s, error, loading: false } : s));
    }
  }, []);

  useEffect(() => {
    run(key);
  }, [key, run]);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else run(key);
    }, [key, run]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run(key);
    setRefreshing(false);
  }, [key, run]);

  return { data: state.data, error: state.error, loading: state.loading, refreshing, refresh };
}
