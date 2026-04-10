#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const raw = process.argv.slice(2);
  const args = {};
  for (const token of raw) {
    if (token.startsWith('--')) {
      const [k, v] = token.split('=');
      args[k.replace(/^--/, '')] = v === undefined ? true : v;
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
  const topK = recommended.slice(0, k);
  const numRelevant = topK.filter(x => relevant.has(x)).length;
  return numRelevant / k;
}

function recallAtK(recommended, relevant, k) {
  if (relevant.size === 0) return 0;
  const topK = recommended.slice(0, k);
  const numRelevant = topK.filter(x => relevant.has(x)).length;
  return numRelevant / relevant.size;
}

function dcgAtK(recommended, relevant, k) {
  let dcg = 0;
  for (let i = 0; i < Math.min(k, recommended.length); i++) {
    if (relevant.has(recommended[i])) dcg += 1 / Math.log2(i + 2);
  }
  return dcg;
}

function idcgAtK(relevantCount, k) {
  let idcg = 0;
  const n = Math.min(relevantCount, k);
  for (let i = 0; i < n; i++) idcg += 1 / Math.log2(i + 2);
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
    if (relevant.has(recommended[i])) return 1 / (i + 1);
  }
  return 0;
}

async function fetchRecommendations(gorseUrl, userId, n, headers) {
  try {
    const url = `${gorseUrl.replace(/\/$/, '')}/api/recommend/${encodeURIComponent(userId)}?n=${n}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`[fetchRecommendations] ${userId} -> HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data.map(String) : [];
  } catch (error) {
    console.error(`[fetchRecommendations] ${userId} ->`, error.message || error);
    return [];
  }
}

