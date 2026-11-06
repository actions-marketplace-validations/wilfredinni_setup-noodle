import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const { stdout: version } = await exec('noodle', ['--version']);
assert.equal(version.replace(/\r?\n$/, ''), '0.10.3');
console.log('noodle --version returned 0.10.3');

const collection = await mkdtemp(join(tmpdir(), 'noodle-smoke-'));
let status = 200;
const server = createServer((request, response) => {
  response.writeHead(request.url === '/health' ? status : 404);
  response.end('fixture');
});

try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  await copyFile(new URL('../test/fixtures/api/health.yml', import.meta.url), join(collection, 'health.yml'));
  await mkdir(join(collection, '.environments'));
  await writeFile(join(collection, '.environments', 'ci.env'), `base_url=http://127.0.0.1:${server.address().port}\n`);

  for (const [httpStatus, expectedExit] of [[200, 0], [201, 1]]) {
    status = httpStatus;
    const result = await exec('noodle', ['collection', 'run', collection, '--env', 'ci', '--json'])
      .then(output => ({ ...output, code: 0 }), error => error);
    assert.equal(result.code, expectedExit, result.stderr || result.stdout);
    const [row] = JSON.parse(result.stdout).data.results;
    const [assertion] = row.assertions.results;
    assert.equal(assertion.expression, 'status');
    assert.equal(assertion.actual, httpStatus);
    assert.equal(assertion.passed, expectedExit === 0);
    console.log(`HTTP ${httpStatus}, status assertion ${assertion.passed ? 'passed' : 'failed'}, CLI exit ${expectedExit}`);
  }
} finally {
  server.close();
  await rm(collection, { recursive: true, force: true });
}
