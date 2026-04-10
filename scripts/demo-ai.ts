/**
 * Demo AI script
 *
 * Usage:
 *   node node_modules/ts-node/dist/bin.js --compiler-options "{\"module\":\"CommonJS\"}" scripts/demo-ai.ts "Title" "Author" --language=en --maxLength=150 [--dry-run]
 *
 * Example:
 *   node node_modules/ts-node/dist/bin.js --compiler-options "{\"module\":\"CommonJS\"}" scripts/demo-ai.ts "The Hobbit" "J.R.R. Tolkien" --language=en --maxLength=150 --dry-run
 */

import { config } from 'dotenv';
config();

import { resolve } from 'path';
import { register } from 'tsconfig-paths';

register({
  baseUrl: resolve(__dirname, '..'),
  paths: {
    '@/*': ['./src/*'],
  },
});

import { GeminiService } from '../src/services/gemini.service';
import { embeddingService } from '../src/services/ollamaEmbedding.service';
import { ollamaSummaryService } from '../src/services/ollamaSummary.service';

const rawArgs = process.argv.slice(2);

if (rawArgs.length === 0) {
  console.log('Usage: scripts/demo-ai.ts "Title" "Author" [--language=vi|en] [--maxLength=200] [--dry-run]');
}

const title = rawArgs[0] || 'Example Book Title';
const author = rawArgs[1] || 'Unknown Author';

let language: 'vi' | 'en' = 'en';
let maxLength = 150;
let dryRun = false;

for (const arg of rawArgs.slice(2)) {
  if (arg.startsWith('--language=')) {
    const v = arg.split('=')[1];
    if (v === 'vi' || v === 'en') language = v;
  } else if (arg.startsWith('--maxLength=')) {
    const n = Number(arg.split('=')[1]);
    if (!Number.isNaN(n)) maxLength = n;
  } else if (arg === '--dry-run') {
    dryRun = true;
  }
}

async function main() {
  console.log(
    `[DemoAI] Title="${title}" Author="${author}" language=${language} maxLength=${maxLength} dryRun=${dryRun}`
  );

  try {
    if (GeminiService.isConfigured()) {
      console.log('[DemoAI] Gemini is configured — will attempt Gemini generation.');
      if (!dryRun) {
        const res = await GeminiService.generateBookSummary({ title, author }, { language, maxLength });
        if (res.success) {
          console.log('\n[DemoAI] Gemini summary:\n');
          console.log(res.summary);
        } else {
          console.error('[DemoAI] Gemini error:', res.error);
        }
      }
    } else {
      console.log('[DemoAI] Gemini not configured — checking Ollama availability...');
      const available = await ollamaSummaryService.isAvailable();
      console.log('[DemoAI] Ollama available:', available);
      if (available && !dryRun) {
        const res = await ollamaSummaryService.generateBookSummary({ title, author }, { language, maxLength });
        if (res.success) {
          console.log('\n[DemoAI] Ollama summary:\n');
          console.log(res.summary);
        } else {
          console.error('[DemoAI] Ollama error:', res.error);
        }
      }
    }

    if (!dryRun) {
      try {
        const sampleText = `${title} ${author}`;
        const vector = await embeddingService.generateVector(sampleText);
        console.log(`[DemoAI] Embedding length: ${vector.length}`);
        console.log(`[DemoAI] Embedding sample (first 8): ${vector.slice(0, 8).join(', ')}`);
      } catch (err) {
        console.error('[DemoAI] Embedding failed:', err instanceof Error ? err.message : err);
      }
    } else {
      console.log('[DemoAI] Dry run: skipped generation and embedding.');
    }
  } catch (error) {
    console.error('[DemoAI] Unexpected error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[DemoAI] Fatal error:', err);
    process.exit(1);
  });
