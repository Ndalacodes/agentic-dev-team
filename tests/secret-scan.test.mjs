// Tests for .claude/hooks/secret-scan.mjs — the "never write secrets to disk"
// gate. One must-block case per secret pattern, plus near-miss negatives so
// the gate stays low-false-positive (its own design goal).
//
// NOTE: every fake secret is ASSEMBLED AT RUNTIME (string concat) so that this
// test file itself never contains a literal that would trip the live hook when
// this file is written/edited, or trip GitHub secret scanning.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHook, ALLOW, BLOCK } from './helpers.mjs';

const HOOK = 'secret-scan.mjs';

const writePayload = (content) => ({ tool_name: 'Write', tool_input: { file_path: '/tmp/x', content } });
const editPayload = (new_string) => ({ tool_name: 'Edit', tool_input: { file_path: '/tmp/x', old_string: 'a', new_string } });

const A = (n) => 'A'.repeat(n);
const dashes = '-'.repeat(5);

// [label from the hook's message, runtime-assembled secret]
const SECRETS = [
  ['AWS access key id', 'AK' + 'IA' + 'B7'.repeat(8)],
  ['Google API key', 'AI' + 'za' + 'SyB' + A(32)],
  ['Slack token', 'xo' + 'xb-' + '1234567890-abcdef'],
  ['GitHub token', 'gh' + 'p_' + A(36)],
  ['API secret key (sk-…)', 'sk-' + 'live-' + 'a1'.repeat(12)],
  ['private key block', dashes + 'BEGIN RSA PRIVATE KEY' + dashes],
  // The hook's dedicated 'PEM private key' pattern is shadowed by the broader
  // 'private key block' pattern above it (optional key-type group) — first
  // match wins, so a bare PEM header reports as 'private key block' too.
  ['private key block', dashes + 'BEGIN PRIVATE KEY' + dashes],
  ['GCP service-account JSON', '{ "type": "service_' + 'account", "project_id": "p" }'],
];

// ---------------------------------------------------------------- must-block

for (const [label, secret] of SECRETS) {
  test(`blocks Write containing a ${label}`, () => {
    const r = runHook(HOOK, writePayload(`const key = "${secret}";`));
    assert.equal(r.code, BLOCK);
    assert.match(r.stderr, /SECRET GATE/);
    assert.ok(r.stderr.includes(label), `stderr should name the "${label}" pattern`);
  });
}

test('blocks Edit whose new_string contains a secret', () => {
  const key = 'AK' + 'IA' + 'C3'.repeat(8);
  assert.equal(runHook(HOOK, editPayload(`key=${key}`)).code, BLOCK);
});

test('blocks MultiEdit when any edit in the array contains a secret', () => {
  const key = 'gh' + 'o_' + A(40);
  const payload = {
    tool_name: 'MultiEdit',
    tool_input: {
      file_path: '/tmp/x',
      edits: [
        { old_string: 'a', new_string: 'clean' },
        { old_string: 'b', new_string: `token: ${key}` },
      ],
    },
  };
  assert.equal(runHook(HOOK, payload).code, BLOCK);
});

// ------------------------------------------------------- must-allow (near misses)

const CLEAN_SNIPPETS = [
  ['env-var reference instead of a literal', 'const key = process.env.STRIPE_SECRET_KEY;'],
  ['AWS-key prefix too short', 'AK' + 'IA' + 'B7'.repeat(4)],
  ['Google-key prefix too short', 'AI' + 'za' + 'SyB123'],
  ['prose mentioning key formats', 'Keys like AK' + 'IA… and AI' + 'za… must never be committed.'],
  ['PEM public key (not private)', dashes + 'BEGIN PUBLIC KEY' + dashes],
  ['service_account as a bare word', 'roles allowed: service_' + 'account, user, admin'],
  ['sk- with too few characters', 'sk-' + 'test-' + 'abc123'],
  ['markdown docs about secret hygiene', '# Secrets\nUse Secret Manager. Never hard-code credentials.'],
];

for (const [label, text] of CLEAN_SNIPPETS) {
  test(`allows: ${label}`, () => {
    assert.equal(runHook(HOOK, writePayload(text)).code, ALLOW);
  });
}

test('allows: empty content / missing tool_input / invalid JSON (fails open)', () => {
  assert.equal(runHook(HOOK, writePayload('')).code, ALLOW);
  assert.equal(runHook(HOOK, { tool_name: 'Write', tool_input: {} }).code, ALLOW);
  assert.equal(runHook(HOOK, 'not-json').code, ALLOW);
});

// -------------------------------------------- characterization (accepted behavior)

test('characterization: only text being WRITTEN is scanned (old_string is not)', () => {
  // Removing a secret from a file sends it as old_string — that must stay
  // allowed, otherwise the hook would block its own cleanup.
  const key = 'AK' + 'IA' + 'D4'.repeat(8);
  const payload = {
    tool_name: 'Edit',
    tool_input: { file_path: '/tmp/x', old_string: `key=${key}`, new_string: 'key=process.env.KEY' },
  };
  assert.equal(runHook(HOOK, payload).code, ALLOW);
});
