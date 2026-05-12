import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { useAuth } from '../store/AuthProvider';

type Target = '/onboarding' | '/login' | '/(tabs)';

const ONBOARDING_KEY = 'hasSeenOnboarding';

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
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((seen) => setHasSeenOnboarding(seen === 'true'))
      .catch(() => setHasSeenOnboarding(false));
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
