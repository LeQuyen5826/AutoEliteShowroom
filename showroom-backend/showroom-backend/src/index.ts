import app from './app';
import prisma from './config/prisma';
import { validateEnvironment } from './config/env';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function bootstrap() {
  try {
    validateEnvironment();
    // Kiểm tra kết nối database
    await prisma.$connect();
    console.log('✅  Kết nối PostgreSQL thành công');

    app.listen(PORT, () => {
      console.log(`🚀  Server đang chạy tại http://localhost:${PORT}`);
      console.log(`📋  Môi trường: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\nEndpoints có sẵn:`);
      console.log(`  GET  /health`);
      console.log(`  POST /api/auth/register`);
      console.log(`  POST /api/auth/login`);
      console.log(`  POST /api/auth/refresh`);
      console.log(`  GET  /api/users/me`);
      console.log(`  GET  /api/cars`);
      console.log(`  GET  /api/cars/:id`);
      console.log(`  GET  /api/branches`);
    });
  } catch (err) {
    console.error('❌  Không thể kết nối database:', err);
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('\n🛑  Server đã dừng');
  process.exit(0);
});
