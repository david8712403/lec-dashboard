import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiCliService } from './gemini-cli.service';
import { SkillRunnerService } from './skill-runner.service';

@Module({
  controllers: [AiController],
  providers: [AiService, GeminiCliService, SkillRunnerService],
  exports: [AiService],
})
export class AiModule {}
