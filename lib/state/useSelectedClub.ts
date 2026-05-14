import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../api/config';

// Re-bind to STORAGE_KEYS so this file's key is discoverable via the
// single source-of-truth map. Audit finding M4.
const STORAGE_KEY = STORAGE_KEYS.WALLET_SELECTED_CLUB;

export function useSelectedClub() {
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) setSelectedClubId(value);
      })
      .finally(() => setReady(true));
  }, []);

  const select = async (id: string | null) => {
    setSelectedClubId(id);
    try {
      if (id) await AsyncStorage.setItem(STORAGE_KEY, id);
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return { selectedClubId, select, ready };
}
