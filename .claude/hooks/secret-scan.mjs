#!/usr/bin/env node
// PreToolUse(Write|Edit|MultiEdit) safety gate: never write hard-coded secrets to disk.
// Scans the content being written for high-signal secret material and blocks (exit 2).
// Conservative patterns only — low false-positive. Use env vars / Secret Manager instead.

const SECRETS = [
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, 'private key block'],
  [/"type"\s*:\s*"service_account"/, 'GCP service-account JSON'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
  [/AIza[0-9A-Za-z\-_]{35}/, 'Google API key'],
  [/xox[baprs]-[0-9A-Za-z-]{10,}/, 'Slack token'],
  [/gh[pousr]_[0-9A-Za-z]{36,}/, 'GitHub token'],
  [/sk-(?:live|test|proj)?-?[0-9A-Za-z]{20,}/, 'API secret key (sk-…)'],
  [/-----BEGIN PRIVATE KEY-----/, 'PEM private key'],
];

function textFrom(input) {
  if (!input || typeof input !== 'object') return '';
  const parts = [input.content, input.new_string, input.replacement];
  if (Array.isArray(input.edits)) {
    for (const e of input.edits) parts.push(e?.new_string);
  }
  return parts.filter(Boolean).join('\n');
}

let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (stdin += c));
process.stdin.on('end', () => {
  let data = {};
  try { data = JSON.parse(stdin || '{}'); } catch {}
  const text = textFrom(data.tool_input);
  if (!text) process.exit(0);

  for (const [re, label] of SECRETS) {
    if (re.test(text)) {
      process.stderr.write(
        `🔐 SECRET GATE\nBlocked: this write contains a ${label}.\n` +
        `Never commit secrets. Move it to an env var or a secret manager and reference it.\n`
      );
      process.exit(2);
    }
  }
  process.exit(0);
});
