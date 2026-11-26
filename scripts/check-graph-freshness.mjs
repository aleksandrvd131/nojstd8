#!/usr/bin/env node
/**
 * Verifies that graphify-out/ (manifest.json, graph.json, GRAPH_REPORT.md)
 * is present, valid, and up-to-date with every tracked code and doc file.
 *
 * Modes:
 *   default    Checks the working tree on disk (used in CI and `npm run check:graph`).
 *   --staged   Checks the git staging index (used in `.githooks/pre-commit`),
 *              reading staged blobs via `git show :<path>` so unrelated unstaged
 *              WIP edits do not block commits while preventing stale graph commits.
 */
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CODE_EXTENSIONS = new Set([
  '.py', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
  '.go', '.rs', '.java', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
  '.rb', '.swift', '.kt', '.kts', '.cs', '.scala', '.php', '.lua',
  '.sh', '.bash', '.ps1', '.psm1', '.psd1', '.yaml', '.yml', '.json',
  '.sql', '.vue', '.svelte', '.astro', '.dart', '.ex', '.exs', '.erl',
]);

const DOC_EXTENSIONS = new Set([
  '.md', '.mdx', '.txt', '.html', '.rst', '.qmd', '.jinja2', '.j2',
  '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
  '.mp4', '.mp3', '.wav', '.webm', '.ogg', '.mkv', '.mov', '.avi',
]);

const SKIP_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);
const REQUIRED_ARTIFACTS = [
  'graphify-out/manifest.json',
  'graphify-out/graph.json',
  'graphify-out/GRAPH_REPORT.md',
];

const isStagedMode = process.argv.includes('--staged');
const root = process.cwd();

function normalizePath(p) {
  return p.replace(/\\/g, '/').normalize('NFC');
}

