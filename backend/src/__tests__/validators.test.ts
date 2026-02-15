import { describe, expect, it } from 'vitest';
import { parseEmplacementCode, validateMultiple } from '../lib/validators.js';

describe('validators', () => {
  it('validate multiple commande', () => {
    expect(validateMultiple(20, 10)).toBe(true);
    expect(validateMultiple(21, 10)).toBe(false);
  });

  it('parse emplacement code', () => {
    expect(parseEmplacementCode('A-000-070')).toEqual({ allee: 'A', niveau: 0, travee: 70 });
    expect(() => parseEmplacementCode('K-000-001')).toThrow();
  });
});