async function main() {
  const args = parseArgs();
  const groundTruthFile = args.groundTruth || 'scripts/test-data/recommendation-ground-truth.sample.json';
  const k = Number(args.k || 10);
  const topKsArg = args.topKs || '';
  const topKs = topKsArg ? topKsArg.split(',').map(s => Number(s.trim())).filter(Boolean) : [k];

  let GORSE_API_URL = process.env.GORSE_API_URL || `http://${process.env.GORSE_API_HOST || 'localhost'}:${process.env.GORSE_API_PORT || '8087'}`;
  // If .env contains unexpanded variable placeholders (e.g. ${GORSE_API_HOST}), compute concrete URL
  if (typeof GORSE_API_URL === 'string' && (GORSE_API_URL.includes('${') || GORSE_API_URL.includes('}'))) {
    GORSE_API_URL = `http://${process.env.GORSE_API_HOST || 'localhost'}:${process.env.GORSE_API_PORT || process.env.GORSE_DASHBOARD_PORT || '8087'}`;
  }
  const API_KEY = process.env.GORSE_SERVER_API_KEY || process.env.GORSE_API_KEY || '';
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;

  console.log(`[non-dry-run] groundTruth=${groundTruthFile} gorse=${GORSE_API_URL} topKs=${topKs.join(',')}`);

  // load ground truth
  const abs = path.isAbsolute(groundTruthFile) ? groundTruthFile : path.resolve(process.cwd(), groundTruthFile);
  if (!fs.existsSync(abs)) {
    console.error('Ground truth file not found:', abs);
    process.exit(1);
  }
  const groundTruthRaw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const groundTruth = {};
  for (const [rawUser, items] of Object.entries(groundTruthRaw)) {
    const userId = toGorseUserId(rawUser);
    const itemSet = new Set(items.map(i => normalizeItemId(i)));
    groundTruth[userId] = itemSet;
  }

  // Health check with localhost fallback
  async function checkHealth(url) {
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/api/health`, { headers });
      return res.ok;
    } catch {
      return false;
    }
  }

  let healthOk = await checkHealth(GORSE_API_URL);
  if (!healthOk) {
    const fallback = `http://localhost:${process.env.GORSE_API_PORT || process.env.GORSE_DASHBOARD_PORT || '8087'}`;
    if (!GORSE_API_URL.startsWith('http://localhost') && !GORSE_API_URL.startsWith('http://127.0.0.1')) {
      console.log(`[Gorse] health failed for ${GORSE_API_URL}, trying fallback ${fallback}`);
      if (await checkHealth(fallback)) {
        GORSE_API_URL = fallback;
        console.log('[Gorse] using fallback URL:', GORSE_API_URL);
        healthOk = true;
      } else {
        console.warn('[Gorse] fallback health also failed');
      }
    }
  } else {
    console.log('[Gorse] health ok');
  }

  // Try dashboard port (8088) if previous checks failed
  if (!healthOk) {
    const dashboardFallback = `http://localhost:${process.env.GORSE_DASHBOARD_PORT || '8088'}`;
    console.log(`[Gorse] trying dashboard fallback ${dashboardFallback}`);
    if (await checkHealth(dashboardFallback)) {
      GORSE_API_URL = dashboardFallback;
      console.log('[Gorse] using dashboard fallback URL:', GORSE_API_URL);
      healthOk = true;
    } else {
      console.warn('[Gorse] dashboard fallback also failed');
    }
  }

  // For each user call Gorse
  // If health checks failed, try to discover a working base URL from common candidates
  const recsNormalized = {};
  const candidates = [GORSE_API_URL, `http://localhost:${process.env.GORSE_API_PORT || '8087'}`, `http://localhost:${process.env.GORSE_DASHBOARD_PORT || '8088'}`]
    .filter(Boolean)
    .map(s => s.replace(/\/$/, ''));

  // Remove duplicates while preserving order
  const seen = new Set();
  const uniqCandidates = [];
  for (const c of candidates) {
    if (!seen.has(c)) {
      seen.add(c);
      uniqCandidates.push(c);
    }
  }

  const users = Object.keys(groundTruth);
  let workingBase = GORSE_API_URL;
  if (users.length > 0) {
    const probeUser = users[0];
    for (const base of uniqCandidates) {
      try {
        const probeUrl = `${base}/api/recommend/${encodeURIComponent(probeUser)}?n=1`;
        const res = await fetch(probeUrl, { headers });
        if (res.ok) {
          workingBase = base;
          GORSE_API_URL = base;
          console.log('[Gorse] selected working base URL:', base);
          break;
        }
      } catch {
        // ignore and try next
      }
    }
  }

  for (const userId of users) {
    const recs = await fetchRecommendations(GORSE_API_URL, userId, Math.max(...topKs), headers);
    recsNormalized[userId] = recs.map(i => normalizeItemId(i));
    // small delay to be gentle
    await new Promise(res => setTimeout(res, 100));
  }

  // Evaluate metrics
  const metricsPerK = {};
  for (const kVal of topKs) {
    const precisions = [];
    const recalls = [];
    const ndcgs = [];
    const mrrs = [];

    for (const [userId, relevantSet] of Object.entries(groundTruth)) {
      const recs = recsNormalized[userId] || [];
      precisions.push(precisionAtK(recs, relevantSet, kVal));
      recalls.push(recallAtK(recs, relevantSet, kVal));
      ndcgs.push(ndcgAtK(recs, relevantSet, kVal));
      mrrs.push(reciprocalRank(recs, relevantSet));
    }

    metricsPerK[kVal] = {
      precision: precisions.reduce((s, v) => s + v, 0) / (precisions.length || 1),
      recall: recalls.reduce((s, v) => s + v, 0) / (recalls.length || 1),
      ndcg: ndcgs.reduce((s, v) => s + v, 0) / (ndcgs.length || 1),
      mrr: mrrs.reduce((s, v) => s + v, 0) / (mrrs.length || 1),
    };
  }

  const uniqueRecs = new Set();
  for (const arr of Object.values(recsNormalized)) arr.forEach(i => uniqueRecs.add(i));
  const uniqueGT = new Set();
  for (const s of Object.values(groundTruth)) s.forEach(i => uniqueGT.add(i));
  const coverage = uniqueGT.size === 0 ? 0 : uniqueRecs.size / uniqueGT.size;

  console.log('\n=== Recommendation Evaluation Summary (non-dry-run) ===\n');
  for (const kVal of topKs) {
    const m = metricsPerK[kVal];
    console.log(`K=${kVal}: Precision@${kVal}=${(m.precision * 100).toFixed(2)}%  Recall@${kVal}=${(m.recall * 100).toFixed(2)}%  NDCG@${kVal}=${(m.ndcg * 100).toFixed(2)}%  MRR=${m.mrr.toFixed(4)}`);
  }
  console.log(`\nCoverage (unique recs / unique GT items): ${(coverage * 100).toFixed(2)}%`);
  console.log(`Users evaluated: ${Object.keys(groundTruth).length}`);
  console.log('==========================================\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
