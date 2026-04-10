/**
 * Test harness for recommendation evaluation (Precision@K, Recall@K, NDCG, MRR)
 *
 * Usage (dry-run):
 * node node_modules/ts-node/dist/bin.js --compiler-options '{"module":"CommonJS"}' scripts/test-recommendation.ts --groundTruth=scripts/test-data/recommendation-ground-truth.sample.json --simulated=scripts/test-data/recommendation-simulated-recs.sample.json --k=5 --dry-run
 */

import { config } from 'dotenv';
config();

import { resolve } from 'path';
import { register } from 'tsconfig-paths';

register({
  baseUrl: resolve(__dirname, '..'),
  paths: { '@/*': ['./src/*'] },
});

import fs from 'fs/promises';
import path from 'path';
import { GorseService } from '../src/services/gorse.service';

type GroundTruthMap = Record<string, (string | number)[]>;
type RecMap = Record<string, string[]>;

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

function toGorseUserId(raw: string) {
  if (/^user_\d+$/.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return `user_${raw}`;
  return raw;
}

function normalizeItemId(raw: string | number) {
  if (typeof raw === 'number') return `book_${raw}`;
  if (/^\d+$/.test(String(raw))) return `book_${raw}`;
  return String(raw);
}

function precisionAtK(recommended: string[], relevant: Set<string>, k: number) {
  if (k <= 0) return 0;
  const topK = recommended.slice(0, k);
  const numRelevant = topK.filter(x => relevant.has(x)).length;
  return numRelevant / k;
}

function recallAtK(recommended: string[], relevant: Set<string>, k: number) {
  if (relevant.size === 0) return 0;
  const topK = recommended.slice(0, k);
  const numRelevant = topK.filter(x => relevant.has(x)).length;
  return numRelevant / relevant.size;
}

function dcgAtK(recommended: string[], relevant: Set<string>, k: number) {
  let dcg = 0;
  for (let i = 0; i < Math.min(k, recommended.length); i++) {
    if (relevant.has(recommended[i])) {
      dcg += 1 / Math.log2(i + 2);
    }
  }
  return dcg;
}

function idcgAtK(relevantCount: number, k: number) {
  let idcg = 0;
  const n = Math.min(relevantCount, k);
  for (let i = 0; i < n; i++) {
    idcg += 1 / Math.log2(i + 2);
  }
  return idcg;
}

function ndcgAtK(recommended: string[], relevant: Set<string>, k: number) {
  const dcg = dcgAtK(recommended, relevant, k);
  const idcg = idcgAtK(relevant.size, k);
  if (idcg === 0) return 0;
  return dcg / idcg;
}

function reciprocalRank(recommended: string[], relevant: Set<string>) {
  for (let i = 0; i < recommended.length; i++) {
    if (relevant.has(recommended[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

async function loadJson<T>(filePath: string): Promise<T> {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(abs, 'utf8');
  return JSON.parse(raw) as T;
}

async function main() {
  const args = parseArgs();
  const groundTruthFile = (args.groundTruth as string) || 'scripts/test-data/recommendation-ground-truth.sample.json';
  const simulatedFile = (args.simulated as string) || 'scripts/test-data/recommendation-simulated-recs.sample.json';
  const k = Number((args.k as string) || 10);
  const topKsArg = (args.topKs as string) || '';
  const dryRun = !!(args.dryRun || args['dry-run'] || args.dryrun);

  const topKs = topKsArg ? topKsArg.split(',').map(s => Number(s.trim())).filter(Boolean) : [k];

  console.log(`[TestRec] groundTruth=${groundTruthFile} simulated=${simulatedFile} topKs=${topKs.join(',')} dryRun=${dryRun}`);

  const groundTruthRaw = await loadJson<GroundTruthMap>(groundTruthFile);

  const groundTruth: Record<string, Set<string>> = {};
  for (const [rawUser, items] of Object.entries(groundTruthRaw)) {
    const userId = toGorseUserId(rawUser);
    const itemSet = new Set<string>(items.map(i => normalizeItemId(i)));
    groundTruth[userId] = itemSet;
  }

  // Fetch recommendations (either from Gorse or simulated)
  let recsRaw: RecMap = {};

  if (dryRun) {
    recsRaw = await loadJson<RecMap>(simulatedFile);
  } else {
    // For each user call GorseService.getRecommendations
    for (const userId of Object.keys(groundTruth)) {
      try {
        const recs = await GorseService.getRecommendations(userId, Math.max(...topKs));
        recsRaw[userId] = recs;
        // small delay to avoid hammering the API
        await new Promise(res => setTimeout(res, 100));
      } catch (error) {
        console.error(`[TestRec] Failed to fetch for ${userId}:`, error);
        recsRaw[userId] = [];
      }
    }
  }

  // Normalize recs
  const recsNormalized: Record<string, string[]> = {};
  for (const [rawUser, arr] of Object.entries(recsRaw)) {
    const userId = toGorseUserId(rawUser);
    recsNormalized[userId] = arr.map(i => normalizeItemId(i));
  }

  // Evaluate metrics
  const metricsPerK: Record<number, { precision: number; recall: number; ndcg: number; mrr: number }> = {};
  for (const kVal of topKs) {
    let precisions: number[] = [];
    let recalls: number[] = [];
    let ndcgs: number[] = [];
    let mrrs: number[] = [];

    for (const [userId, relevantSet] of Object.entries(groundTruth)) {
      const recs = recsNormalized[userId] || [];

      const p = precisionAtK(recs, relevantSet, kVal);
      const r = recallAtK(recs, relevantSet, kVal);
      const n = ndcgAtK(recs, relevantSet, kVal);
      const m = reciprocalRank(recs, relevantSet);

      precisions.push(p);
      recalls.push(r);
      ndcgs.push(n);
      mrrs.push(m);
    }

    metricsPerK[kVal] = {
      precision: precisions.reduce((s, v) => s + v, 0) / (precisions.length || 1),
      recall: recalls.reduce((s, v) => s + v, 0) / (recalls.length || 1),
      ndcg: ndcgs.reduce((s, v) => s + v, 0) / (ndcgs.length || 1),
      mrr: mrrs.reduce((s, v) => s + v, 0) / (mrrs.length || 1),
    };
  }

  // Coverage: how many unique recommended items appeared divided by unique items in ground truth
  const uniqueRecs = new Set<string>();
  for (const arr of Object.values(recsNormalized)) {
    arr.forEach(i => uniqueRecs.add(i));
  }
  const uniqueGT = new Set<string>();
  for (const s of Object.values(groundTruth)) {
    s.forEach(i => uniqueGT.add(i));
  }
  const coverage = uniqueGT.size === 0 ? 0 : uniqueRecs.size / uniqueGT.size;

  // Output summary
  console.log('\n=== Recommendation Evaluation Summary ===\n');
  for (const kVal of topKs) {
    const m = metricsPerK[kVal];
    console.log(`K=${kVal}: Precision@${kVal}=${(m.precision * 100).toFixed(2)}%  Recall@${kVal}=${(m.recall * 100).toFixed(2)}%  NDCG@${kVal}=${(m.ndcg * 100).toFixed(2)}%  MRR=${m.mrr.toFixed(4)}`);
  }
  console.log(`\nCoverage (unique recs / unique GT items): ${(coverage * 100).toFixed(2)}%`);
  console.log(`Users evaluated: ${Object.keys(groundTruth).length}`);
  console.log('==========================================\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