function md5Buffer(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

function gitBytes(args) {
  return execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
}

function gitText(args) {
  return gitBytes(args).toString('utf8');
}

function isTrackedGraphifyInput(relPath, readContent) {
  const norm = normalizePath(relPath);
  const base = path.posix.basename(norm);
  if (SKIP_FILES.has(base)) return null;

  if (norm.startsWith('node_modules/') || norm.startsWith('dist/') || norm.startsWith('.git/')) {
    return null;
  }

  if (norm.startsWith('graphify-out/')) {
    if (norm.startsWith('graphify-out/memory/') && norm.endsWith('.md')) {
      return 'doc';
    }
    return null;
  }

  const ext = path.posix.extname(base).toLowerCase();
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (DOC_EXTENSIONS.has(ext)) return 'doc';

  // Graphify also extracts extensionless scripts with a shebang (e.g. .githooks/pre-commit).
  if (!ext) {
    const buf = readContent(norm);
    if (buf && buf.subarray(0, 2).toString('utf8') === '#!') {
      return 'code';
    }
  }

  return null;
}

function listFilesFromDisk(dir = root, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesFromDisk(full, rel));
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

function loadWorkingTreeCorpus() {
  let candidates;
  try {
    const raw = gitText(['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
    candidates = raw.split('\0').filter(Boolean);
  } catch {
    candidates = listFilesFromDisk();
  }

  const readFile = (rel) => {
    const full = path.join(root, rel);
    return fs.existsSync(full) ? fs.readFileSync(full) : null;
  };

  return { candidates, readFile };
}

function loadStagedCorpus() {
  const raw = gitText(['ls-files', '-z', '--stage']);
  const stagedSet = new Set();
  const candidates = [];

  for (const line of raw.split('\0')) {
    if (!line) continue;
    const tabIdx = line.indexOf('\t');
    if (tabIdx === -1) continue;
    const filePath = normalizePath(line.slice(tabIdx + 1));
    if (!stagedSet.has(filePath)) {
      stagedSet.add(filePath);
      candidates.push(filePath);
    }
  }

  const readFile = (rel) => {
    try {
      return gitBytes(['show', `:${rel}`]);
    } catch {
      return null;
    }
  };

  return { candidates, readFile, stagedSet };
}

function main() {
  const errors = [];

  if (isStagedMode) {
    const unstagedGraphFiles = gitText(['diff', '--name-only', '--', 'graphify-out/'])
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const untrackedGraphFiles = gitText([
      'ls-files', '--others', '--exclude-standard', '--',
      'graphify-out/cache/', 'graphify-out/memory/',
    ])
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    const pendingGraphFiles = [...new Set([...unstagedGraphFiles, ...untrackedGraphFiles])];
    if (pendingGraphFiles.length > 0) {
      errors.push(
        `Обновления графа не добавлены в индекс (git add graphify-out/): ${pendingGraphFiles.slice(0, 5).join(', ')}${pendingGraphFiles.length > 5 ? ` (+${pendingGraphFiles.length - 5})` : ''}`
      );
    }
  }

  const { candidates, readFile } = isStagedMode ? loadStagedCorpus() : loadWorkingTreeCorpus();

  for (const artifact of REQUIRED_ARTIFACTS) {
    if (!readFile(artifact)) {
      errors.push(`Отсутствует обязательный артефакт графа: ${artifact}`);
    }
  }

  if (errors.length > 0) {
    reportAndExit(errors);
  }

  let manifest;
  try {
    manifest = JSON.parse(readFile('graphify-out/manifest.json').toString('utf8'));
  } catch (err) {
    reportAndExit([`Не удалось разобрать graphify-out/manifest.json: ${err.message}`]);
  }

  try {
    const graphData = JSON.parse(readFile('graphify-out/graph.json').toString('utf8'));
    if (!Array.isArray(graphData.nodes) || !Array.isArray(graphData.links)) {
      errors.push('graphify-out/graph.json не содержит массивы nodes/links.');
    }
  } catch (err) {
    errors.push(`Не удалось разобрать graphify-out/graph.json: ${err.message}`);
  }

  const normalizedManifest = new Map();
  for (const [key, value] of Object.entries(manifest)) {
    normalizedManifest.set(normalizePath(key), value);
  }

  const seenCorpus = new Set();
  const missingFromManifest = [];
  const staleFiles = [];
  const deletedFiles = [];

  for (const rawPath of candidates) {
    const relPath = normalizePath(rawPath);
    const kind = isTrackedGraphifyInput(relPath, readFile);
    if (!kind) continue;

    seenCorpus.add(relPath);
    const entry = normalizedManifest.get(relPath);
    if (!entry || typeof entry !== 'object') {
      missingFromManifest.push(relPath);
      continue;
    }

    const expectedHash = kind === 'code'
      ? entry.ast_hash
      : (entry.semantic_hash || entry.ast_hash);

    if (!expectedHash) {
      staleFiles.push(`${relPath} (нет хеша в manifest.json)`);
      continue;
    }

    const buf = readFile(relPath);
    if (!buf) {
      staleFiles.push(`${relPath} (не удалось прочитать)`);
      continue;
    }

    const actualHash = md5Buffer(buf);
    if (actualHash !== expectedHash) {
      staleFiles.push(relPath);
    }
  }

  for (const manifestPath of normalizedManifest.keys()) {
    if (!seenCorpus.has(manifestPath)) {
      deletedFiles.push(manifestPath);
    }
  }

  if (missingFromManifest.length > 0) {
    errors.push(`Новые файлы отсутствуют в графе (${missingFromManifest.length}): ${missingFromManifest.join(', ')}`);
  }
  if (staleFiles.length > 0) {
    errors.push(`Изменённые файлы устарели в графе (${staleFiles.length}): ${staleFiles.join(', ')}`);
  }
  if (deletedFiles.length > 0) {
    errors.push(`Удалённые файлы остались в manifest.json (${deletedFiles.length}): ${deletedFiles.join(', ')}`);
  }

  if (errors.length > 0) {
    reportAndExit(errors);
  }

  console.log(`[graphify-check] OK (${seenCorpus.size} файлов проверено, граф актуален).`);
}

function reportAndExit(errors) {
  console.error('\n[graphify-check] Граф проекта устарел или неполный:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  console.error('\nОбновите граф перед коммитом/пушем:');
  console.error('  /graphify . --update   (или `graphify update .` для изменений только в коде)');
  console.error('  git add graphify-out/\n');
  process.exit(1);
}

main();
