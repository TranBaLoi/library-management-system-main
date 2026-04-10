#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const raw = process.argv.slice(2);
  const args = {};
  for (const token of raw) {
    if (token.startsWith('--')) {
      const [k,v] = token.split('=');
      args[k.replace(/^--/,'')] = v === undefined ? true : v;
    }
  }
  return args;
}

function toGorseUserId(raw) {
  if (/^user_\d+$/.test(raw)) return raw;
  if (/^\d+$/.test(String(raw))) return `user_${raw}`;
  return String(raw);
}

function normalizeItemId(raw) {
  if (typeof raw === 'number') return `book_${raw}`;
  if (/^\d+$/.test(String(raw))) return `book_${raw}`;
  return String(raw);
}

function precisionAtK(recommended, relevant, k) {
  if (k <= 0) return 0;
  const topK = recommended.slice(0,k);
  const numRelevant = topK.filter(x => relevant.has(x)).length;
  return numRelevant / k;
}

function recallAtK(recommended, relevant, k) {
  if (relevant.size === 0) return 0;
  const topK = recommended.slice(0,k);
  const numRelevant = topK.filter(x => relevant.has(x)).length;
  return numRelevant / relevant.size;
}

function dcgAtK(recommended, relevant, k) {
  let dcg = 0;
  for (let i = 0; i < Math.min(k, recommended.length); i++) {
    if (relevant.has(recommended[i])) dcg += 1 / Math.log2(i+2);
  }
  return dcg;
}

function idcgAtK(relevantCount, k) {
  let idcg = 0;
  const n = Math.min(relevantCount, k);
  for (let i = 0; i < n; i++) idcg += 1 / Math.log2(i+2);
  return idcg;
}

function ndcgAtK(recommended, relevant, k) {
  const dcg = dcgAtK(recommended, relevant, k);
  const idcg = idcgAtK(relevant.size, k);
  if (idcg === 0) return 0;
  return dcg / idcg;
}

function reciprocalRank(recommended, relevant) {
  for (let i = 0; i < recommended.length; i++) {
    if (relevant.has(recommended[i])) return 1 / (i+1);
  }
  return 0;
}

async function main() {
  const args = parseArgs();
  const groundTruthFile = args.groundTruth || 'scripts/test-data/recommendation-ground-truth.sample.json';
  const simulatedFile = args.simulated || 'scripts/test-data/recommendation-simulated-recs.sample.json';
  const k = Number(args.k || 10);
  const topKsArg = args.topKs || '';
  const topKs = topKsArg ? topKsArg.split(',').map(s => Number(s.trim())).filter(Boolean) : [k];

  console.log(`[dry-run] groundTruth=${groundTruthFile} simulated=${simulatedFile} topKs=${topKs.join(',')}`);

  function loadJson(p) {
    const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    const raw = fs.readFileSync(abs, 'utf8');
    return JSON.parse(raw);
  }

  const groundTruthRaw = loadJson(groundTruthFile);
  const groundTruth = {};
  for (const [rawUser, items] of Object.entries(groundTruthRaw)) {
    const userId = toGorseUserId(rawUser);
    const itemSet = new Set(items.map(i => normalizeItemId(i)));
    groundTruth[userId] = itemSet;
  }

  const recsRaw = loadJson(simulatedFile);
  const recsNormalized = {};
  for (const [rawUser, arr] of Object.entries(recsRaw)) {
    const userId = toGorseUserId(rawUser);
    recsNormalized[userId] = arr.map(i => normalizeItemId(i));
  }

  const metricsPerK = {};
  for (const kVal of topKs) {
    const precisions = [];
    const recalls = [];
    const ndcgs = [];
    const mrrs = [];

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
      precision: precisions.reduce((s,v) => s+v,0)/(precisions.length||1),
      recall: recalls.reduce((s,v) => s+v,0)/(recalls.length||1),
      ndcg: ndcgs.reduce((s,v) => s+v,0)/(ndcgs.length||1),
      mrr: mrrs.reduce((s,v) => s+v,0)/(mrrs.length||1),
    };
  }

  const uniqueRecs = new Set();
  for (const arr of Object.values(recsNormalized)) arr.forEach(i => uniqueRecs.add(i));
  const uniqueGT = new Set();
  for (const s of Object.values(groundTruth)) s.forEach(i => uniqueGT.add(i));
  const coverage = uniqueGT.size === 0 ? 0 : uniqueRecs.size / uniqueGT.size;

  console.log('\n=== Recommendation Evaluation Summary (dry-run) ===\n');
  for (const kVal of topKs) {
    const m = metricsPerK[kVal];
    console.log(`K=${kVal}: Precision@${kVal}=${(m.precision*100).toFixed(2)}%  Recall@${kVal}=${(m.recall*100).toFixed(2)}%  NDCG@${kVal}=${(m.ndcg*100).toFixed(2)}%  MRR=${m.mrr.toFixed(4)}`);
  }
  console.log(`\nCoverage (unique recs / unique GT items): ${(coverage*100).toFixed(2)}%`);
  console.log(`Users evaluated: ${Object.keys(groundTruth).length}`);
  console.log('==========================================\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
