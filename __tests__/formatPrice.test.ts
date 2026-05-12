/**
 * Tests for `lib/utils/formatPrice.ts`.
 *
 * Locale-aware formatting using ru-RU as the base (space-separated
 * thousands), with the trailing currency unit appended verbatim. The
 * helper is used everywhere a price renders so a regression here would
 * splash mismatched units across every screen — pinning the contract
 * tightly.
 */

import { formatPrice, formatNumber } from '../lib/utils/formatPrice';

describe('formatPrice', () => {
  test('inserts space thousands separator for amounts >= 1000', () => {
    expect(formatPrice(20000, "so'm")).toBe("20 000 so'm");
    expect(formatPrice(1500000, "so'm")).toBe("1 500 000 so'm");
  });

  test('does not insert separators below 1000', () => {
    expect(formatPrice(0, "so'm")).toBe("0 so'm");
    expect(formatPrice(1, "so'm")).toBe("1 so'm");
    expect(formatPrice(999, "so'm")).toBe("999 so'm");
  });

  test('handles each supported currency unit verbatim', () => {
    // The helper does not localise the unit string itself — it just
    // appends what the caller passed in. This keeps the i18n
    // responsibility at the call site (`useT().common.currencyUnit`).
    expect(formatPrice(50000, "so'm")).toBe("50 000 so'm");
    expect(formatPrice(50000, 'сум')).toBe('50 000 сум');
    expect(formatPrice(50000, 'UZS')).toBe('50 000 UZS');
  });

  test('handles negative numbers (refund display)', () => {
    expect(formatPrice(-5000, "so'm")).toBe("-5 000 so'm");
  });

  test('handles fractional amounts by delegating to toLocaleString', () => {
    // Fractions are unusual in this currency but the helper must not
    // throw — toLocaleString strips them by default for integers, and
    // ru-RU keeps `,` as decimal which we then map to ` `. Verify the
    // integer-only path.
    expect(formatPrice(1500.0, "so'm")).toBe("1 500 so'm");
  });
});

describe('formatNumber', () => {
  test('returns numeric format without unit suffix', () => {
    expect(formatNumber(1500)).toBe('1 500');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1234567)).toBe('1 234 567');
  });

  test('matches formatPrice number portion (consistency check)', () => {
    // formatPrice = formatNumber + ' ' + unit — so the leading numeric
    // part must be byte-identical between the two helpers. Otherwise
    // a mixed-helper screen renders two different number formats.
    const num = 75000;
    expect(formatPrice(num, "so'm").startsWith(formatNumber(num))).toBe(true);
  });
});
