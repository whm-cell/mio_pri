import { randomUUID } from 'node:crypto';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-host-webserver';
import type {} from '@deepseek-ai/dsh-tools';
import z from '@deepseek-ai/schemastery';
import { createHandler } from './http.ts';
import { readAuthConfig } from './auth/config.ts';
import { createAuthentication } from './auth/service.ts';
import { createAuthHandler } from './auth/http.ts';

export const name = 'mio-foundation';
export const inject = ['webServer', 'tools'];

export interface Config {
  tokenEnv: string;
  allowedOrigins: string[];
}

export const Config = z.object({
  tokenEnv: z.string().default('MIO_API_TOKEN'),
  allowedOrigins: z.array(z.string()).default([]),
});

/** Mount foundation and configured account routes. No model-facing tool is authorized. */
export async function apply(ctx: Context, config: Config): Promise<void> {
  const handler = createHandler({
    token: process.env[config.tokenEnv] ?? '',
    allowedOrigins: config.allowedOrigins,
    instanceId: randomUUID(),
  });

  // Deny before awaiting optional dependencies, including when authentication startup fails.
  ctx.tools.guard(
    () => 'MIO_TOOL_DENIED: no business tool is authorized in the foundation profile',
  );
  const authConfig = readAuthConfig();
  if (authConfig) {
    const auth = await createAuthentication(authConfig);
    try {
      ctx.effect(() => () => auth.close());
    } catch (error) {
      // The fiber may have been disposed while the database was connecting.
      await auth.close();
      throw error;
    }
    const authHandler = createAuthHandler(authConfig, auth);
    ctx.effect(() =>
      ctx.webServer.register({
        kind: 'prefix',
        path: '/api/auth',
        handler: authHandler,
      }),
    );
    ctx.effect(() =>
      ctx.webServer.register({
        kind: 'exact',
        path: '/api/v1/me',
        handler: authHandler,
      }),
    );
  }

  // Registered on this fiber, so the guard and routes are removed together on disposal.
  for (const path of ['/healthz', '/readyz']) {
    ctx.effect(() => ctx.webServer.register({ kind: 'exact', path, handler }));
  }
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/api/v1', handler }));
}
