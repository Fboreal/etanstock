import { describe, expect, it } from 'vitest';
import { pickFromStocks } from '../services/stockService.js';

describe('picking', () => {
  const stocks = [
    { emplacementId: 1, quantite: 3, niveau: 1, travee: 2, code: 'A-001-002' },
    { emplacementId: 2, quantite: 10, niveau: 0, travee: 5, code: 'A-000-005' },
    { emplacementId: 3, quantite: 4, niveau: 0, travee: 2, code: 'A-000-002' },
  ];

  it('prefers exact on lower location', () => {
    expect(pickFromStocks(stocks, 4)).toEqual([{ emplacementId: 3, quantite: 4 }]);
  });

  it('splits when needed', () => {
    expect(pickFromStocks(stocks, 12)).toEqual([
      { emplacementId: 3, quantite: 4 },
      { emplacementId: 2, quantite: 8 },
    ]);
  });

  it('blocks if insufficient', () => {
    expect(() => pickFromStocks(stocks, 30)).toThrow('Stock insuffisant');
  });
});
