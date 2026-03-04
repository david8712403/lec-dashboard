import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { AssessmentHelperService } from './assessment-helper.service';

@Module({
  imports: [AiModule],
  controllers: [DataController],
  providers: [DataService, AssessmentHelperService],
  exports: [AssessmentHelperService],
})
export class DataModule {}
