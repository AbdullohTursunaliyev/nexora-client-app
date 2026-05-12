import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../store/AuthProvider';
import CustomTabBar from '../../components/tabs/CustomTabBar';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Auth guard: a deep link to /(tabs)/wallet on a logged-out device
  // used to render the screen with `user=null`, which then crashed on
  // every property access. Now we redirect to /login immediately.
  // While the auth boot is still running we render the existing tab
  // shell — the AuthProvider's resetAuth will fire if the boot fails.
  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Hide the tab bar when the keyboard is up so the user gets
        // more room for chat / form input (was RESP-H6). The custom
        // tab bar receives this signal via the Tabs context and just
        // doesn't render.
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* Order here is the registration order — the CustomTabBar
          filters and orders to: Home, Discover, [QR FAB], Wallet,
          Profile. `bookings` is hidden from the bar (href: null) but
          remains a real route, opened from the Profile quick-link
          and from the booking-success "go to bookings" path. */}
      <Tabs.Screen name="index" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen
        name="bookings"
        options={{
          // Hide from the tab bar; the screen is still reachable via
          // `/bookings` (or `/(tabs)/bookings`). Pre-redesign this
          // was a 3rd tab slot; moved off to give the centre to the
          // QR action FAB. The Profile screen's quick-link card is
          // the canonical entry point now.
          href: null,
        }}
      />
      <Tabs.Screen name="wallet" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
