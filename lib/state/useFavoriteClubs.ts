import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@nexora/favorite-clubs';

export function useFavoriteClubs() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v) {
          try {
            const arr: string[] = JSON.parse(v);
            setFavorites(new Set(arr));
          } catch {}
        }
      })
      .finally(() => setReady(true));
  }, []);

  // Persist on `favorites` changes, not inside the state updater.
  // Pre-fix (FE-H15) `persist(next)` was called inside `setFavorites`'s
  // updater function. React 19 strict mode runs updaters TWICE in dev,
  // so AsyncStorage was being written twice for every toggle. Plus the
  // promise from AsyncStorage was never awaited — error swallowing.
  // Side effects belong in useEffect, not in pure reducer-style updaters.
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites])).catch(
      () => {
        // Quiet — favourites aren't safety-critical state.
      },
    );
  }, [favorites, ready]);

  const isFavorite = useCallback(
    (clubId: string) => favorites.has(clubId),
    [favorites],
  );

  const toggle = useCallback((clubId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(clubId)) next.delete(clubId);
      else next.add(clubId);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggle, ready };
}
