import { describe, it, expect, vi } from 'vitest';
import { registerAlertNewsletter } from '../../supabase/functions/_shared/alert-newsletter';
const contact = { name: 'Pessoa Teste', email: 'teste@example.com', sourceUrl: 'https://vitalemobilidade.com.br/radar/teste', now: '2026-10-16T02:00:00Z' };
describe('alert newsletter consent', () => {
  it.each([false, undefined, null, 'true', 1])('does not subscribe without explicit boolean consent: %s', async consent => {
    const insert = vi.fn();
    expect(await registerAlertNewsletter(consent, contact, insert)).toBe('not_requested');
    expect(insert).not.toHaveBeenCalled();
  });
  it('records separate newsletter consent with Radar interest', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    expect(await registerAlertNewsletter(true, contact, insert)).toBe('registered');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({email: contact.email, consent_version: 'v2', interest: 'radar', consent_at: contact.now, delivery_enabled: false}), { onConflict: 'email', ignoreDuplicates: true });
  });
  it('preserves an existing suppressed subscription on duplicate email', async () => {
    const existing = { email: contact.email, status: 'unsubscribed', suppressed_at: contact.now, interest: 'content' };
    let row = { ...existing };
    const insert = vi.fn(async (incoming, options) => {
      if (!(options.ignoreDuplicates && incoming.email === row.email)) row = incoming;
      return { error: null };
    });
    await registerAlertNewsletter(true, contact, insert);
    await registerAlertNewsletter(true, contact, insert);
    expect(row).toEqual(existing);
    expect(insert).toHaveBeenCalledTimes(2);
  });
  it('reports database failure without throwing away alert success', async () => {
    expect(await registerAlertNewsletter(true, contact, async () => ({error: new Error('database')}))).toBe('failed');
    expect(await registerAlertNewsletter(true, contact, async () => {throw new Error('network');})).toBe('failed');
  });
});
