import { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../../store/AuthProvider';

interface Props {
  children: ReactNode;
  /** Where to send unauthenticated users. Defaults to /login. */
  redirectTo?: string;
}

/**
 * Drop-in auth gate for stack screens that require a logged-in user.
 *
 * Use it as the outermost element when a screen depends on `user` /
 * `currentTenantId` / API calls — without it a deep link directly to
 * the route would render against `user=null` and crash on the first
 * property access (FE-C5). The gate renders nothing during the auth
 * boot phase so we don't flash the login screen on a normal cold
 * start.
 *
 * Usage:
 *
 *   export default function ProfileEditScreen() {
 *     return (
 *       <AuthGate>
 *         <ActualProfileEditScreen />
 *       </AuthGate>
 *     );
 *   }
 */
export default function AuthGate({ children, redirectTo = '/login' }: Props) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href={redirectTo as any} />;

  return <>{children}</>;
}
