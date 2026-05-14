import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import {
  Orbitron_700Bold,
  Orbitron_800ExtraBold,
  Orbitron_900Black,
} from '@expo-google-fonts/orbitron';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import AuthProvider from '../store/AuthProvider';
import ToastProvider from '../components/common/Toast';
import AppDialogProvider from '../components/common/AppDialog';
import LocaleProvider from '../lib/i18n/LocaleProvider';
import { Colors } from '../constants/Colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_800ExtraBold,
    Orbitron_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
      // edge-to-edge enabled, so we only set button style
      NavigationBar.setButtonStyleAsync('light').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // Provider order matters: Locale -> Toast -> Auth.
  //   - LocaleProvider must wrap so toasts/errors render in the active
  //     language.
  //   - ToastProvider must wrap AuthProvider so the auth-event listener
  //     can show toasts on 401 (FE-C3 wiring).
  //   - AuthProvider must be inside both so its consumers (Stack / route
  //     guards) get translated copy and a working toast bus.
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: Colors.background }}>
      <LocaleProvider>
        <ToastProvider>
          <AppDialogProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="club-details" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="zone-select" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="seat-select" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="time-select" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="payment" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="booking-success" options={{ animation: 'fade' }} />
              <Stack.Screen name="wallet-topup" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="qr-scan" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="active-session" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="zone-switch" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="services" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="tournaments" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="tournament-details" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="team-finder" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="team-chat" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="rating" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="achievements" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="favorites" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="help-support" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
              {/* Settings → "Transaction history" routes here. Pre-fix
                  the row pointed at /(tabs)/bookings (reservation list)
                  even though the copy promised transaction history —
                  see settings.tsx docblock. */}
              <Stack.Screen name="transaction-history" options={{ animation: 'slide_from_right' }} />
              {/* Settings → "Notification settings" routes here. Pre-fix
                  the row pointed at /notifications (the inbox), which
                  is reachable from the bell on Home anyway — so the
                  Settings row duplicated existing access AND its
                  "settings" label was misleading. The new screen
                  surfaces real per-category toggles. */}
              <Stack.Screen name="notification-settings" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="ai-assistant" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="smart-recommendations" options={{ animation: 'slide_from_right' }} />
              {/* rewards-center / rewards-store screens were removed
                  pre-ship (no backend support — see project memo
                  rewards_soon). Their Stack.Screen entries were dead
                  references that expo-router would fail to resolve if
                  anything ever called router.push('/rewards-center').
                  promotions-list registered below as its replacement
                  for marketing offers. */}
              <Stack.Screen name="promotions-list" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="refer-earn" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="statistics" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="profile-edit" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="club-join" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="club-preview" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="clubs-switch" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="friends-list" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="friend-requests" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="write-review" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="club-reviews-list" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="my-reviews" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="smart-seat" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="smart-queue" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="party-booking" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="language-select" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="clubs-list" options={{ animation: 'slide_from_right' }} />
            </Stack>
          </AuthProvider>
          </AppDialogProvider>
        </ToastProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
