import fs from 'fs';
import path from 'path';
import {pool, query} from './index';

/**
 * 自动迁移运行器
 *
 * 在服务器启动时检查并执行未运行的迁移。
 * 生产环境从 dist/db/migrations 加载，开发环境从 src/db/migrations 加载。
 */

// 查找 migrations 目录：优先 dist（生产），fallback src（开发）
function findMigrationsDir(): string {
  const candidates = [
    path.join(__dirname, 'migrations'),                         // dist/db/migrations
    path.join(__dirname, '..', '..', 'src', 'db', 'migrations'), // 从 dist/db 回退
    path.join(process.cwd(), 'src', 'db', 'migrations'),         // 从项目根
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error('Cannot find migrations directory');
}

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();

  let migrationsDir: string;
  try {
    migrationsDir = findMigrationsDir();
  } catch {
    console.log('[migrate] No migrations directory found');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const {rows: applied} = await query(
    'SELECT name FROM _migrations',
  );
  const appliedNames = new Set(applied.map((r: any) => r.name));

  for (const file of files) {
    if (appliedNames.has(file)) continue;

    console.log(`[migrate] Running ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await query(sql);
    await query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    console.log(`[migrate] ${file} applied`);
  }

  console.log('[migrate] All migrations up to date');
}
