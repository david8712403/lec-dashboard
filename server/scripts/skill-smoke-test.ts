import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { SkillRunnerService } from '../src/ai/skill-runner.service';

async function run() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./dev.db';
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  await app.init();

  const skillRunner = app.get(SkillRunnerService);
  const students = await skillRunner.run('list_students', {});
  console.log('[skill list_students]');
  console.log(JSON.stringify(students, null, 2));

  await app.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
