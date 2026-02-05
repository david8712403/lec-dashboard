import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { randomBytes } from 'crypto';

type Page<T> = {
  data: T[];
  has_more: boolean;
  after: string | null;
};

type ChatKitThreadStatus = { type: 'active' | 'closed' | 'locked'; reason?: string | null };

@Injectable()
export class ChatKitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  createThreadId() {
    return `thr_${randomBytes(4).toString('hex')}`;
  }

  createItemId(prefix: 'msg' | 'tc' | 'eot' = 'msg') {
    return `${prefix}_${randomBytes(4).toString('hex')}`;
  }

  async listThreads(sessionId: string | null, params: { limit?: number; order?: 'asc' | 'desc'; after?: string }) {
    const limit = params.limit ?? 20;
    const order = params.order ?? 'desc';
    const afterThread = params.after
      ? await this.prisma.chatThread.findUnique({ where: { id: params.after } })
      : null;

    const threads = await this.prisma.chatThread.findMany({
      where: sessionId ? { session_id: sessionId } : undefined,
      orderBy: { created_at: order },
      take: limit + 1,
      ...(afterThread
        ? {
            where: {
              ...(sessionId ? { session_id: sessionId } : {}),
              created_at: order === 'desc' ? { lt: afterThread.created_at } : { gt: afterThread.created_at },
            },
          }
        : {}),
    });

    const hasMore = threads.length > limit;
    const sliced = hasMore ? threads.slice(0, limit) : threads;
    const after = hasMore ? sliced[sliced.length - 1]?.id ?? null : null;

    return this.toPage(
      sliced.map((thread) => this.buildThreadResponse(thread)),
      hasMore,
      after,
    );
  }

  async getThread(threadId: string, sessionId: string | null) {
    const thread = await this.getThreadById(threadId, sessionId);
    const items = await this.listItems(threadId, { order: 'asc', limit: 100 }, sessionId);
    return this.buildThreadResponse(thread, items);
  }

  async createThread(sessionId: string | null, input: any) {
    const threadId = this.createThreadId();
    const thread = await this.prisma.chatThread.create({
      data: {
        id: threadId,
        session_id: sessionId ?? null,
        title: null,
        status: 'active',
      },
    });

    const userItem = await this.addUserMessage(threadId, input, sessionId);
    if (!thread.title && userItem?.text) {
      await this.prisma.chatThread.update({
        where: { id: threadId },
        data: { title: this.trimTitle(userItem.text) },
      });
    }

    return { thread, userItem: userItem?.item ?? null, userText: userItem?.text ?? '' };
  }

  async addUserMessage(threadId: string, input: any, sessionId: string | null) {
    await this.getThreadById(threadId, sessionId);
    const text = this.extractInputText(input);
    const createdAt = new Date();
    const item = {
      id: this.createItemId('msg'),
      thread_id: threadId,
      created_at: createdAt.toISOString(),
      type: 'user_message',
      content: [
        {
          type: 'input_text',
          text,
        },
      ],
      attachments: input?.attachments ?? [],
      quoted_text: input?.quoted_text ?? null,
      inference_options: input?.inference_options ?? {},
    };

    await this.prisma.chatItem.create({
      data: {
        id: item.id,
        thread_id: threadId,
        type: item.type,
        created_at: createdAt,
        data: item,
      },
    });

    return { item, text };
  }

  async listItems(
    threadId: string,
    params: { limit?: number; order?: 'asc' | 'desc'; after?: string },
    sessionId?: string | null,
  ) {
    if (sessionId) {
      await this.getThreadById(threadId, sessionId);
    }
    const limit = params.limit ?? 50;
    const order = params.order ?? 'desc';
    const afterItem = params.after
      ? await this.prisma.chatItem.findUnique({ where: { id: params.after } })
      : null;

    const items = await this.prisma.chatItem.findMany({
      where: { thread_id: threadId },
      orderBy: { created_at: order },
      take: limit + 1,
      ...(afterItem
        ? {
            where: {
              thread_id: threadId,
              created_at: order === 'desc' ? { lt: afterItem.created_at } : { gt: afterItem.created_at },
            },
          }
        : {}),
    });

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const after = hasMore ? sliced[sliced.length - 1]?.id ?? null : null;

    return this.toPage(
      sliced.map((item) => item.data),
      hasMore,
      after,
    );
  }

  async updateThreadTitle(threadId: string, title: string | null, sessionId?: string | null) {
    if (sessionId) {
      await this.getThreadById(threadId, sessionId);
    }
    const thread = await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { title },
    });
    return this.buildThreadResponse(thread);
  }

  async deleteThread(threadId: string, sessionId?: string | null) {
    if (sessionId) {
      await this.getThreadById(threadId, sessionId);
    }
    await this.prisma.chatItem.deleteMany({ where: { thread_id: threadId } });
    await this.prisma.chatThread.delete({ where: { id: threadId } });
  }

  async saveItem(threadId: string, item: any, createdAt?: Date) {
    await this.prisma.chatItem.create({
      data: {
        id: item.id,
        thread_id: threadId,
        type: item.type,
        created_at: createdAt ?? new Date(item.created_at ?? Date.now()),
        data: item,
      },
    });
  }

  async updateItem(itemId: string, item: any) {
    await this.prisma.chatItem.update({
      where: { id: itemId },
      data: {
        data: item,
      },
    });
  }

  async findRetryMessage(threadId: string, itemId: string) {
    const anchor = await this.prisma.chatItem.findUnique({ where: { id: itemId } });
    if (!anchor) return null;
    const items = await this.prisma.chatItem.findMany({
      where: { thread_id: threadId, created_at: { lte: anchor.created_at } },
      orderBy: { created_at: 'desc' },
    });
    const userMessage = items.find((item) => item.type === 'user_message');
    if (!userMessage) return null;
    const data = userMessage.data as any;
    const content = Array.isArray(data?.content) ? data.content : [];
    return content.map((part: any) => part.text ?? '').join('') || null;
  }

  async streamAssistantReply(
    threadId: string,
    messageText: string,
    sendEvent: (event: Record<string, unknown>) => Promise<void> | void,
  ) {
    const historyItems = await this.prisma.chatItem.findMany({
      where: { thread_id: threadId },
      orderBy: { created_at: 'asc' },
    });

    const history = historyItems
      .map((item) => item.data as any)
      .filter((item) => item.type === 'user_message' || item.type === 'assistant_message')
      .map((item) => ({
        role: (item.type === 'user_message' ? 'user' : 'model') as 'user' | 'model',
        text: (item.content ?? [])
          .map((part: any) => part.text ?? '')
          .join(''),
      }))
      .slice(-8);

    let pendingTool: { id: string; item: any } | null = null;

    await this.aiService.chatStream(messageText, history, async (event) => {
      if (event.type === 'status' && event.text) {
        await sendEvent({ type: 'progress_update', text: event.text });
        return;
      }

      if (event.type === 'tool_call') {
        const createdAt = new Date();
        const toolName = typeof event.tool === 'string' ? event.tool : 'course-management';
        const actionName = typeof event.action === 'string' ? event.action : 'tool';
        const argsValue = (event.args ?? {}) as Record<string, unknown>;
        const toolItem = this.buildToolWidgetItem({
          threadId,
          createdAt,
          tool: toolName,
          action: actionName,
          args: argsValue,
          status: 'pending',
        });
        pendingTool = { id: toolItem.id, item: toolItem };
        await this.saveItem(threadId, toolItem, createdAt);
        await sendEvent({ type: 'thread.item.added', item: toolItem });
        return;
      }

      if (event.type === 'tool_result') {
        if (!pendingTool) return;
        const updated = this.buildToolWidgetItem({
          threadId,
          createdAt: pendingTool.item.created_at ? new Date(pendingTool.item.created_at) : new Date(),
          tool: pendingTool.item.tool ?? 'course-management',
          action: pendingTool.item.action ?? 'tool',
          args: pendingTool.item.args ?? {},
          status: 'completed',
          result: event.result ?? null,
          id: pendingTool.item.id,
        });
        await this.updateItem(pendingTool.id, updated);
        await sendEvent({ type: 'thread.item.replaced', item: updated });
        pendingTool = null;
        return;
      }

      if (event.type === 'message' && event.text) {
        const createdAt = new Date();
        const assistantItem = {
          id: this.createItemId('msg'),
          thread_id: threadId,
          created_at: createdAt.toISOString(),
          type: 'assistant_message',
          content: [
            {
              type: 'output_text',
              text: String(event.text),
              annotations: [],
            },
          ],
        };
        await this.saveItem(threadId, assistantItem, createdAt);
        await sendEvent({ type: 'thread.item.added', item: assistantItem });
        await sendEvent({ type: 'thread.item.done', item: assistantItem });
      }
    });
  }

  private toPage<T>(data: T[], has_more = false, after: string | null = null): Page<T> {
    return { data, has_more, after };
  }

  buildThreadResponse(
    thread: { id: string; title: string | null; created_at: Date; status: string },
    items?: Page<any>,
  ) {
    const status: ChatKitThreadStatus = { type: thread.status as ChatKitThreadStatus['type'] };
    return {
      id: thread.id,
      title: thread.title,
      created_at: thread.created_at.toISOString(),
      status,
      items: items ?? this.toPage([]),
    };
  }

  private trimTitle(text: string) {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (trimmed.length <= 24) return trimmed;
    return `${trimmed.slice(0, 24)}…`;
  }

  private extractInputText(input: any) {
    const content = Array.isArray(input?.content) ? input.content : [];
    const text = content
      .filter((part: any) => part.type === 'input_text')
      .map((part: any) => part.text)
      .join('\n');
    return text || '';
  }

  private async getThreadById(threadId: string, sessionId: string | null) {
    const thread = await this.prisma.chatThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new Error('Thread not found');
    }
    if (sessionId && thread.session_id && thread.session_id !== sessionId) {
      throw new Error('Thread not found');
    }
    return thread;
  }

  private buildToolWidgetItem(params: {
    threadId: string;
    createdAt: Date;
    tool: string;
    action: string;
    args: Record<string, unknown>;
    status: 'pending' | 'completed';
    result?: unknown;
    id?: string;
  }) {
    const argsText = this.prettyJson(params.args) || '{}';
    const resultText = params.status === 'completed' ? this.prettyJson(params.result) : null;
    const argsBlock = ['```json', argsText, '```'].join('\n');
    const resultBlock = resultText ? ['```json', resultText, '```'].join('\n') : null;
    const statusText = params.status === 'pending' ? '執行中' : '完成';
    const statusIcon = params.status === 'pending' ? 'bolt' : 'check-circle';

    return {
      id: params.id ?? this.createItemId('tc'),
      thread_id: params.threadId,
      created_at: params.createdAt.toISOString(),
      type: 'widget',
      tool: params.tool,
      action: params.action,
      args: params.args,
      widget: {
        type: 'Card',
        size: 'md',
        status: { text: statusText, icon: statusIcon },
        children: [
          { type: 'Title', value: '工具呼叫' },
          { type: 'Text', value: `${params.tool}.${params.action}` },
          { type: 'Caption', value: '參數' },
          { type: 'Markdown', value: argsBlock },
          ...(resultBlock
            ? [
                { type: 'Caption', value: '結果' },
                { type: 'Markdown', value: resultBlock },
              ]
            : []),
        ],
      },
    };
  }

  private prettyJson(value: unknown) {
    if (value == null) return '';
    try {
      const json = JSON.stringify(value, null, 2) ?? '';
      if (json.length > 2000) {
        return `${json.slice(0, 2000)}...`;
      }
      return json;
    } catch {
      return String(value);
    }
  }
}
