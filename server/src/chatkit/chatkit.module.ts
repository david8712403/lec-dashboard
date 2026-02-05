import { Module } from '@nestjs/common';
import { ChatKitController } from './chatkit.controller';
import { ChatKitService } from './chatkit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ChatKitController],
  providers: [ChatKitService],
})
export class ChatKitModule {}
