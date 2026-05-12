import { sanitizeRoute } from '../lib/utils/safeRoute';

describe('sanitizeRoute', () => {
  test('accepts in-app absolute paths', () => {
    expect(sanitizeRoute('/notifications')).toBe('/notifications');
    expect(sanitizeRoute('/tournament-details?id=12')).toBe('/tournament-details?id=12');
  });

  test('accepts https external links', () => {
    expect(sanitizeRoute('https://example.com/foo')).toBe('https://example.com/foo');
  });

  test('rejects custom schemes (mailto, tel, javascript, data)', () => {
    expect(sanitizeRoute('mailto:victim@example.com')).toBeNull();
    expect(sanitizeRoute('tel:+998901234567')).toBeNull();
    expect(sanitizeRoute('javascript:alert(1)')).toBeNull();
    expect(sanitizeRoute('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  test('rejects gameclub:// or any non-https custom scheme', () => {
    expect(sanitizeRoute('gameclub://payment?amount=999999')).toBeNull();
    expect(sanitizeRoute('http://insecure.com')).toBeNull();
  });

  test('rejects relative paths', () => {
    expect(sanitizeRoute('notifications')).toBeNull();
    expect(sanitizeRoute('../admin')).toBeNull();
  });

  test('rejects double-slash path traversal patterns', () => {
    expect(sanitizeRoute('//attacker.com/x')).toBeNull();
    expect(sanitizeRoute('/a//b')).toBeNull();
  });

  test('rejects empty / null / whitespace', () => {
    expect(sanitizeRoute(null)).toBeNull();
    expect(sanitizeRoute(undefined)).toBeNull();
    expect(sanitizeRoute('')).toBeNull();
    expect(sanitizeRoute('   ')).toBeNull();
  });
});
