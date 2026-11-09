import { daysUntil, deadlineStatus } from '../deadlines';

describe('deadlines', () => {
  const today = '2026-11-09';
  it('has no status without a date', () => {
    expect(deadlineStatus(null, today)).toBe('none');
    expect(daysUntil(null, today)).toBeNull();
  });
  it('classifies overdue, soon and ok', () => {
    expect(deadlineStatus('2026-11-08', today)).toBe('overdue');
    expect(deadlineStatus('2026-11-09', today)).toBe('soon');
    expect(deadlineStatus('2026-12-09', today)).toBe('soon');
    expect(deadlineStatus('2026-12-10', today)).toBe('ok');
  });
  it('counts calendar days across a month and a leap day', () => {
    expect(daysUntil('2027-03-01', '2028-02-28')).toBe(-364);
    expect(daysUntil('2028-03-01', '2028-02-28')).toBe(2);
  });
});
