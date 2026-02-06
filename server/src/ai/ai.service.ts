import { Injectable, Logger } from '@nestjs/common';
import { GeminiCliService } from './gemini-cli.service';
import { SkillRunnerService } from './skill-runner.service';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly gemini: GeminiCliService,
    private readonly skillRunner: SkillRunnerService,
  ) {}

  async chat(message: string, history: ChatMessage[]) {
    this.logger.log(`Chat request received: ${message}`);
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    const emit = (event: { type: string; [key: string]: unknown }) => {
      events.push(event);
    };
    await this.chatStream(message, history, emit);
    const lastMessage = [...events].reverse().find((event) => event.type === 'message');
    if (lastMessage?.text) {
      this.logger.log(`Chat response: ${lastMessage.text}`);
    }
    return {
      reply: (lastMessage?.text as string | undefined) ?? '已完成。',
      trace: events.filter((event) => event.type !== 'message' && event.type !== 'status'),
    };
  }

  async chatStream(
    message: string,
    history: ChatMessage[],
    emit: (event: { type: string; [key: string]: unknown }) => void | Promise<void>,
  ) {
    this.logger.log(`Stream chat request received: ${message}`);
    const startedAt = Date.now();
    await Promise.resolve(emit({ type: 'status', text: '正在思考中...' }));

    const state = {
      toolHistory: [] as Array<{ action: string; result: unknown }>,
    };

    const maxSteps = 3;
    let hasFinal = false;
    for (let step = 1; step <= maxSteps; step += 1) {
      const prompt = this.buildPrompt(message, history, state.toolHistory);
      const raw = await this.gemini.generate(prompt);
      const parsed = this.normalizeGeminiOutput(raw);

      if (parsed.intent === 'tool_call') {
        if (parsed.reply) {
          await Promise.resolve(emit({ type: 'message', role: 'model', text: parsed.reply }));
        }
        if (!parsed.action) {
          await Promise.resolve(emit({ type: 'message', role: 'model', text: '請提供更明確的操作內容。' }));
          return;
        }

        const toolName = parsed.tool ?? 'course-management';
        const args = parsed.args ?? {};
        await Promise.resolve(
          emit({
            type: 'tool_call',
            tool: toolName,
            action: parsed.action,
            args,
            step,
          }),
        );
        this.logger.log(`Tool call requested: ${parsed.action} args=${JSON.stringify(args)}`);

        const toolStarted = Date.now();
        const result = await this.skillRunner.run(parsed.action, args);
        const toolDuration = Date.now() - toolStarted;

        await Promise.resolve(
          emit({
            type: 'tool_result',
            tool: toolName,
            action: parsed.action,
            duration_ms: toolDuration,
            result,
            step,
          }),
        );
        this.logger.log(`Tool result: ${parsed.action} result=${JSON.stringify(result)}`);

        state.toolHistory.push({ action: parsed.action, result });
        continue;
      }

      await Promise.resolve(
        emit({
          type: 'message',
          role: 'model',
          text: parsed.reply ?? parsed.response ?? raw,
        }),
      );
      hasFinal = true;
      this.logger.log(`Final reply: ${parsed.reply ?? parsed.response ?? raw}`);
      break;
    }

    if (!hasFinal) {
      await Promise.resolve(
        emit({
          type: 'message',
          role: 'model',
          text: '已完成操作，但需要更多資訊才能產生完整回覆。',
        }),
      );
    }

    const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    await Promise.resolve(emit({ type: 'status', text: `已思考 ${elapsed}s` }));
  }

  private buildPrompt(
    message: string,
    history: ChatMessage[],
    toolHistory: Array<{ action: string; result: unknown }>,
  ) {
    const trimmedHistory = history.slice(-8);
    const historyText = trimmedHistory
      .map((item) => `${item.role === 'user' ? '使用者' : '助理'}: ${item.text}`)
      .join('\n');
    const toolTrace = toolHistory
      .map((item, index) => `工具結果 ${index + 1}: action=${item.action}, result=${JSON.stringify(item.result)}`)
      .join('\n');

    return `你是 LEC AI（特教中心專用助理）。你的語氣友善、專業且精確。\n\n你可以使用以下技能：course-management（課程與學員管理）。\n\n請輸出「純 JSON」，不得包含 markdown 或多餘文字，也不要使用 \`\`\` 包裹。\n\n如果需要執行技能，輸出：\n{\n  "intent": "tool_call",\n  "tool": "course-management",\n  "action": "<action>",\n  "args": { ... },\n  "reply": "給使用者的回覆（可選）"\n}\n\n如果不需要技能，輸出：\n{\n  "intent": "final",\n  "reply": "給使用者的回覆"\n}\n\ncourse-management 支援的 action：\n- add_student { name, birthdate, type?, course_type?, grade?, default_fee?, phone?, gender?, status? }\n- get_student { name }\n- list_students { status? }\n- update_student { student_id, name?, birthdate?, type?, course_type?, grade?, default_fee?, phone?, gender?, status? }\n- add_schedule { student, weekday, start_time, end_time? }\n- get_student_schedules { student }\n- get_weekly_schedule { weekday? }\n- delete_schedule { schedule_id }\n- add_attendance { student, class_date, start_time, end_time, status?, visual?, auditory?, motor?, notes? }\n- add_leave { student, leave_date, reason? }\n- get_attendance { student, start_date?, end_date? }\n- get_leaves { student }\n- add_class_note { student, note_date, note_type, content }\n- add_assessment { student, assessment_date, assessment_type?, status?, visual_ability?, auditory_ability?, motor_ability?, visual_ratio?, auditory_ratio?, motor_ratio?, academic_ratio?, course_type?, professional_notes?, stars?, visual_age?, auditory_age?, motor_age? }\n- get_assessments { student }\n- get_latest_assessment { student }\n- compare_assessments { student }\n- add_payment { student, amount, status?, invoice_status?, paid_at?, method?, invoice_no?, sessions_count?, month_ref?, note? }\n- get_payments { student }\n- update_payment { payment_id, status?, invoice_status?, paid_at?, method?, invoice_no?, note?, amount?, sessions_count?, month_ref? }\n- delete_payment { payment_id }\n\n對話記錄：\n${historyText}\n\n已知工具結果：\n${toolTrace || '（無）'}\n\n使用者: ${message}\n\n請回覆 JSON。`;
  }

  private parseGeminiOutput(raw: string) {
    const tryParse = (value: string) => {
      const stripped = this.stripMarkdownJson(value);
      const trimmed = stripped.trim();
      const extracted = this.extractJsonObject(trimmed) ?? trimmed;
      try {
        return JSON.parse(extracted);
      } catch {
        return null;
      }
    };

    try {
      const outer = JSON.parse(raw);
      if (outer?.response && typeof outer.response === 'string') {
        const parsed = tryParse(outer.response);
        return parsed ?? { intent: 'chat', reply: outer.response };
      }
      return outer;
    } catch {
      const parsed = tryParse(raw);
      return parsed ?? { intent: 'chat', reply: raw };
    }
  }

  private normalizeGeminiOutput(raw: string) {
    const parsed = this.parseGeminiOutput(raw);
    if (parsed.intent === 'skill') {
      return {
        intent: 'tool_call',
        tool: parsed.skill ?? 'course-management',
        action: parsed.action,
        args: parsed.args,
        reply: parsed.reply,
      };
    }
    if (parsed.intent === 'chat') {
      return { intent: 'final', reply: parsed.reply };
    }
    if (parsed.intent === 'final' || parsed.intent === 'tool_call') {
      return parsed;
    }
    return { intent: 'final', reply: parsed.reply ?? parsed.response ?? raw };
  }

  private stripMarkdownJson(value: string) {
    const fence = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence && fence[1]) {
      return fence[1];
    }
    return value;
  }

  private extractJsonObject(value: string) {
    const first = value.indexOf('{');
    const last = value.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) return null;
    return value.slice(first, last + 1);
  }

  private formatSkillResult(action: string, result: unknown) {
    if (result == null) return '';

    if (action === 'list_students' && Array.isArray(result)) {
      if (result.length === 0) return '目前沒有任何個案。';
      const lines = result
        .slice(0, 20)
        .map((item: any) => {
          const status = item?.status ? `（${item.status}）` : '';
          const type = item?.type ? `，類型：${item.type}` : '';
          return `- ${item?.name ?? '未命名'}${status}${type}`;
        })
        .join('\n');
      const suffix = result.length > 20 ? `\n...共 ${result.length} 筆` : `\n共 ${result.length} 筆`;
      return `查詢結果：\n${lines}${suffix}`;
    }

    if (action === 'get_student' && Array.isArray(result)) {
      if (result.length === 0) return '找不到符合的個案。';
      const lines = result
        .slice(0, 10)
        .map((item: any) => {
          const birthdate = item?.birthdate ? `，生日：${item.birthdate}` : '';
          const status = item?.status ? `，狀態：${item.status}` : '';
          return `- ${item?.name ?? '未命名'}${birthdate}${status}`;
        })
        .join('\n');
      return `找到以下個案：\n${lines}`;
    }

    if ((action === 'get_student_schedules' || action === 'get_weekly_schedule') && Array.isArray(result)) {
      if (result.length === 0) return '目前沒有任何課表資料。';
      const lines = result
        .slice(0, 20)
        .map((item: any) => {
          const student = item?.student_name || item?.student || '未指定';
          const weekday = item?.weekday != null ? `週${item.weekday}` : '';
          const start = item?.start_time ?? '';
          const end = item?.end_time ? `- ${item.end_time}` : '';
          return `- ${student} ${weekday} ${start} ${end}`.trim();
        })
        .join('\n');
      return `課表結果：\n${lines}`;
    }

    if ((action === 'get_attendance' || action === 'get_leaves') && Array.isArray(result)) {
      if (result.length === 0) return '目前沒有相關出席/請假紀錄。';
      const lines = result
        .slice(0, 20)
        .map((item: any) => {
          const date = item?.class_date || item?.leave_date || item?.date || '';
          const status = item?.status ? `（${item.status}）` : '';
          const reason = item?.reason ? `，原因：${item.reason}` : '';
          return `- ${date}${status}${reason}`;
        })
        .join('\n');
      return `出席/請假紀錄：\n${lines}`;
    }

    if ((action === 'get_assessments' || action === 'get_latest_assessment') && Array.isArray(result)) {
      if (result.length === 0) return '目前沒有檢測紀錄。';
      const lines = result
        .slice(0, 10)
        .map((item: any) => {
          const date = item?.assessment_date || item?.date || '';
          const type = item?.assessment_type ? `，${item.assessment_type}` : '';
          return `- ${date}${type}`;
        })
        .join('\n');
      return `檢測紀錄：\n${lines}`;
    }

    if (action === 'compare_assessments' && typeof result === 'object') {
      return `檢測比較結果：\n${JSON.stringify(result, null, 2)}`;
    }

    if (typeof result === 'object') {
      return `結果：\n${JSON.stringify(result, null, 2)}`;
    }

    return `結果：${String(result)}`;
  }
}
