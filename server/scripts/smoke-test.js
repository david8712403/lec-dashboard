"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("../src/app.module");
const log = (label, value) => {
    console.log(`\n[${label}]`);
    console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};
async function run() {
    if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = 'file:./dev.db';
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter(), { logger: false });
    app.setGlobalPrefix('api');
    await app.init();
    const server = app.getHttpAdapter().getInstance();
    const dashboard = await server.inject({ method: 'GET', url: '/api/dashboard' });
    log('GET /api/dashboard status', dashboard.statusCode);
    log('GET /api/dashboard body', JSON.parse(dashboard.body));
    const createStudent = await server.inject({
        method: 'POST',
        url: '/api/students',
        payload: {
            name: '測試學生',
            status: '進行中',
            tags: ['測試'],
        },
    });
    const created = JSON.parse(createStudent.body);
    log('POST /api/students status', createStudent.statusCode);
    log('POST /api/students body', created);
    const updateStudent = await server.inject({
        method: 'PATCH',
        url: `/api/students/${created.id}`,
        payload: {
            phone: '0900-000-000',
        },
    });
    log('PATCH /api/students status', updateStudent.statusCode);
    log('PATCH /api/students body', JSON.parse(updateStudent.body));
    const deleteStudent = await server.inject({
        method: 'DELETE',
        url: `/api/students/${created.id}`,
    });
    log('DELETE /api/students status', deleteStudent.statusCode);
    await app.close();
}
run().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=smoke-test.js.map