import { Prisma } from '@prisma/client';

export interface QuotationLineCalculationInput {
  rfqItemId: string;
  quantity: number | string | Prisma.Decimal;
  unitPrice: number | string | Prisma.Decimal;
  deliveryDays: number;
}

export interface QuotationCalculationResult {
  lines: Array<{
    rfqItemId: string;
    unitPrice: Prisma.Decimal;
    deliveryDays: number;
    lineTotal: Prisma.Decimal;
  }>;
  subtotal: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
  maxDeliveryDays: number;
}

/**
 * Computes quotation line totals, subtotal, tax amount, and grand total.
 * Uses Prisma.Decimal with ROUND_HALF_UP to 2 decimal places per BR-7.
 */
export function computeQuotationTotals(
  items: QuotationLineCalculationInput[],
  taxRateInput: number | string | Prisma.Decimal
): QuotationCalculationResult {
  const taxRate = new Prisma.Decimal(taxRateInput);
  let subtotal = new Prisma.Decimal(0);
  let maxDeliveryDays = 0;

  const lines = items.map((item) => {
    const qty = new Prisma.Decimal(item.quantity);
    const unitPrice = new Prisma.Decimal(item.unitPrice);
    const lineTotal = qty.mul(unitPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    subtotal = subtotal.add(lineTotal);

    if (item.deliveryDays > maxDeliveryDays) {
      maxDeliveryDays = item.deliveryDays;
    }

    return {
      rfqItemId: item.rfqItemId,
      unitPrice,
      deliveryDays: item.deliveryDays,
      lineTotal,
    };
  });

  const taxAmount = subtotal
    .mul(taxRate)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  const grandTotal = subtotal.add(taxAmount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  return {
    lines,
    subtotal,
    taxRate,
    taxAmount,
    grandTotal,
    maxDeliveryDays,
  };
}
