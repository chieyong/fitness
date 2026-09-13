import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accessFor } from '../src/lib/auth.js';

const session = { user: { email: 'iemand@example.com' } };

test('zonder Supabase-configuratie is alles demo', () => {
  assert.deepEqual(accessFor({ configured: false, session, owner: true }),
    { mode: 'demo', reason: 'niet-geconfigureerd', email: null });
});

test('niet ingelogd levert demo', () => {
  assert.equal(accessFor({ configured: true, session: null }).reason, 'niet-ingelogd');
});

test('ingelogd als eigenaar levert de echte gegevens', () => {
  assert.deepEqual(accessFor({ configured: true, session, owner: true }),
    { mode: 'owner', reason: null, email: 'iemand@example.com' });
});

test('ingelogd zonder toegang levert demo, met het account erbij', () => {
  const a = accessFor({ configured: true, session, owner: false });
  assert.equal(a.mode, 'demo');
  assert.equal(a.reason, 'geen-toegang');
  assert.equal(a.email, 'iemand@example.com');
});

test('mislukt de controle, dan nooit de echte gegevens', () => {
  const a = accessFor({ configured: true, session, owner: true, error: new Error('rpc stuk') });
  assert.equal(a.mode, 'demo');
  assert.equal(a.reason, 'controle-mislukt');
});

test('alleen een expliciete true telt als eigenaar', () => {
  for (const owner of [undefined, null, 'true', 1]) {
    assert.equal(accessFor({ configured: true, session, owner }).mode, 'demo', String(owner));
  }
});
