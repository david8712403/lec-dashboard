"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("../src/app.module");
const skill_runner_service_1 = require("../src/ai/skill-runner.service");
async function run() {
    if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = 'file:./dev.db';
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter(), { logger: false });
    await app.init();
    const skillRunner = app.get(skill_runner_service_1.SkillRunnerService);
    const students = await skillRunner.run('list_students', {});
    console.log('[skill list_students]');
    console.log(JSON.stringify(students, null, 2));
    await app.close();
}
run().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=skill-smoke-test.js.map