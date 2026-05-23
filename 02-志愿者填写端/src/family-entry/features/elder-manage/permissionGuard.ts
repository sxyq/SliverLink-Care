import { getBoundElders } from '../../api/familyElderApi';

export async function canAccessElder(elderId: string): Promise<boolean> {
  const elders = await getBoundElders();
  return elders.some((elder) => elder.id === elderId);
}
