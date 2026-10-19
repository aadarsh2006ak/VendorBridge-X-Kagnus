import { describe, it, expect } from 'vitest';
import { computeQuotationTotals } from '../quotation.calculator.js';

describe('Quotation Calculator (BR-7 & Golden Test)', () => {
  it('should accurately compute totals matching the exact golden test specification', () => {
    // Golden test from specification:
    // Item 1: 25 quantity × 3,500 unit price = 87,500
    // Item 2: 10 quantity × 8,200 unit price = 82,000
    // Subtotal = 169,500
    // Tax Rate = 18% -> Tax Amount = 30,510
    // Grand Total = 200,010
    const items = [
      {
        rfqItemId: 'item-1',
        quantity: 25,
        unitPrice: 3500,
        deliveryDays: 14,
      },
      {
        rfqItemId: 'item-2',
        quantity: 10,
        unitPrice: 8200,
        deliveryDays: 7,
      },
    ];

    const result = computeQuotationTotals(items, 18);

    expect(result.lines[0].lineTotal.toString()).toBe('87500');
    expect(result.lines[1].lineTotal.toString()).toBe('82000');
    expect(result.subtotal.toString()).toBe('169500');
    expect(result.taxAmount.toString()).toBe('30510');
    expect(result.grandTotal.toString()).toBe('200010');
    expect(result.maxDeliveryDays).toBe(14);
  });

  it('should round half up to two decimal places on fractional paise values', () => {
    const items = [
      {
        rfqItemId: 'item-fractional',
        quantity: '3.33',
        unitPrice: '10.555',
        deliveryDays: 5,
      },
    ];

    const result = computeQuotationTotals(items, 12);
    // 3.33 * 10.555 = 35.14815 -> rounded to 35.15
    expect(result.lines[0].lineTotal.toString()).toBe('35.15');
    expect(result.subtotal.toString()).toBe('35.15');
    // 35.15 * 0.12 = 4.218 -> rounded to 4.22
    expect(result.taxAmount.toString()).toBe('4.22');
    // 35.15 + 4.22 = 39.37
    expect(result.grandTotal.toString()).toBe('39.37');
  });
});
