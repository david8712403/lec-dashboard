import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AiModule } from './ai/ai.module';
import { DataModule } from './data/data.module';
import { ChatKitModule } from './chatkit/chatkit.module';

@Module({
  imports: [PrismaModule, DashboardModule, AiModule, DataModule, ChatKitModule],
})
export class AppModule {}
