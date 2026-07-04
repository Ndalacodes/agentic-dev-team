// Smoke tests for scripts/install-team.sh — it mutates OTHER people's repos,
// so its two promises get regression tests: (1) the full framework file set
// arrives, (2) existing settings.json / .mcp.json are NEVER clobbered
// (sidecar *.agentic.json files are written instead).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers.mjs';

const SCRIPT = join(REPO_ROOT, 'scripts', 'install-team.sh');

const freshTarget = () => mkdtempSync(join(tmpdir(), 'adt-install-'));
const install = (...args) => spawnSync('bash', [SCRIPT, ...args], { encoding: 'utf8' });

const EXPECTED_FILES = [
  'CLAUDE.md',
  '.claude/hooks/guard-protected-branch.mjs',
  '.claude/hooks/deploy-gate.mjs',
  '.claude/hooks/secret-scan.mjs',
  '.claude/settings.json',
  '.mcp.json',
  'artifacts/README.md',
];

test('fresh install copies the full framework file set', () => {
  const target = freshTarget();
  const r = install(target);
  assert.equal(r.status, 0, r.stderr);
  for (const f of EXPECTED_FILES) {
    assert.ok(existsSync(join(target, f)), `missing after install: ${f}`);
  }
  // settings.json arrives intact and still wires all three gates.
  const settings = JSON.parse(readFileSync(join(target, '.claude/settings.json'), 'utf8'));
  assert.ok(settings.hooks?.PreToolUse?.length >= 2);
});

test('GCP project id argument is substituted into .mcp.json', () => {
  const target = freshTarget();
  const r = install(target, 'test-project-123');
  assert.equal(r.status, 0, r.stderr);
  const mcp = readFileSync(join(target, '.mcp.json'), 'utf8');
  assert.ok(mcp.includes('test-project-123'), 'project id not substituted');
  assert.ok(!mcp.includes('your-gcp-project-id'), 'placeholder left behind');
  assert.ok(!existsSync(join(target, '.mcp.json.bak')), 'sed backup file left behind');
  JSON.parse(mcp); // still valid JSON after sed
});

test('never clobbers existing settings.json / .mcp.json — writes sidecars', () => {
  const target = freshTarget();
  mkdirSync(join(target, '.claude'), { recursive: true });
  writeFileSync(join(target, '.claude/settings.json'), '{"mine": true}');
  writeFileSync(join(target, '.mcp.json'), '{"myServers": true}');

  const r = install(target);
  assert.equal(r.status, 0, r.stderr);

  // Originals byte-identical.
  assert.equal(readFileSync(join(target, '.claude/settings.json'), 'utf8'), '{"mine": true}');
  assert.equal(readFileSync(join(target, '.mcp.json'), 'utf8'), '{"myServers": true}');
  // Framework versions arrive as sidecars for manual merge.
  assert.ok(existsSync(join(target, '.claude/settings.json.agentic.json')));
  assert.ok(existsSync(join(target, '.mcp.json.agentic.json')));
  // And the output tells the operator a manual merge is needed.
  assert.match(r.stdout, /merge manually/);
});

test('installed hooks are runnable copies (byte-identical to source)', () => {
  const target = freshTarget();
  install(target);
  for (const hook of ['guard-protected-branch.mjs', 'deploy-gate.mjs', 'secret-scan.mjs']) {
    assert.equal(
      readFileSync(join(target, '.claude/hooks', hook), 'utf8'),
      readFileSync(join(REPO_ROOT, '.claude/hooks', hook), 'utf8'),
      `${hook} differs from source after install`
    );
  }
});

test('fails loudly when the target directory does not exist', () => {
  const r = install('/nonexistent/definitely-not-a-dir');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Target does not exist/);
});

test('fails with usage when called without arguments', () => {
  const r = install();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /usage/);
});
