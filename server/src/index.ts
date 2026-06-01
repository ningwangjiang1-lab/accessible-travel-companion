import {buildApp} from './app';
import {env} from './config/env';

/**
 * 服务器入口
 *
 * 启动命令：npm run dev（开发模式热重载） / npm start（生产模式）
 */
async function start() {
  const app = await buildApp();

  try {
    await app.listen({port: env.PORT, host: env.HOST});
    app.log.info(`🚀 Server running at http://localhost:${env.PORT}`);
    if (!env.isProduction) {
      app.log.info(`📖 API Docs: http://localhost:${env.PORT}/docs`);
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
