/**
 * Locale-aware currency formatter for prices.
 *
 * Why: many screens hardcoded "X so'm" or "X UZS" inline (FE-H12), so
 * a Russian/English user saw Uzbek currency labels regardless of their
 * selected language. Use this helper everywhere a price is rendered:
 *
 *   import { formatPrice } from '../lib/utils/formatPrice';
 *   import { useT } from '../lib/i18n/LocaleProvider';
 *
 *   const t = useT();
 *   <Text>{formatPrice(20000, t.common.currencyUnit)}</Text>
 *   // uz -> "20 000 so'm"
 *   // ru -> "20 000 сум"
 *   // en -> "20 000 UZS"
 *
 * Numeric formatting uses ru-RU locale, which inserts a non-breaking
 * space (U+00A0) — and on some engines a narrow NBSP (U+202F) — between
 * thousands. We normalise both to a regular ASCII space so the result
 * round-trips through clipboard / search / test assertions cleanly.
 * The earlier `.replace(/,/g, ' ')` was a no-op on every modern JS
 * runtime because ru-RU never produced commas in the first place.
 */
const SPACE_NORMALIZE = /[  ,]/g;

export function formatPrice(amount: number, unit: string): string {
  return `${formatNumber(amount)} ${unit}`;
}

/** Convenience: numeric format only (no currency unit). */
export function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU').replace(SPACE_NORMALIZE, ' ');
}
