import { screenName } from '../analytics';

describe('screenName', () => {
  it('drops record ids, numbers and query strings', () => {
    expect(screenName('/entry/0b1e7f9c-1d2a-4c3b-9e8f-7a6b5c4d3e2f?on=2026-11-09')).toBe(
      '/entry/[id]',
    );
    expect(screenName('/budget/12')).toBe('/budget/[n]');
    expect(screenName('/transactions#top')).toBe('/transactions');
    expect(screenName('/')).toBe('/');
  });
});
