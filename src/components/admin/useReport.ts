import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Loads a report every time its page comes into view (drawer pages stay
 * mounted, so a once-only load would show yesterday's figures), and again
 * whenever `load` changes — a new period or branch. `reload` is for
 * pull-to-refresh.
 */
export function useReport<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load this report.');
    }
  }, [load]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return { data, error, loading: data === null && !error, reload };
}
