import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { AssessmentHelperService } from './assessment-helper.service';

@Module({
  controllers: [DataController],
  providers: [DataService, AssessmentHelperService],
  exports: [AssessmentHelperService],
})
export class DataModule {}
