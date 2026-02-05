import { Body, Controller, Headers, Logger, Options, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ChatKitService } from './chatkit.service';

const STREAMING_OPS = new Set([
  'threads.create',
  'threads.create_from_shared',
  'threads.add_user_message',
  'threads.add_client_tool_output',
  'threads.retry_after_item',
  'threads.custom_action',
]);

@Controller('chatkit')
export class ChatKitController {
  private readonly logger = new Logger(ChatKitController.name);

  constructor(private readonly chatKit: ChatKitService) {}

  @Post()
  async handle(
    @Body() body: { type?: string; params?: Record<string, unknown> },
    @Headers('x-chatkit-session') sessionId: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    const type = body?.type ?? '';
    const params = (body?.params ?? {}) as Record<string, any>;
    this.logger.log(`ChatKit request: ${type}`);

    if (STREAMING_OPS.has(type)) {
      return this.handleStream(type, params, sessionId ?? null, reply);
    }

    try {
      const payload = await this.handleRequest(type, params, sessionId ?? null);
      return reply.send(payload ?? {});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ChatKit request failed.';
      return reply.code(500).send({ message });
    }
  }

  @Options()
  options(@Res() reply: FastifyReply) {
    reply
      .code(204)
      .header('Access-Control-Allow-Origin', '*')
      .header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, x-chatkit-session, chatkit-device-id, chatkit-frame-instance-id',
      )
      .header('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .send();
  }

  private async handleRequest(type: string, params: Record<string, any>, sessionId: string | null) {
    switch (type) {
      case 'threads.list':
        return this.chatKit.listThreads(sessionId, params);
      case 'threads.get_by_id':
        return this.chatKit.getThread(params.thread_id, sessionId);
      case 'items.list':
        return this.chatKit.listItems(params.thread_id, params, sessionId);
      case 'threads.update':
        return this.chatKit.updateThreadTitle(params.thread_id, params.title ?? null, sessionId);
      case 'threads.delete':
        await this.chatKit.deleteThread(params.thread_id, sessionId);
        return { deleted: true };
      case 'items.feedback':
        return { ok: true };
      case 'threads.stop':
        return { stopped: true };
      case 'threads.init':
        return { tools: [], blocked_features: [] };
      default:
        throw new Error(`Unsupported ChatKit operation: ${type}`);
    }
  }

  private async handleStream(
    type: string,
    params: Record<string, any>,
    sessionId: string | null,
    reply: FastifyReply,
  ) {
    reply.hijack();
    const headers = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, x-chatkit-session, chatkit-device-id, chatkit-frame-instance-id',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    reply.raw.writeHead(200, headers);
    reply.raw.flushHeaders?.();

    const send = (data: Record<string, unknown>) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      switch (type) {
        case 'threads.create': {
          const { thread, userItem, userText } = await this.chatKit.createThread(sessionId, params.input ?? {});
          send({ type: 'thread.created', thread: this.chatKit.buildThreadResponse(thread) });
          if (userItem) {
            send({ type: 'thread.item.added', item: userItem });
          }
          if (userText) {
            await this.chatKit.streamAssistantReply(thread.id, userText, send);
          }
          break;
        }
        case 'threads.create_from_shared': {
          const { thread, userItem, userText } = await this.chatKit.createThread(sessionId, params.input ?? {});
          send({ type: 'thread.created', thread: this.chatKit.buildThreadResponse(thread) });
          if (userItem) {
            send({ type: 'thread.item.added', item: userItem });
          }
          if (userText) {
            await this.chatKit.streamAssistantReply(thread.id, userText, send);
          }
          break;
        }
        case 'threads.add_user_message': {
          const { item, text } = await this.chatKit.addUserMessage(params.thread_id, params.input ?? {}, sessionId);
          send({ type: 'thread.item.added', item });
          if (text) {
            await this.chatKit.streamAssistantReply(params.thread_id, text, send);
          }
          break;
        }
        case 'threads.add_client_tool_output': {
          send({ type: 'notice', level: 'info', message: '已接收工具結果。' });
          break;
        }
        case 'threads.retry_after_item': {
          const retryText = await this.chatKit.findRetryMessage(params.thread_id, params.item_id);
          if (!retryText) {
            send({ type: 'notice', level: 'warning', message: '找不到可重試的訊息。' });
            break;
          }
          await this.chatKit.streamAssistantReply(params.thread_id, retryText, send);
          break;
        }
        case 'threads.custom_action': {
          send({ type: 'notice', level: 'info', message: '已接收自訂操作。' });
          break;
        }
        default:
          throw new Error(`Unsupported ChatKit stream op: ${type}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ChatKit stream failed.';
      send({ type: 'error', code: 'stream.error', message, allow_retry: true });
    } finally {
      reply.raw.end();
    }
  }
}
