import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { Context } from '@deepseek-ai/cordis';
import WebServer from '@deepseek-ai/dsh-host-webserver';
import Tools from '@deepseek-ai/dsh-tools';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import * as Mio from '../src/plugin.ts';
import * as AuthenticationService from '../src/auth/service.ts';
import { readAuthConfig } from '../src/auth/config.ts';
import { authDatabase } from './auth-database.ts';

let database: Awaited<ReturnType<typeof authDatabase>>;
let pool: Pool;
let ctx: Context;
let origin: string;
let plugin: ReturnType<Context['plugin']>;
const secret = randomBytes(40).toString('hex');
const password = 'correct-horse-mio-test-39';
const email = 'owner@example.test';
const envKeys = [
  'MIO_AUTH_DATABASE_URL',
  'MIO_AUTH_BASE_URL',
  'MIO_AUTH_SECRET',
  'MIO_AUTH_ALLOWED_ORIGINS',
  'MIO_AUTH_TEST_TOKEN',
] as const;
const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function call(path: string, body?: unknown, cookie?: string, extra: Record<string, string> = {}) {
  return fetch(`${origin}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      origin,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(cookie ? { cookie } : {}),
      ...extra,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const cookies = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
async function session() {
  const response = await call('/api/auth/sign-in/email', { email, password });
  expect(response.status, await response.clone().text()).toBe(200);
  return cookies(response);
}
async function resetLimits() {
  await pool.query('DELETE FROM "rateLimit"');
}

beforeAll(async () => {
  database = await authDatabase();
  pool = new Pool({ connectionString: database.url });
  ctx = new Context();
  await ctx.plugin(SystemPrompt);
  await ctx.plugin(Tools);
  await ctx.plugin(WebServer, { host: '127.0.0.1', port: 0 });
  origin = ctx.webServer.getOrigin();
  Object.assign(process.env, {
    MIO_AUTH_DATABASE_URL: database.url,
    MIO_AUTH_BASE_URL: origin,
    MIO_AUTH_SECRET: secret,
    MIO_AUTH_ALLOWED_ORIGINS: '["http://localhost:5173"]',
    MIO_AUTH_TEST_TOKEN: secret,
  });
  const migration = spawnSync(process.execPath, ['scripts/service/migrate-auth.ts', '--apply'], {
    encoding: 'utf8',
    timeout: 30000,
  });
  expect(migration.status, migration.stderr).toBe(0);
  const again = spawnSync(process.execPath, ['scripts/service/migrate-auth.ts'], {
    encoding: 'utf8',
    timeout: 30000,
  });
  expect(again.status, again.stderr).toBe(0);
  expect(again.stdout).toContain('schema is current');
  plugin = ctx.plugin(Mio, { tokenEnv: 'MIO_AUTH_TEST_TOKEN', allowedOrigins: [] });
  await plugin;
}, 45000);

afterAll(async () => {
  try {
    if (ctx) await ctx.fiber.dispose();
  } finally {
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    if (pool) await pool.end();
    if (database) await database.close();
  }
}, 30000);

it('registers and logs in through DSH; persists credentials and isolates service tokens from user identity', async () => {
  expect((await call('/api/v1/me')).status).toBe(401);
  expect(
    (await call('/api/v1/me', undefined, undefined, { Authorization: `Bearer ${secret}` })).status,
  ).toBe(401);
  const weak = await call('/api/auth/sign-up/email', { name: 'Owner', email, password: 'short' });
  expect(weak.status).toBe(400);
  const registered = await call('/api/auth/sign-up/email', {
    name: 'Owner',
    email,
    password,
    ownerUserId: 'attacker',
    emailVerified: true,
  });
  expect(registered.status, await registered.clone().text()).toBe(200);
  expect(registered.headers.get('set-cookie')).toContain('HttpOnly');
  expect(registered.headers.get('set-cookie')).toContain('SameSite=Lax');
  expect(registered.headers.get('cache-control')).toBe('no-store');
  const data = await registered.json();
  expect(data.user.emailVerified).toBe(false);
  expect(data.user.id).not.toBe('attacker');
  const cookie = cookies(registered);
  expect(await (await call('/api/v1/me', undefined, cookie)).json()).toMatchObject({
    userId: data.user.id,
  });
  expect((await call('/api/v1/capabilities', undefined, cookie)).status).toBe(403); // Foundation's origin boundary remains separate.
  const duplicate = await call('/api/auth/sign-up/email', {
    name: 'Other',
    email: email.toUpperCase(),
    password,
  });
  expect(duplicate.ok).toBe(false);
  const stored = await pool.query('SELECT password FROM account');
  expect(stored.rows[0].password).not.toBe(password);
  expect(stored.rows[0].password.length).toBeGreaterThan(32);
  expect(
    (await call('/api/auth/sign-in/email', { email, password: 'wrong-password-123' })).status,
  ).toBe(401);
  const other = await session();
  await plugin.dispose();
  expect((await call('/api/v1/me', undefined, cookie)).status).toBe(404);
  plugin = ctx.plugin(Mio, { tokenEnv: 'MIO_AUTH_TEST_TOKEN', allowedOrigins: [] });
  await plugin;
  expect((await call('/api/v1/me', undefined, cookie)).status).toBe(200);
  expect((await call('/api/auth/sign-out', {}, cookie)).status).toBe(200);
  expect((await call('/api/v1/me', undefined, cookie)).status).toBe(401);
  expect((await call('/api/v1/me', undefined, other)).status).toBe(200);
  await pool.query('UPDATE session SET "expiresAt" = NOW() - INTERVAL \'1 minute\'');
  expect((await call('/api/v1/me', undefined, other)).status).toBe(401);
});

it('leaves session refresh to the HTTP endpoint that can actually renew the browser cookie', async () => {
  await resetLimits();
  const cookie = await session();
  const identity = await (await call('/api/v1/me', undefined, cookie)).json();
  const before = await pool.query(
    'UPDATE session SET "expiresAt"=NOW()+INTERVAL \'5 days\', "updatedAt"=NOW()-INTERVAL \'2 days\' WHERE id=$1 RETURNING "expiresAt"',
    [identity.sessionId],
  );
  expect((await call('/api/v1/me', undefined, cookie)).status).toBe(200);
  const afterIdentity = await pool.query('SELECT "expiresAt" FROM session WHERE id=$1', [
    identity.sessionId,
  ]);
  expect(afterIdentity.rows[0].expiresAt).toEqual(before.rows[0].expiresAt);
  const refreshed = await call('/api/auth/get-session', undefined, cookie);
  expect(refreshed.status).toBe(200);
  expect(refreshed.headers.get('set-cookie')).toContain('mio.session_token=');
  const afterRefresh = await pool.query('SELECT "expiresAt" FROM session WHERE id=$1', [
    identity.sessionId,
  ]);
  expect(afterRefresh.rows[0].expiresAt.getTime()).toBeGreaterThan(
    before.rows[0].expiresAt.getTime(),
  );
  expect((await call('/api/v1/me', undefined, cookies(refreshed))).status).toBe(200);
});

it('updates passwords and revokes other sessions without trusting a forged cookie or userId', async () => {
  await resetLimits();
  const a = await session();
  const b = await session();
  expect(
    (
      await call(
        '/api/auth/change-password',
        { currentPassword: 'wrong', newPassword: 'a-new-password-789' },
        a,
      )
    ).ok,
  ).toBe(false);
  const changed = await call(
    '/api/auth/change-password',
    { currentPassword: password, newPassword: 'a-new-password-789', revokeOtherSessions: true },
    a,
  );
  expect(changed.status, await changed.clone().text()).toBe(200);
  expect((await call('/api/v1/me', undefined, b)).status).toBe(401);
  expect((await call('/api/auth/sign-in/email', { email, password })).status).toBe(401);
  const login = await call('/api/auth/sign-in/email', { email, password: 'a-new-password-789' });
  expect(login.status).toBe(200);
  const valid = cookies(login);
  expect((await call('/api/v1/me', undefined, valid.replace('=', '=forged'))).status).toBe(401);
  const list = await call('/api/auth/list-sessions', undefined, valid);
  expect(list.status).toBe(200);
  expect((await list.json()).length).toBeGreaterThan(0);
  expect((await call('/api/auth/revoke-sessions', {}, valid)).status).toBe(200);
  expect((await call('/api/v1/me', undefined, valid)).status).toBe(401);
});

it('rejects foreign/missing origins, unsupported routes/methods and oversized chunked JSON; rate limits cannot trust forwarded IPs', async () => {
  await resetLimits();
  const input = { email, password: 'incorrect-password-999' };
  expect(
    (await call('/api/auth/sign-in/email', input, undefined, { origin: 'https://evil.example' }))
      .status,
  ).toBe(403);
  expect(
    (
      await fetch(`${origin}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).status,
  ).toBe(403);
  expect((await call('/api/auth/sign-in/email')).status).toBe(405);
  expect((await call('/api/auth/request-password-reset', {})).status).toBe(404);
  const preflight = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: 'OPTIONS',
    headers: { origin: 'http://localhost:5173' },
  });
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get('access-control-allow-credentials')).toBe('true');
  const large = await new Promise<number>((resolve) => {
    const req = request(
      `${origin}/api/auth/sign-in/email`,
      { method: 'POST', headers: { origin, 'content-type': 'application/json' } },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode!));
      },
    );
    req.write('x'.repeat(17000));
    req.end();
  });
  expect(large).toBe(413);
  await new Promise<void>((resolve) => {
    const req = request(`${origin}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
    });
    req.on('error', () => resolve());
    req.write('{');
    setTimeout(() => req.destroy(), 20);
  });
  expect((await call('/api/v1/me')).status).toBe(401);
  for (let index = 0; index < 10; index++)
    expect(
      (
        await call('/api/auth/sign-in/email', input, undefined, {
          'x-forwarded-for': `192.0.2.${index}`,
          'x-mio-client-ip': `192.0.2.${index}`,
        })
      ).status,
    ).toBe(401);
  const throttled = await call('/api/auth/sign-in/email', input);
  expect(throttled.status).toBe(429);
  expect(
    await pool.query('SELECT count(*)::int AS count FROM "user"').then((r) => r.rows[0].count),
  ).toBe(1);
});

it('fails closed for partial configuration and unsafe public origins', () => {
  expect(readAuthConfig({})).toBeUndefined();
  expect(() => readAuthConfig({ MIO_AUTH_BASE_URL: origin })).toThrow('AUTH_CONFIG');
  expect(() =>
    readAuthConfig({
      MIO_AUTH_BASE_URL: 'http://public.example',
      MIO_AUTH_DATABASE_URL: database.url,
      MIO_AUTH_SECRET: secret,
    }),
  ).toThrow('HTTPS');
});

it('preserves another account session on revocation and issues Secure cookies for HTTPS deployment', async () => {
  await resetLimits();
  const login = await call('/api/auth/sign-in/email', { email, password: 'a-new-password-789' });
  expect(login.status).toBe(200);
  const ownerCookie = cookies(login);
  const ownerSessions = await (
    await call('/api/auth/list-sessions', undefined, ownerCookie)
  ).json();
  await plugin.dispose();
  process.env.MIO_AUTH_BASE_URL = 'https://mio.example';
  process.env.MIO_AUTH_ALLOWED_ORIGINS = JSON.stringify([origin]);
  plugin = ctx.plugin(Mio, { tokenEnv: 'MIO_AUTH_TEST_TOKEN', allowedOrigins: [] });
  await plugin;
  const other = await call('/api/auth/sign-up/email', {
    name: 'Other',
    email: 'other@example.test',
    password,
  });
  expect(other.status, await other.clone().text()).toBe(200);
  expect(other.headers.get('set-cookie')).toContain('Secure');
  const otherCookie = cookies(other);
  const denial = await call(
    '/api/auth/revoke-session',
    { token: ownerSessions[0].token },
    otherCookie,
  );
  // The library deliberately conceals whether a foreign token exists; assert the protected effect.
  expect(denial.status).toBe(200);
  expect(await denial.json()).toEqual({ status: true });
  const current = await (await call('/api/v1/me', undefined, otherCookie)).json();
  expect(current.userId).toBe((await other.json()).user.id);
  expect(
    await pool
      .query('SELECT id FROM session WHERE token=$1', [ownerSessions[0].token])
      .then((result) => result.rows.length),
  ).toBe(1);
});

it('loads the packed authentication plugin through an official isolated Profile', () => {
  const build = spawnSync(
    process.execPath,
    ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'],
    { encoding: 'utf8', timeout: 30000 },
  );
  expect(build.status, build.stderr).toBe(0);
  const smoke = spawnSync(process.execPath, ['scripts/service/smoke.ts'], {
    env: { ...process.env, MIO_SMOKE_AUTH_DATABASE_URL: database.url },
    encoding: 'utf8',
    timeout: 30000,
  });
  expect(smoke.status, smoke.stdout + smoke.stderr).toBe(0);
  expect(smoke.stdout).toContain('authentication registration, identity and logout');
}, 45000);

it('rolls back failed credential creation and cannot create duplicate accounts concurrently', async () => {
  await resetLimits();
  await pool.query(
    'ALTER TABLE account ADD CONSTRAINT fixture_reject_account CHECK (false) NOT VALID',
  );
  try {
    const failure = await call('/api/auth/sign-up/email', {
      name: 'Rollback',
      email: 'rollback@example.test',
      password,
    });
    expect(failure.ok).toBe(false);
    expect(
      await pool
        .query('SELECT id FROM "user" WHERE email=$1', ['rollback@example.test'])
        .then((r) => r.rows),
    ).toEqual([]);
  } finally {
    await pool.query('ALTER TABLE account DROP CONSTRAINT fixture_reject_account');
  }
  const responses = await Promise.all(
    [0, 1].map(() =>
      call('/api/auth/sign-up/email', { name: 'Concurrent', email: 'race@example.test', password }),
    ),
  );
  expect(responses.filter((response) => response.ok)).toHaveLength(1);
  expect(
    await pool
      .query('SELECT id FROM "user" WHERE email=$1', ['race@example.test'])
      .then((r) => r.rows),
  ).toHaveLength(1);
  expect(
    await pool
      .query(
        'SELECT account.id FROM account JOIN "user" ON account."userId"="user".id WHERE "user".email=$1',
        ['race@example.test'],
      )
      .then((r) => r.rows),
  ).toHaveLength(1);
});

it('closes an acquired authentication pool when the plugin is unloaded before startup completes', async () => {
  await plugin.dispose();
  const entered = Promise.withResolvers<void>();
  const resume = Promise.withResolvers<void>();
  const create = AuthenticationService.createAuthentication;
  const factory = vi
    .spyOn(AuthenticationService, 'createAuthentication')
    .mockImplementation(async (config) => {
      const auth = await create(config);
      entered.resolve();
      await resume.promise;
      return auth;
    });
  try {
    plugin = ctx.plugin(Mio, { tokenEnv: 'MIO_AUTH_TEST_TOKEN', allowedOrigins: [] });
    await entered.promise;
    const disposing = plugin.dispose();
    resume.resolve();
    await disposing;
    expect((await fetch(`${origin}/readyz`)).status).toBe(404);
    expect((await call('/api/v1/me')).status).toBe(404);
    const count = await pool.query(
      'SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name=$1',
      ['mio-auth'],
    );
    expect(count.rows[0].n).toBe(0);
  } finally {
    resume.resolve();
    factory.mockRestore();
  }
});

it('keeps auth startup failure non-ready and releases its database connections', async () => {
  await plugin.dispose();
  await pool.query('ALTER TABLE verification ADD COLUMN fixture_required text NOT NULL');
  try {
    for (const args of [[], ['--apply']]) {
      const migration = spawnSync(process.execPath, ['scripts/service/migrate-auth.ts', ...args], {
        encoding: 'utf8',
        timeout: 30000,
      });
      expect(migration.status).toBe(1);
      expect(migration.stderr).toContain('AUTH_SCHEMA: manual schema repair required');
      expect(migration.stdout).not.toMatch(/schema is current|migration completed/);
    }
  } finally {
    await pool.query('ALTER TABLE verification DROP COLUMN fixture_required');
  }
  await pool.query('DROP TABLE session');
  const broken = ctx.plugin(Mio, { tokenEnv: 'MIO_AUTH_TEST_TOKEN', allowedOrigins: [] });
  await expect(broken.await()).rejects.toThrow('AUTH_SCHEMA');
  expect((await fetch(`${origin}/readyz`)).status).toBe(404);
  expect((await call('/api/v1/me')).status).toBe(404);
  await broken.dispose();
  const count = await pool.query(
    'SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name=$1',
    ['mio-auth'],
  );
  expect(count.rows[0].n).toBe(0);
});
