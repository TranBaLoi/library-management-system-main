import fs from 'fs/promises';
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

async function readJson(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function arrToMapBy<T>(arr: T[], keyFn: (x: T) => string) {
  const map = new Map<string, T>();
  for (const el of arr) map.set(keyFn(el), el);
  return map;
}

function keyFromFeedback(f: any) {
  // Use a compact key for feedback comparison
  return `${f.feedbackType}|${f.userId}|${f.itemId}|${f.timeStamp || ''}|${f.value ?? ''}`;
}

async function compare(beforeDir: string, afterDir: string) {
  const beforeItems = await readJson(path.join(beforeDir, 'items.json')).catch(() => []);
  const afterItems = await readJson(path.join(afterDir, 'items.json')).catch(() => []);

  const beforeUsers = await readJson(path.join(beforeDir, 'users.json')).catch(() => []);
  const afterUsers = await readJson(path.join(afterDir, 'users.json')).catch(() => []);

  const beforeFeedback = await readJson(path.join(beforeDir, 'feedback.json')).catch(() => []);
  const afterFeedback = await readJson(path.join(afterDir, 'feedback.json')).catch(() => []);

  const beforeItemIds = new Set(beforeItems.map((i: any) => i.itemId));
  const afterItemIds = new Set(afterItems.map((i: any) => i.itemId));

  const addedItems = [...afterItemIds].filter(x => !beforeItemIds.has(x));
  const removedItems = [...beforeItemIds].filter(x => !afterItemIds.has(x));

  const beforeUserIds = new Set(beforeUsers.map((u: any) => u.userId));
  const afterUserIds = new Set(afterUsers.map((u: any) => u.userId));
  const addedUsers = [...afterUserIds].filter(x => !beforeUserIds.has(x));
  const removedUsers = [...beforeUserIds].filter(x => !afterUserIds.has(x));

  const beforeFbKeys = new Set(beforeFeedback.map((f: any) => keyFromFeedback(f)));
  const afterFbKeys = new Set(afterFeedback.map((f: any) => keyFromFeedback(f)));

  const addedFeedback = [...afterFbKeys].filter(x => !beforeFbKeys.has(x));
  const removedFeedback = [...beforeFbKeys].filter(x => !afterFbKeys.has(x));

  console.log('=== Gorse Snapshot Comparison ===');
  console.log(`Items: before=${beforeItemIds.size} after=${afterItemIds.size} added=${addedItems.length} removed=${removedItems.length}`);
  if (addedItems.length) console.log('  Added items sample:', addedItems.slice(0, 10));
  if (removedItems.length) console.log('  Removed items sample:', removedItems.slice(0, 10));

  console.log(`Users: before=${beforeUserIds.size} after=${afterUserIds.size} added=${addedUsers.length} removed=${removedUsers.length}`);
  if (addedUsers.length) console.log('  Added users sample:', addedUsers.slice(0, 10));

  console.log(`Feedback: before=${beforeFbKeys.size} after=${afterFbKeys.size} added=${addedFeedback.length} removed=${removedFeedback.length}`);
  if (addedFeedback.length) console.log('  Added feedback sample (first 10):', addedFeedback.slice(0, 10));

  console.log('=================================');
}

async function main() {
  const args = parseArgs();
  const before = (args.before as string) || 'scripts/test-data/gorse-snapshots/before';
  const after = (args.after as string) || 'scripts/test-data/gorse-snapshots/after';
  await compare(before, after);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
