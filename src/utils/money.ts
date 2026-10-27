/**
 * RWA stores every monetary value as integer cents. Keeping conversions in one
 * place avoids floating point drift in assertions.
 */
export type Cents = number & { readonly __brand: 'Cents' };

export const cents = (value: number): Cents => {
  if (!Number.isInteger(value)) {
    throw new Error(`Cents must be an integer, received ${value}`);
  }
  return value as Cents;
};

export const dollarsToCents = (dollars: number): Cents => cents(Math.round(dollars * 100));

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Formats cents exactly the way RWA renders them, e.g. 150000 -> "$1,500.00". */
export const formatCents = (value: Cents): string => usd.format(value / 100);
