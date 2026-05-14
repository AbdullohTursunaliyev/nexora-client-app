import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { useAuth } from '../store/AuthProvider';
import { STORAGE_KEYS } from '../lib/api/config';

type Target = '/onboarding' | '/login' | '/(tabs)';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  // Start onboarding flag as `undefined` to mean "not yet known".
  // Pre-fix (FE-M13) the screen showed a spinner for one render after
  // the auth boot finished because `target` was set inside an effect
  // — that's an extra render flash. Now we read the AsyncStorage flag
  // in parallel with auth so the redirect can resolve in the first
  // render once both are ready.
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN)
      .then((seen) => setHasSeenOnboarding(seen === 'true'))
      .catch(() => {
        // AsyncStorage threw — VERY rare in practice (storage full or
        // a permission anomaly on Android). Pre-fix this lumped the
        // failure with the "key missing" case and dumped the user
        // back into onboarding. For an already-authenticated user
        // that's strictly wrong — they finished onboarding ages ago,
        // they just can't read the flag right now. Treat any storage
        // failure as "assume seen" so authed users skip straight to
        // tabs; unauthed users still see /login (the second branch
        // below kicks in regardless of this flag). Audit L3.
        setHasSeenOnboarding(true);
      });
  }, []);

  // Wait for both auth boot AND onboarding-flag fetch.
  if (isLoading || hasSeenOnboarding === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const target: Target = isAuthenticated
    ? '/(tabs)'
    : hasSeenOnboarding
      ? '/login'
      : '/onboarding';

  return <Redirect href={target} />;
}
