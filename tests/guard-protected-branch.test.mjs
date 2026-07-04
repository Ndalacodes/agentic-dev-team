// Tests for .claude/hooks/guard-protected-branch.mjs — the "never push to a
// protected branch" gate. Two directions matter equally:
//   must-block  — a push that lands on main/master/staging/production/prod
//   must-allow  — legitimate feature-branch pushes (agents must not get stuck)
//
// Tests marked { todo: true } document KNOWN BUGS in the current hook: they
// assert the *correct* behavior, fail today, and do not fail the suite. When
// the hook is fixed, drop the todo flag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHook, bashPayload, tempGitRepo, ALLOW, BLOCK } from './helpers.mjs';

const HOOK = 'guard-protected-branch.mjs';
const run = (cmd, opts) => runHook(HOOK, bashPayload(cmd), opts);

// A stable cwd for push commands that name an explicit non-protected branch:
// a repo sitting on a feature branch, so the current-branch fallback is inert.
const featureRepo = tempGitRepo('feature/test');
const mainRepo = tempGitRepo('main');

// ---------------------------------------------------------------- must-block

for (const branch of ['main', 'master', 'staging', 'production', 'prod']) {
  test(`blocks: git push origin ${branch}`, () => {
    const r = run(`git push origin ${branch}`);
    assert.equal(r.code, BLOCK);
    assert.match(r.stderr, /PROTECTED BRANCH GATE/);
  });
}

test('blocks: git push -u origin main', () => {
  assert.equal(run('git push -u origin main').code, BLOCK);
});

test('blocks: refspec destination — git push origin HEAD:main', () => {
  assert.equal(run('git push origin HEAD:main').code, BLOCK);
});

test('blocks: refspec destination — git push origin feature/x:staging', () => {
  assert.equal(run('git push origin feature/x:staging').code, BLOCK);
});

test('blocks: remote branch deletion — git push origin :main', () => {
  assert.equal(run('git push origin :main').code, BLOCK);
});

test('blocks: force push — git push --force origin feature/x', () => {
  const r = run('git push --force origin feature/x');
  assert.equal(r.code, BLOCK);
  assert.match(r.stderr, /force-push/);
});

test('blocks: force push — git push -f origin feature/x', () => {
  assert.equal(run('git push -f origin feature/x').code, BLOCK);
});

test('blocks: force push — git push --force-with-lease origin feature/x', () => {
  assert.equal(run('git push --force-with-lease origin feature/x').code, BLOCK);
});

test('blocks: push hidden in a chained command (&&)', () => {
  assert.equal(run('npm test && git push origin main').code, BLOCK);
});

test('blocks: push hidden after a semicolon', () => {
  assert.equal(run('echo done; git push origin staging').code, BLOCK);
});

test('blocks: push behind a single & (backgrounding)', () => {
  assert.equal(run('true & git push origin main', { cwd: featureRepo }).code, BLOCK);
});

test('blocks: bare "git push" while sitting on main (current-branch check)', () => {
  const r = run('git push', { cwd: mainRepo });
  assert.equal(r.code, BLOCK);
  assert.match(r.stderr, /protected branch "main"/);
});

test('blocks: bare "git push -u origin" while sitting on main', () => {
  assert.equal(run('git push -u origin', { cwd: mainRepo }).code, BLOCK);
});

// ---------------------------------------------------------------- must-allow

test('allows: non-push git commands', () => {
  assert.equal(run('git status && git log --oneline', { cwd: mainRepo }).code, ALLOW);
});

test('allows: git push origin dev (integration branch is not protected)', () => {
  assert.equal(run('git push origin dev', { cwd: featureRepo }).code, ALLOW);
});

test('allows: git push origin feature/my-thing', () => {
  assert.equal(run('git push origin feature/my-thing', { cwd: featureRepo }).code, ALLOW);
});

test('allows: bare "git push" on a feature branch', () => {
  assert.equal(run('git push', { cwd: featureRepo }).code, ALLOW);
});

test('allows: mentioning main without pushing to it (git checkout main)', () => {
  assert.equal(run('git checkout main', { cwd: featureRepo }).code, ALLOW);
});

test('allows: empty command / missing tool_input', () => {
  assert.equal(runHook(HOOK, { tool_name: 'Bash', tool_input: {} }).code, ALLOW);
});

test('allows: invalid JSON on stdin (fails open by design)', () => {
  assert.equal(runHook(HOOK, 'not json{{').code, ALLOW);
});

// ------------------------------------------------- known bugs (todo = fails today)

test(
  'BUG(false positive): explicit feature push while cwd is on main is blocked',
  { todo: 'guard-protected-branch.mjs:46 bare-push regex matches explicit-branch pushes' },
  () => {
    // `git push origin feature/x` pushes feature/x — the current branch is
    // irrelevant, so this must be allowed even when sitting on main.
    assert.equal(run('git push -u origin feature/x', { cwd: mainRepo }).code, ALLOW);
  }
);

test(
  'BUG(false positive): branch name containing a protected word is blocked',
  { todo: '"/" counts as a boundary before "main", so fix/main matches' },
  () => {
    assert.equal(run('git push origin fix/main', { cwd: featureRepo }).code, ALLOW);
  }
);

test(
  'BUG(false positive): protected branch as refspec SOURCE is blocked',
  { todo: 'hook does not distinguish src from dst in a refspec' },
  () => {
    // main:feature/backup writes to feature/backup on the remote — safe.
    assert.equal(run('git push origin main:feature/backup', { cwd: featureRepo }).code, ALLOW);
  }
);

test(
  'BUG(bypass): quoting the branch name evades the gate',
  { todo: 'boundary regex treats a double quote as a non-boundary char' },
  () => {
    assert.equal(run('git push origin "main"', { cwd: featureRepo }).code, BLOCK);
  }
);

test(
  'BUG(bypass): push wrapped in bash -c evades the gate',
  { todo: 'quoted sub-commands are not inspected' },
  () => {
    assert.equal(run('bash -c "git push origin main"', { cwd: featureRepo }).code, BLOCK);
  }
);

