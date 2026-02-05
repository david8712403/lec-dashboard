import { Body, Controller, Post, Res, Options } from '@nestjs/common';
import { AiService } from './ai.service';
import type { FastifyReply } from 'fastify';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(
    @Body()
    payload: {
      message?: string;
      history?: { role: 'user' | 'model'; text: string }[];
    },
  ) {
    const message = payload?.message?.trim();
    if (!message) {
      return { reply: '請提供訊息內容。' };
    }
    try {
      return await this.aiService.chat(message, payload.history ?? []);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'AI 服務暫時無法使用。';
      return { reply: `AI 服務暫時無法使用：${detail}` };
    }
  }

  @Post('chat/stream')
  async chatStream(
    @Body()
    payload: {
      message?: string;
      history?: { role: 'user' | 'model'; text: string }[];
    },
    @Res() reply: FastifyReply,
  ) {
    const message = payload?.message?.trim();
    reply.hijack();
    const headers = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    reply.raw.writeHead(200, headers);
    reply.raw.flushHeaders?.();

    const send = (data: Record<string, unknown>) => {
      const eventType = typeof data.type === 'string' ? data.type : 'message';
      reply.raw.write(`event: ${eventType}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    if (!message) {
      send({ type: 'error', text: '請提供訊息內容。' });
      send({ type: 'done' });
      reply.raw.end();
      return;
    }

    try {
      await this.aiService.chatStream(message, payload.history ?? [], send);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'AI 服務暫時無法使用。';
      send({ type: 'error', text: detail });
    } finally {
      send({ type: 'done' });
      reply.raw.end();
    }
  }

  @Options('chat/stream')
  optionsStream(@Res() reply: FastifyReply) {
    reply
      .code(204)
      .header('Access-Control-Allow-Origin', '*')
      .header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      .header('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .send();
  }
}
