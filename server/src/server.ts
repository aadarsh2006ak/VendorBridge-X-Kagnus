import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { execSync } from 'child_process';
import path from 'path';

async function bootstrap() {
  try {
    const serverDir = path.resolve(__dirname, '..');
    console.log('🔄 Checking database schema and applying migrations...');
    execSync('npx prisma migrate deploy', { cwd: serverDir, stdio: 'inherit' });

    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Fresh database detected. Seeding initial demo data...');
      execSync('npx tsx prisma/seed.ts', { cwd: serverDir, stdio: 'inherit' });
      console.log('✅ Demo accounts and initial data seeded successfully.');
    }
  } catch (err) {
    console.warn('⚠️ Bootstrap migration/seed warning:', err instanceof Error ? err.message : err);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 VendorBridge Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`📡 Client Origin allowed: ${env.CLIENT_ORIGIN}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

bootstrap().catch((err) => {
  console.error('Fatal server bootstrap error:', err);
  process.exit(1);
});
