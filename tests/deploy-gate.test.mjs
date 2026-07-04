// Tests for .claude/hooks/deploy-gate.mjs — the "human must approve a deploy"
// gate. must-block: every deploy/spend command pattern. must-allow: everyday
// build/inspect commands, and deploys after explicit operator approval.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHook, bashPayload, ALLOW, BLOCK } from './helpers.mjs';

const HOOK = 'deploy-gate.mjs';
// Never inherit an approval from the environment running the tests.
const run = (cmd, env = {}) =>
  runHook(HOOK, bashPayload(cmd), { env: { DEPLOY_APPROVED: '', ...env } });

// ---------------------------------------------------------------- must-block

const DEPLOY_COMMANDS = [
  'gcloud run deploy my-api --region us-central1',
  'gcloud functions deploy ingest --runtime nodejs22',
  'gcloud app deploy',
  'gcloud builds submit --tag gcr.io/p/i',
  'firebase deploy --only hosting',
  'vercel --prod',
  'vercel deploy --prod',
  'netlify deploy --dir dist --prod',
  'terraform apply -auto-approve',
  'kubectl apply -f k8s/',
  'npm run deploy',
  'pnpm run deploy',
  'yarn run deploy',
];

for (const cmd of DEPLOY_COMMANDS) {
  test(`blocks without approval: ${cmd}`, () => {
    const r = run(cmd);
    assert.equal(r.code, BLOCK);
    assert.match(r.stderr, /DEPLOY GATE/);
    assert.match(r.stderr, /DEPLOY_APPROVED=1/); // tells the agent the unlock protocol
  });
}

test('blocks: deploy hidden in a chained command', () => {
  assert.equal(run('npm run build && firebase deploy').code, BLOCK);
});

test('blocks: matching is case-insensitive', () => {
  assert.equal(run('Firebase Deploy').code, BLOCK);
});

test('blocks: DEPLOY_APPROVED must be exactly "1" — "true" does not unlock', () => {
  assert.equal(run('firebase deploy', { DEPLOY_APPROVED: 'true' }).code, BLOCK);
});

// ---------------------------------------------------------------- must-allow

test('allows: deploy with explicit operator approval (DEPLOY_APPROVED=1)', () => {
  assert.equal(run('gcloud run deploy my-api', { DEPLOY_APPROVED: '1' }).code, ALLOW);
});

const SAFE_COMMANDS = [
  'gcloud run services list',
  'gcloud run services describe my-api',
  'terraform plan',
  'terraform validate',
  'kubectl get pods',
  'kubectl diff -f k8s/',
  'npm run build',
  'firebase emulators:start',
  'vercel dev',
  'git push origin feature/x',
];

for (const cmd of SAFE_COMMANDS) {
  test(`allows: ${cmd}`, () => {
    assert.equal(run(cmd).code, ALLOW);
  });
}

test('allows: empty command / invalid JSON (fails open by design)', () => {
  assert.equal(runHook(HOOK, { tool_input: {} }, { env: { DEPLOY_APPROVED: '' } }).code, ALLOW);
  assert.equal(runHook(HOOK, '{{nope', { env: { DEPLOY_APPROVED: '' } }).code, ALLOW);
});

// -------------------------------------------- characterization (accepted behavior)

test('characterization: a deploy string inside quotes/echo still trips the gate', () => {
  // The hook matches text, not intent — an over-block here is the safe failure
  // mode, and this test makes that trade-off explicit.
  assert.equal(run('echo "run firebase deploy to ship"').code, BLOCK);
});
