"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("../src/app.module");
async function run() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter(), { logger: false });
    app.setGlobalPrefix('api');
    await app.init();
    const server = app.getHttpAdapter().getInstance();
    const res = await server.inject({ method: 'OPTIONS', url: '/api/ai/chat/stream' });
    console.log({
        status: res.statusCode,
        allowOrigin: res.headers['access-control-allow-origin'],
        allowMethods: res.headers['access-control-allow-methods'],
        allowHeaders: res.headers['access-control-allow-headers'],
    });
    const postRes = await server.inject({
        method: 'POST',
        url: '/api/ai/chat/stream',
        headers: { origin: 'http://localhost:3003' },
        payload: { message: 'ping', history: [] },
    });
    console.log({
        postStatus: postRes.statusCode,
        postAllowOrigin: postRes.headers['access-control-allow-origin'],
        contentType: postRes.headers['content-type'],
    });
    await app.close();
}
run().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=cors-smoke-test.js.map