#!/usr/bin/env node
// PreToolUse(Bash) safety gate: cloud deploys are irreversible / cost money.
// Per the "Autonomous + Safety Gates" policy, a human must approve a deploy.
// Blocks (exit 2) unless DEPLOY_APPROVED=1 is set in the environment by the operator.

const DEPLOY_PATTERNS = [
  /\bgcloud\s+run\s+deploy\b/,
  /\bgcloud\s+functions\s+deploy\b/,
  /\bgcloud\s+app\s+deploy\b/,
  /\bgcloud\s+builds\s+submit\b/,
  /\bfirebase\s+deploy\b/,
  /\bvercel\s+(deploy\s+)?--prod\b/,
  /\bnetlify\s+deploy\b.*--prod\b/,
  /\bterraform\s+apply\b/,
  /\bkubectl\s+apply\b/,
  /\b(npm|pnpm|yarn)\s+run\s+deploy\b/,
];

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let cmd = '';
  try { cmd = JSON.parse(input || '{}')?.tool_input?.command || ''; } catch {}
  if (!cmd) process.exit(0);

  const lower = cmd.toLowerCase();
  const matched = DEPLOY_PATTERNS.find((re) => re.test(lower));
  if (!matched) process.exit(0);

  if (process.env.DEPLOY_APPROVED === '1') process.exit(0); // operator approved this session

  process.stderr.write(
    `🚀 DEPLOY GATE — human approval required\n` +
    `This command deploys/spends and is hard to undo:\n  ${cmd}\n` +
    `Stop and ask the operator to confirm. After explicit approval, re-run with the\n` +
    `environment variable DEPLOY_APPROVED=1 set. Do NOT set it on the agent's behalf.\n`
  );
  process.exit(2);
});
