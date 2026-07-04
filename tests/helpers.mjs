// Shared helpers for exercising the PreToolUse hooks: each hook is a small
// stdin→exit-code program, so we spawn it with a JSON payload and assert on
// the exit code (0 = allow, 2 = block) and stderr.
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const HOOKS_DIR = join(REPO_ROOT, '.claude', 'hooks');

export const ALLOW = 0;
export const BLOCK = 2;

/** Run a hook with the given payload (object or raw string) on stdin. */
export function runHook(hookFile, payload, { cwd, env } = {}) {
  const res = spawnSync(process.execPath, [join(HOOKS_DIR, hookFile)], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    cwd,
    env: { ...process.env, ...env },
  });
  return { code: res.status, stderr: res.stderr ?? '', stdout: res.stdout ?? '' };
}

/** Payload shape the Bash PreToolUse hooks receive. */
export const bashPayload = (command) => ({ tool_name: 'Bash', tool_input: { command } });

/** Create a throwaway git repo checked out on the given branch. */
export function tempGitRepo(branch) {
  const dir = mkdtempSync(join(tmpdir(), 'adt-hook-test-'));
  const git = (args) =>
    spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git(['init', '-b', branch]);
  git(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--allow-empty', '-m', 'init']);
  return dir;
}
