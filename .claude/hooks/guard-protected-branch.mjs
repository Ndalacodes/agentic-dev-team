#!/usr/bin/env node
// PreToolUse(Bash) safety gate: never push directly to a protected branch.
// Enforces the branching strategy — feature → dev → staging → main, via PR.
// Blocks the tool call (exit 2) and tells Claude to use a feature branch + PR.
import { execSync } from 'node:child_process';

const PROTECTED = ['main', 'master', 'staging', 'production', 'prod'];

function block(msg) {
  process.stderr.write(
    `🚫 PROTECTED BRANCH GATE\n${msg}\n` +
    `Branching rule: build on feature/<slug>, then open a PR (feature → dev → staging → main).\n` +
    `staging/main are protected — promote via reviewed PR, never a direct push.\n`
  );
  process.exit(2);
}

function currentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch { return null; }
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let cmd = '';
  try { cmd = JSON.parse(input || '{}')?.tool_input?.command || ''; } catch {}
  if (!cmd) process.exit(0);

  for (const seg of cmd.split(/&&|\|\||;|\n/)) {
    const s = seg.trim();
    const lower = s.toLowerCase();
    if (!/\bgit\s+push\b/.test(lower)) continue;

    const hitsProtected = PROTECTED.some((b) =>
      new RegExp(`(^|[\\s:/])${b}(\\s|$|:)`).test(lower));
    const isForce = /(--force(-with-lease)?|\s-f(\s|$))/.test(lower);

    if (hitsProtected) block(`Blocked: "git push" targets a protected branch.`);
    if (isForce) block(`Blocked: force-push is not allowed (history rewrite risk).`);

    // Bare "git push" (no explicit branch) pushes the current branch — block if it's protected.
    if (/^git\s+push(\s+(-u|--set-upstream|origin|[a-z0-9._/-]+))*\s*$/i.test(s)) {
      const cur = currentBranch();
      if (cur && PROTECTED.includes(cur)) {
        block(`Blocked: you are on protected branch "${cur}".`);
      }
    }
  }
  process.exit(0);
});
