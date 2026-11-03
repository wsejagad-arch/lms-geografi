#!/usr/bin/env node
// context-digest.mjs — pintasan digest repo (dipakai protokol hemat token).
// Jalankan: node scripts/context-digest.mjs [--json]
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = [path.join(here, 'ctx.mjs'), 'digest', ...process.argv.slice(2)];
const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(r.status ?? 0);
