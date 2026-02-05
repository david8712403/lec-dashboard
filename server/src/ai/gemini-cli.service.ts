import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';

@Injectable()
export class GeminiCliService {
  async generate(prompt: string): Promise<string> {
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    const cliPath = process.env.GEMINI_CLI_PATH ?? 'gemini';
    const geminiHome =
      process.env.GEMINI_CLI_HOME && process.env.GEMINI_CLI_HOME.trim() !== ''
        ? process.env.GEMINI_CLI_HOME
        : undefined;
    const args = ['-m', model, '-p', prompt, '--output-format', 'json'];
    const startedAt = Date.now();
    console.log(`[GeminiCLI] invoking ${cliPath} ${args.slice(0, 2).join(' ')} -p "<prompt>" --output-format json`);
    console.log(`[GeminiCLI] prompt:\n${prompt}`);

    return new Promise((resolve, reject) => {
      const env = { ...process.env } as Record<string, string | undefined>;
      if (geminiHome) {
        env.GEMINI_CLI_HOME = geminiHome;
        env.HOME = geminiHome;
      } else {
        delete env.GEMINI_CLI_HOME;
      }
      if (!env.GEMINI_CLI_SYSTEM_SETTINGS_PATH) {
        delete env.GEMINI_CLI_SYSTEM_SETTINGS_PATH;
      }

      const child = spawn(cliPath, args, {
        env: {
          ...env,
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          reject(new Error('找不到 Gemini CLI，請先安裝並設定 GEMINI_CLI_PATH。'));
          return;
        }
        reject(error);
      });

      child.on('close', (code) => {
        const parseJson = () => {
          try {
            return JSON.parse(stdout.trim());
          } catch {
            return null;
          }
        };

        const parsed = parseJson();
        if (parsed?.error?.message) {
          console.error(`[GeminiCLI] error: ${parsed.error.message}`);
          reject(new Error(parsed.error.message));
          return;
        }

        if (code !== 0) {
          const cleanedStderr = stderr
            .split('\n')
            .filter((line) => !line.includes('DEP0040') && !line.includes('punycode'))
            .join('\n')
            .trim();
          const message = (cleanedStderr || stdout || `Gemini CLI exited with code ${code}`).trim();
          console.error(`[GeminiCLI] exit ${code} after ${Date.now() - startedAt}ms`);
          if (cleanedStderr) console.error(`[GeminiCLI] stderr:\n${cleanedStderr}`);
          reject(new Error(message));
          return;
        }

        const duration = Date.now() - startedAt;
        console.log(`[GeminiCLI] output (${duration}ms):\n${stdout.trim()}`);
        resolve(stdout.trim());
      });
    });
  }
}
