import type { Context } from '@deepseek-ai/cordis';
import type { AgentHandle } from '@deepseek-ai/dsh-agent';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import type { TurnEndReason } from '@deepseek-ai/dsh-session';
import type { ConversationConfig } from '../conversations/config.ts';
import type { ConversationEngine, HistoryItem } from '../conversations/contracts.ts';
import type {} from './kernel.ts';

/** Narrow bridge: DSH values stop here; only public text/status values leave it. */
export function createDshConversationEngine(
  ctx: Context,
  config: ConversationConfig,
): ConversationEngine {
  const active = new Map<
    string,
    { opening: Promise<AgentHandle>; cancelled: boolean; requestId: string }
  >();
  const tasks = new Set<Promise<unknown>>();
  let closing: Promise<void> | undefined;
  const options = {
    ...(config.provider ? { provider: config.provider } : {}),
    ...(config.model ? { model: config.model } : {}),
    maxTokens: 1024,
  };
  return {
    get available() {
      return (
        !closing &&
        Boolean(
          config.model && ctx.llm.listProviders().some((route) => route.id === config.provider),
        )
      );
    },
    async create(id) {
      if (closing) throw new Error('MIO_ENGINE_CLOSED');
      const handle = await ctx.mioKernel.create(id, options);
      try {
        await ctx.mioKernel.flush(handle.agent.session);
      } finally {
        await handle.dispose();
      }
    },
    async history(id, afterSeq, limit) {
      const { events } = await ctx.mioKernel.history(id);
      const items: HistoryItem[] = [];
      for (const event of events) {
        if (event.seq <= afterSeq) continue;
        if (event.type === 'user/message' && event.data.source.kind === 'user') {
          const text = event.data.content
            .flatMap((block) => (block.type === 'text' ? [block.text] : []))
            .join('');
          if (text) items.push({ seq: event.seq, role: 'user', text });
        }
        if (event.type === 'assistant/message') {
          const text = event.data.message.content
            .flatMap((block) => (block.type === 'text' ? [block.text] : []))
            .join('');
          if (text)
            items.push({
              seq: event.seq,
              role: 'assistant',
              text,
              ...(event.data.interrupted ? { interrupted: true } : {}),
            });
        }
        if (event.type === 'turn/end') {
          const reason = event.data.reason;
          const status =
            reason.kind === 'completed'
              ? 'completed'
              : reason.kind === 'interrupted'
                ? 'interrupted'
                : reason.kind === 'aborted'
                  ? reason.reason.kind === 'user'
                    ? 'cancelled'
                    : 'interrupted'
                  : 'failed';
          items.push({ seq: event.seq, role: 'status', status });
        }
        if (items.length > limit) break;
      }
      const page = items.slice(0, limit);
      return {
        items: page,
        nextAfterSeq: page.at(-1)?.seq ?? afterSeq,
        hasMore: items.length > limit,
      };
    },
    run(id, requestId, text, durable, emit) {
      if (closing || active.has(id)) return Promise.reject(new Error('MIO_ENGINE_BUSY'));
      let end: TurnEndReason | undefined;
      const entry = {
        opening: ctx.mioKernel.resume(id, options, (agentCtx, agent) => {
          if (config.provider && config.model)
            agent.model.select({ provider: config.provider, model: config.model });
          agentCtx.on('agent/assistant-stream', ({ frame }) => {
            if (frame.type === 'chunk' && frame.chunk.type === 'text-delta')
              emit({ type: 'text', requestId, text: frame.chunk.text });
          });
          agentCtx.on('session/event', (_session, event) => {
            if (event.type === 'turn/end') end = event.data.reason;
          });
        }),
        cancelled: false,
        requestId,
      };
      active.set(id, entry);
      const running = (async () => {
        const handle = await entry.opening;
        try {
          if (entry.cancelled) return 'cancelled' as const;
          handle.agent.followup(
            createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }),
          );
          await ctx.mioKernel.flush(handle.agent.session);
          await durable();
          await handle.agent.whenIdle();
          await ctx.mioKernel.flush(handle.agent.session);
          if (end?.kind === 'completed') return 'completed' as const;
          if (end?.kind === 'aborted' && end.reason.kind === 'user') return 'cancelled' as const;
          if (end?.kind === 'aborted' && end.reason.kind === 'disposed') return 'unknown' as const;
          return 'failed' as const;
        } finally {
          await handle.dispose();
        }
      })();
      tasks.add(running);
      const done = () => {
        active.delete(id);
        tasks.delete(running);
      };
      void running.then(done, done);
      return running;
    },
    async cancel(id, requestId) {
      const entry = active.get(id);
      if (!entry || entry.requestId !== requestId) return;
      entry.cancelled = true;
      const handle = await entry.opening;
      handle.agent.cancel({ kind: 'user' });
      await handle.agent.whenIdle();
    },
    close() {
      return (closing ??= (async () => {
        const cancellations = await Promise.allSettled(
          [...active.values()].map(async (entry) => {
            entry.cancelled = true;
            const handle = await entry.opening;
            handle.agent.cancel({ kind: 'disposed' });
          }),
        );
        const settled = await Promise.allSettled(tasks);
        const failures = [...cancellations, ...settled].filter(
          (result) => result.status === 'rejected',
        );
        if (failures.length)
          throw new AggregateError(
            failures.map((failure) => failure.reason),
            'DSH conversation cleanup failed',
          );
      })());
    },
  };
}
