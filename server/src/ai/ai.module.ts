import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiCliService } from './gemini-cli.service';
import { SkillRunnerService } from './skill-runner.service';
import { StudentSkill } from './skills/student.skill';
import { ScheduleSkill } from './skills/schedule.skill';
import { AttendanceSkill } from './skills/attendance.skill';
import { AssessmentSkill } from './skills/assessment.skill';
import { PaymentSkill } from './skills/payment.skill';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [
    AiService,
    GeminiCliService,
    SkillRunnerService,
    StudentSkill,
    ScheduleSkill,
    AttendanceSkill,
    AssessmentSkill,
    PaymentSkill,
  ],
  exports: [AiService],
})
export class AiModule {}
