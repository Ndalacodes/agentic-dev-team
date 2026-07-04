// Configuration-integrity checks. The worst failure mode in this repo is a
// silently broken config: a typo'd hook path in settings.json disables all
// three safety gates without any error. These tests make that impossible to
// merge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from './helpers.mjs';

// ------------------------------------------------ settings.json → hooks wiring

test('settings.json parses and wires every safety-gate hook to a real file', () => {
  const settings = JSON.parse(readFileSync(join(REPO_ROOT, '.claude', 'settings.json'), 'utf8'));
  const groups = settings.hooks?.PreToolUse;
  assert.ok(Array.isArray(groups) && groups.length > 0, 'PreToolUse hooks must be configured');

  const commands = groups.flatMap((g) => g.hooks.map((h) => h.command));
  for (const command of commands) {
    const m = command.match(/\$CLAUDE_PROJECT_DIR\/([^"']+)/);
    assert.ok(m, `hook command should reference $CLAUDE_PROJECT_DIR: ${command}`);
    const hookPath = join(REPO_ROOT, m[1]);
    assert.ok(existsSync(hookPath), `hook file missing: ${m[1]}`);
  }

  // The three gates the manual promises (§4) must all be wired.
  const joined = commands.join(' ');
  for (const gate of ['guard-protected-branch.mjs', 'deploy-gate.mjs', 'secret-scan.mjs']) {
    assert.ok(joined.includes(gate), `safety gate not wired in settings.json: ${gate}`);
  }

  const matchers = groups.map((g) => g.matcher);
  assert.ok(matchers.includes('Bash'), 'Bash matcher missing (branch + deploy gates)');
  assert.ok(
    matchers.some((m) => m.includes('Write') && m.includes('Edit')),
    'Write/Edit matcher missing (secret gate)'
  );
});

test('every hook file is syntactically valid Node (node --check)', () => {
  const hooksDir = join(REPO_ROOT, '.claude', 'hooks');
  for (const f of readdirSync(hooksDir).filter((f) => f.endsWith('.mjs'))) {
    const r = spawnSync(process.execPath, ['--check', join(hooksDir, f)], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${f} failed syntax check:\n${r.stderr}`);
  }
});

// --------------------------------------------------- agent / command frontmatter

function frontmatter(path) {
  const text = readFileSync(path, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

test('every agent has valid frontmatter with a name matching its filename', () => {
  const dir = join(REPO_ROOT, '.claude', 'agents');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.ok(files.length >= 12, `expected the full team, found ${files.length} agents`);
  for (const f of files) {
    const fm = frontmatter(join(dir, f));
    assert.ok(fm, `${f}: missing or unterminated --- frontmatter block`);
    const name = fm.match(/^name:\s*(\S+)/m)?.[1];
    assert.equal(name, f.replace(/\.md$/, ''), `${f}: frontmatter name must match filename`);
    assert.match(fm, /^description:\s*\S/m, `${f}: description is required`);
    assert.match(fm, /^model:\s*\S/m, `${f}: model is required`);
  }
});

test('every command has valid frontmatter with a description', () => {
  const dir = join(REPO_ROOT, '.claude', 'commands');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  assert.ok(files.length >= 4, 'expected /ship, /audit, /release, /insights');
  for (const f of files) {
    const fm = frontmatter(join(dir, f));
    assert.ok(fm, `${f}: missing or unterminated --- frontmatter block`);
    assert.match(fm, /^description:\s*\S/m, `${f}: description is required`);
  }
});

test('production-auditor stays read-only (no Write/Edit in its tools)', () => {
  // CLAUDE.md §1: the auditor must not be able to "fix" what it grades.
  const fm = frontmatter(join(REPO_ROOT, '.claude', 'agents', 'production-auditor.md'));
  const tools = fm.match(/^tools:\s*(.+)$/m)?.[1];
  assert.ok(tools, 'production-auditor must declare an explicit tools list');
  const list = tools.split(',').map((t) => t.trim());
  assert.ok(!list.includes('Write'), 'auditor must not have Write');
  assert.ok(!list.includes('Edit'), 'auditor must not have Edit');
});

// ------------------------------------------- artifact handoff contract (CLAUDE.md §3)

// Each persona's prompt must reference the artifact filenames it reads/writes
// per the CLAUDE.md §1 table — a rename in one file must not silently
// desynchronize the handoff chain.
const HANDOFF = {
  'product-manager.md': ['00-brief.md', '01-prd.md', 'wireframe.html'],
  'design-inspiration.md': ['01-prd.md', '02-inspiration.md'],
  'ux-developer.md': ['01-prd.md', '02-inspiration.md', '02-design-spec.md'],
  'software-engineer.md': ['02-design-spec.md', '03-architecture.md'],
  'api-engineer.md': ['03-architecture.md', '03a-api'],
  'pipeline-engineer.md': ['03-architecture.md', '03b-pipeline'],
  'dashboard-engineer.md': ['03-architecture.md', '03c-dashboard'],
  'production-auditor.md': ['04-audit-report.md'],
  'security-engineer.md': ['04-audit-report.md', '05-security-report.md'],
  'release-manager.md': ['05-security-report.md', '06-release.md'],
  'growth-marketer.md': ['07-insights.md', '00-brief.md'],
};

test('agent prompts reference their contracted artifacts (handoff chain intact)', () => {
  for (const [file, artifacts] of Object.entries(HANDOFF)) {
    const text = readFileSync(join(REPO_ROOT, '.claude', 'agents', file), 'utf8');
    for (const artifact of artifacts) {
      assert.ok(text.includes(artifact), `${file} no longer mentions ${artifact}`);
    }
  }
});

test('CLAUDE.md and the agent roster agree on the artifact chain', () => {
  const manual = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
  const everyArtifact = new Set(Object.values(HANDOFF).flat());
  for (const artifact of everyArtifact) {
    assert.ok(manual.includes(artifact), `CLAUDE.md no longer mentions ${artifact}`);
  }
});

// --------------------------------------------------------------- shell scripts

test('shell scripts pass bash -n (syntax)', () => {
  const dir = join(REPO_ROOT, 'scripts');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sh'))) {
    const r = spawnSync('bash', ['-n', join(dir, f)], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${f} failed bash -n:\n${r.stderr}`);
  }
});

test('branch-protection ruleset JSON is valid and protects main + staging', () => {
  // Extract the body() heredoc function from the script and render it the way
  // the script would, then validate the JSON payload sent to the GitHub API.
  const script = readFileSync(join(REPO_ROOT, 'scripts', 'setup-branch-protection.sh'), 'utf8');
  // The function body is a heredoc terminated by a JSON line, then the
  // function's closing brace — match through both.
  const fn = script.match(/^body\(\) \{[\s\S]*?^JSON\n\}/m)?.[0];
  assert.ok(fn, 'body() function not found in setup-branch-protection.sh');

  const r = spawnSync('bash', ['-c', `NAME="agentic-dev-team-protect"; REVIEWS=2; ${fn}; body`], {
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);

  const ruleset = JSON.parse(r.stdout);
  assert.equal(ruleset.target, 'branch');
  assert.equal(ruleset.enforcement, 'active');
  assert.deepEqual(
    ruleset.conditions.ref_name.include.sort(),
    ['refs/heads/main', 'refs/heads/staging'],
    'must protect exactly main and staging'
  );
  const types = ruleset.rules.map((rule) => rule.type).sort();
  assert.deepEqual(types, ['deletion', 'non_fast_forward', 'pull_request']);
  const pr = ruleset.rules.find((rule) => rule.type === 'pull_request');
  assert.equal(pr.parameters.required_approving_review_count, 2, 'REVIEWS must flow through');
  assert.equal(pr.parameters.dismiss_stale_reviews_on_push, true);
});
