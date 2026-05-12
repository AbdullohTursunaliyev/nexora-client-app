// Tiny react-native stub for jest's node env. Service-layer tests don't
// render components — we just need `Platform.OS` to exist so secureStorage
// can branch.
export const Platform = {
  OS: 'ios' as 'ios' | 'android' | 'web' | 'windows' | 'macos',
  select: <T>(spec: { ios?: T; android?: T; web?: T; default?: T }): T | undefined => {
    return spec.ios ?? spec.default;
  },
};
