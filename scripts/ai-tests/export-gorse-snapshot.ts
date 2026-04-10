import 'dotenv/config';
import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import path from 'path';

function parseArgs() {
  const raw = process.argv.slice(2);
  const args: Record<string, string | boolean> = {};
  for (const token of raw) {
    if (token.startsWith('--')) {
      const [k, v] = token.split('=');
      args[k.replace(/^--/, '')] = v === undefined ? true : v;
    }
  }
  return args;
}

async function writeJson(filePath: string, data: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function exportSnapshot(label: string, outDir: string, dryRun: boolean) {
  const destDir = path.join(outDir, label);

  if (dryRun) {
    console.log('[export] dry-run mode — writing example snapshot');
    const items = [
      { itemId: 'book_1', timeStamp: new Date().toISOString(), labels: ['en'], comment: 'Example book 1', categories: ['fiction'], isHidden: 0 },
      { itemId: 'book_3', timeStamp: new Date().toISOString(), labels: ['vi'], comment: 'Sample book 3', categories: ['history'], isHidden: 0 },
    ];
    const users = [{ userId: 'user_1', labels: ['reader'], comment: 'User 1' }, { userId: 'user_2', labels: [], comment: '' }];
    const feedback = [
      { feedbackType: 'read', userId: 'user_1', itemId: 'book_1', timeStamp: new Date().toISOString(), comment: '', value: 1 },
      { feedbackType: 'like', userId: 'user_1', itemId: 'book_3', timeStamp: new Date().toISOString(), comment: '', value: 4 },
    ];

    await writeJson(path.join(destDir, 'items.json'), items);
    await writeJson(path.join(destDir, 'users.json'), users);
    await writeJson(path.join(destDir, 'feedback.json'), feedback);

    console.log(`[export] example snapshot written to ${destDir}`);
    return;
  }

  // Read DB config (same defaults as sync-gorse-data.ts)
  const gorseDbConfig = {
    host: process.env.GORSE_MYSQL_HOST || 'localhost',
    port: parseInt(process.env.GORSE_MYSQL_PORT || '3307', 10),
    user: process.env.GORSE_MYSQL_USER || 'gorse_user',
    password: process.env.GORSE_MYSQL_PASSWORD || 'gorse123',
    database: process.env.GORSE_MYSQL_DATABASE || 'gorse_db',
  };

  let connection;
  try {
    connection = await mysql.createConnection({
      host: gorseDbConfig.host,
      port: gorseDbConfig.port,
      user: gorseDbConfig.user,
      password: gorseDbConfig.password,
      database: gorseDbConfig.database,
    });

    console.log('[export] connected to Gorse MySQL at %s:%d', gorseDbConfig.host, gorseDbConfig.port);

    const [itemsRows] = await connection.execute(
      `SELECT item_id AS itemId, time_stamp AS timeStamp, labels, comment, categories, is_hidden AS isHidden FROM items`
    );
    const [usersRows] = await connection.execute(`SELECT user_id AS userId, labels, comment FROM users`);
    const [feedbackRows] = await connection.execute(
      `SELECT feedback_type AS feedbackType, user_id AS userId, item_id AS itemId, time_stamp AS timeStamp, comment, value FROM feedback`
    );

    await writeJson(path.join(destDir, 'items.json'), itemsRows);
    await writeJson(path.join(destDir, 'users.json'), usersRows);
    await writeJson(path.join(destDir, 'feedback.json'), feedbackRows);

    console.log(`[export] snapshot written to ${destDir}`);
  } catch (error) {
    console.error('[export] failed to export snapshot:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

async function main() {
  const args = parseArgs();
  const label = (args.label as string) || (args.l as string) || 'before';
  const outDir = (args.outDir as string) || 'scripts/test-data/gorse-snapshots';
  const dryRun = !!(args.dryRun || args['dry-run'] || args.dryrun);

  await exportSnapshot(label, outDir, dryRun);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
