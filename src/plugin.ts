import { randomUUID } from 'node:crypto';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-host-webserver';
import type {} from '@deepseek-ai/dsh-tools';
import z from '@deepseek-ai/schemastery';
import { createHandler } from './http.ts';
import { AUTH_BASE_PATH, readAuthConfig, readAuthRateLimitBackend } from './auth/config.ts';
import { createAuthentication } from './auth/service.ts';
import { createAuthHandler } from './auth/http.ts';
import { createRedisRateLimit } from './auth/rate-limit.ts';
import { createRedisResource, readRedisConfig } from './integrations/redis.ts';
import { denyModelTools } from './dsh/policy.ts';
import { readConversationConfig } from './conversations/config.ts';
import { createConversationStore } from './conversations/store.ts';
import { createConversationService } from './conversations/service.ts';
import { createConversationHandler } from './conversations/http.ts';
import { createDshConversationEngine } from './dsh/conversations.ts';

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
  // Deny before awaiting optional dependencies, including when authentication startup fails.
  denyModelTools(ctx);
  const authConfig = readAuthConfig();
  const conversationConfig = readConversationConfig();
  const handler = createHandler({
    token: process.env[config.tokenEnv] ?? '',
    allowedOrigins: config.allowedOrigins,
    instanceId: randomUUID(),
    sessions: Boolean(conversationConfig),
  });

  if (conversationConfig && !authConfig)
    throw new Error('CONVERSATION_CONFIG: authentication required');
  const backend = readAuthRateLimitBackend();
  if (backend === 'redis' && !authConfig)
    throw new Error('AUTH_CONFIG: authentication is required for Redis rate limiting');
  if (authConfig) {
    const redisConfig = backend === 'redis' ? readRedisConfig() : undefined;
    const deadline = performance.now() + 5000;
    const redis = redisConfig ? await createRedisResource(redisConfig, deadline) : undefined;
    let auth;
    try {
      const rateLimit =
        redis && (await createRedisRateLimit(redis, redisConfig!.namespace, deadline));
      auth = await createAuthentication(authConfig, rateLimit);
      const acquired = auth;
      ctx.effect(() => async () => {
        await Promise.all([acquired.close(), redis?.close()]);
      });
    } catch (error) {
      // The fiber may have been disposed while either dependency was connecting.
      await Promise.all([auth?.close(), redis?.close()]);
      throw error;
    }
    const authHandler = createAuthHandler(authConfig, auth);
    ctx.effect(() =>
      ctx.webServer.register({
        kind: 'prefix',
        path: AUTH_BASE_PATH,
        handler: authHandler,
      }),
    );
    if (conversationConfig) {
      if (!ctx.get('mioKernel')) throw new Error('CONVERSATION_CONFIG: DSH kernel required');
      await ctx.plugin({
        name: 'mio-conversations',
        inject: ['mioKernel', 'llm', 'webServer'],
        async apply(conversationCtx: Context) {
          const store = await createConversationStore(conversationConfig.databaseURL);
          const conversations = createConversationService(
            store,
            createDshConversationEngine(conversationCtx, conversationConfig),
          );
          const http = createConversationHandler(conversations, auth.identity, authConfig.origins);
          try {
            conversationCtx.effect(() => async () => {
              http.close();
              await conversations.close();
            });
            conversationCtx.effect(() =>
              conversationCtx.webServer.register({
                kind: 'prefix',
                path: '/api/v1/conversations',
                handler: http.handler,
              }),
            );
          } catch (error) {
            http.close();
            await conversations.close();
            throw error;
          }
        },
      });
    }
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
