import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const thresholdMs = 40_000;

function runBuild() {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'build:weapp'],
      {
        cwd: projectRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });

    child.on('close', (code, signal) => {
      resolve({
        code,
        signal,
        durationMs: Date.now() - startedAt,
        output,
      });
    });
  });
}

const result = await runBuild();
assert.equal(result.signal, null, `build:weapp terminated by signal ${result.signal}`);
assert.equal(result.code, 0, `build:weapp failed with exit code ${result.code}`);
assert.ok(result.durationMs < thresholdMs, `build:weapp exceeded performance budget: ${result.durationMs}/${thresholdMs}ms`);

const transformedModules = Number(result.output.match(/(\d+)\s+modules transformed/)?.[1] || 0);
assert.ok(transformedModules > 0, 'build:weapp output did not include transformed module count');

console.log('build performance checks passed');
console.log(`durationMs: ${result.durationMs}/${thresholdMs}`);
console.log(`transformedModules: ${transformedModules}`);
