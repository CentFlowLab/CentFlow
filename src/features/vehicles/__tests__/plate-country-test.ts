import { plateCountry } from '../presentation';

describe('plateCountry', () => {
  it.each(['50-XO-29', '50XO29', 'AA-00-AA', '00-00-AA', 'AA-00-00', '50-xo-29', ' 50 XO 29 '])(
    'recognises the Portuguese format %s',
    (plate) => {
      expect(plateCountry(plate)).toBe('PT');
    },
  );

  it.each(['1234 ABC', 'B-AB 123', '', 'ABCDEFGH', 'AA-AA-AA', '00-00-00', '5-XO-29'])(
    'does not guess a country for %s',
    (plate) => {
      expect(plateCountry(plate)).toBeNull();
    },
  );
});
