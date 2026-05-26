import { describe, expect, it, vi } from 'vitest';
import { canAccessElder } from './permissionGuard';

vi.mock('../../api/familyElderApi', () => ({
  getBoundElders: vi.fn(async () => [
    { id: 'elder-001' },
    { id: 'elder-002' },
  ]),
}));

describe('family permission guard', () => {
  it('allows only bound elders', async () => {
    await expect(canAccessElder('elder-001')).resolves.toBe(true);
    await expect(canAccessElder('elder-404')).resolves.toBe(false);
  });
});
