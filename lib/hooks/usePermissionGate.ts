import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useDialog } from '../../components/common/AppDialog';
import { useT } from '../i18n/LocaleProvider';

/**
 * Pre-permission flow that wraps an OS permission request with our own
 * design-system dialog.
 *
 * Why this exists:
 *   The screenshot from the user shows the Expo "Nexora needs
 *   permissions for fine location" prompt rendered in stock OS chrome
 *   (white card, blue buttons) which is jarring against our dark UI.
 *   We can't restyle the system prompt itself — Android/iOS render it
 *   in a separate process — but we *can* show our own AppDialog first,
 *   explaining *why* we need the permission, and only then call the OS
 *   API. The OS prompt then becomes a brief confirmation step rather
 *   than the user's first encounter with the request.
 *
 * Flow:
 *   1. Caller invokes `gate(kind, askOS)` where `askOS` is the actual
 *      `Location.requestPermissionsAsync` (or similar) wrapped in a
 *      function returning the `'granted' | 'denied' | 'undetermined'`
 *      status.
 *   2. We show an AppDialog with a kind-specific rationale — title,
 *      explanation paragraph, "Allow" + "Not now" buttons.
 *   3. User taps "Allow" → we call askOS → the system prompt appears.
 *   4. User taps "Not now" → we resolve `'denied'` without ever
 *      touching the OS API. No prompt is ever shown.
 *   5. If askOS returns `'denied'` (because the user previously denied
 *      and the OS suppresses re-prompts), we show a second AppDialog
 *      offering to open system settings.
 *
 * The hook returns a status string so the caller can branch on result
 * the same way `Location.requestForegroundPermissionsAsync()` does.
 */

export type PermissionKind = 'location' | 'camera' | 'notifications';
export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PermissionGate {
  /**
   * Show the pre-permission rationale, then dispatch to the OS prompt
   * if the user agrees. Returns the final status.
   */
  request: (
    kind: PermissionKind,
    askOS: () => Promise<PermissionStatus>,
  ) => Promise<PermissionStatus>;
}

export function usePermissionGate(): PermissionGate {
  const dialog = useDialog();
  const t = useT();

  const request = useCallback(
    async (
      kind: PermissionKind,
      askOS: () => Promise<PermissionStatus>,
    ): Promise<PermissionStatus> => {
      const copy = t.common.permission;
      const titleByKind: Record<PermissionKind, string> = {
        location: copy.locationTitle,
        camera: copy.cameraTitle,
        notifications: copy.notificationsTitle,
      };
      const messageByKind: Record<PermissionKind, string> = {
        location: copy.locationMessage,
        camera: copy.cameraMessage,
        notifications: copy.notificationsMessage,
      };

      // Step 1: rationale dialog. User can decline before ever seeing
      // the OS prompt — that's a feature, not a bug. Opting out here
      // saves the OS the "remembered as denied" state which would
      // otherwise prevent re-asking.
      const userAgreed = await dialog.confirm({
        title: titleByKind[kind],
        message: messageByKind[kind],
        confirmLabel: copy.allow,
        cancelLabel: copy.notNow,
        variant: 'info',
      });
      if (!userAgreed) return 'denied';

      // Step 2: hand off to the OS. AppDialog resolves its promise
      // only after the iOS UIKit Modal dismissal transition completes
      // (via Modal's onDismiss), so the OS permission prompt presents
      // cleanly without racing with the in-flight modal stack.
      const osStatus = await askOS();
      if (osStatus === 'granted') return 'granted';

      // Step 3: still denied. Most platforms now refuse to re-prompt
      // (iOS one-shot, Android post-11 with two-strike rule), so the
      // only way back is system settings. Offer that as a follow-up.
      const goToSettings = await dialog.confirm({
        title: copy.deniedTitle,
        message: copy.deniedMessage,
        confirmLabel: copy.openSettings,
        cancelLabel: t.common.cancel,
        variant: 'warning',
      });
      if (goToSettings) {
        try {
          await Linking.openSettings();
        } catch {
          // Settings unreachable (e.g. very early boot or Expo Go web).
          // Resolve denied; caller can show its own affordance.
        }
      }
      return osStatus;
    },
    [dialog, t],
  );

  return { request };
}
