import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterKey } from '../../components/discover/FilterChips';
import { AdvancedFilters } from '../../components/discover/FilterSheet';
import { STORAGE_KEYS } from '../api/config';

/**
 * Persisted filter state for the discover tab.
 *
 * `filter`     — quick chip key (all / pc / ps / open)
 * `advanced`   — rating + distance pickers from FilterSheet
 * `ready`      — set true after both hydrate from AsyncStorage so the
 *                screen can avoid the flash from the default state to
 *                whatever the user persisted
 *
 * Keys sourced from STORAGE_KEYS for discoverability. Audit M4.
 */
const KEY_FILTER = STORAGE_KEYS.DISCOVER_FILTER;
const KEY_ADV = STORAGE_KEYS.DISCOVER_ADVANCED;

const DEFAULT_ADV: AdvancedFilters = { minRating: null, maxDistanceKm: null };

interface PersistedState {
  filter: FilterKey;
  advanced: AdvancedFilters;
  ready: boolean;
  setFilter: (k: FilterKey) => void;
  setAdvanced: (a: AdvancedFilters) => void;
}

function isFilterKey(value: unknown): value is FilterKey {
  return value === 'all' || value === 'pc' || value === 'ps' || value === 'open';
}

export function useDiscoverFilters(): PersistedState {
  const [filter, setFilterState] = useState<FilterKey>('all');
  const [advanced, setAdvancedState] = useState<AdvancedFilters>(DEFAULT_ADV);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(KEY_FILTER), AsyncStorage.getItem(KEY_ADV)])
      .then(([f, a]) => {
        if (isFilterKey(f)) setFilterState(f);
        if (a) {
          try {
            setAdvancedState(JSON.parse(a));
          } catch {
            // Bad payload — fall back to defaults.
          }
        }
      })
      .finally(() => setReady(true));
  }, []);

  const setFilter = (k: FilterKey) => {
    setFilterState(k);
    AsyncStorage.setItem(KEY_FILTER, k).catch(() => {});
  };
  const setAdvanced = (a: AdvancedFilters) => {
    setAdvancedState(a);
    AsyncStorage.setItem(KEY_ADV, JSON.stringify(a)).catch(() => {});
  };

  return { filter, advanced, ready, setFilter, setAdvanced };
}
