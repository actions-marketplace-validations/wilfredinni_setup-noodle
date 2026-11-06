const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { mkdtemp, readFile, readdir, rm, stat, writeFile } = require('node:fs/promises');
const { EOL, tmpdir } = require('node:os');
const { basename, dirname, join } = require('node:path');
const test = require('node:test');
const { install } = require('../src/install');

const bytes = Buffer.from([0x00, 0xff, 0x0a, 0x80]);
const digest = createHash('sha256').update(bytes).digest('hex');
const version = 'v3.12.0';
const release = `https://github.com/wilfredinni/noodle/releases/download/${version}`;
const linux = 'noodle-linux-x86_64';

async function runner(t) {
  const temp = await mkdtemp(join(tmpdir(), 'noodle-test-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const path = join(temp, 'github_path');
  await writeFile(path, 'previous' + EOL);
  return { INPUT_VERSION: version, RUNNER_TEMP: temp, GITHUB_PATH: path };
}

for (const [platform, arch, asset, filename] of [
  ['linux', 'x64', linux, 'noodle'],
  ['linux', 'arm64', 'noodle-linux-arm64', 'noodle'],
  ['darwin', 'x64', 'noodle-macos-x86_64', 'noodle'],
  ['darwin', 'arm64', 'noodle-macos-arm64', 'noodle'],
  ['win32', 'x64', 'noodle-windows-x86_64.exe', 'noodle.exe'],
]) {
  test(`installs the verified ${platform}-${arch} asset into a fresh directory`, async t => {
    const env = await runner(t);
    const fetch = t.mock.method(globalThis, 'fetch', async url => {
      if (url === `${release}/SHA256SUMS`) {
        return new Response(`${digest}  ${asset}.other\r\n${digest.toUpperCase()} *${asset}\r\n`);
      }
      assert.equal(url, `${release}/${asset}`);
      return new Response(bytes);
    });
    await install(env, platform, arch);
    await install(env, platform, arch);
    assert.equal(fetch.mock.callCount(), 4);

    const lines = (await readFile(env.GITHUB_PATH, 'utf8')).split(EOL);
    assert.equal(lines.length, 4);
    const [previous, first, second, end] = lines;
    assert.equal(previous, 'previous');
    assert.equal(end, '');
    assert.notEqual(first, second);
    for (const directory of [first, second]) {
      assert.equal(dirname(directory), env.RUNNER_TEMP);
      assert.deepEqual(await readdir(directory), [filename]);
      const binary = join(directory, filename);
      assert.deepEqual(await readFile(binary), bytes);
      if (process.platform !== 'win32' && platform !== 'win32') {
        assert.ok((await stat(binary)).mode & 0o100);
      }
    }
  });
}

test('rejects missing, floating, malformed and unsafe versions before fetching', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('unexpected download'));
  for (const value of [undefined, '', 'latest', 'v1', '1.2.3', 'v1.2', 'v01.2.3', 'v1.02.3',
    'v1.2.03', 'v1.2.3-rc.1', 'v1.2.3+build', '../v1.2.3', 'v1.2.3/asset',
    ' v1.2.3', 'v1.2.3 ', 'v1.2.3\n']) {
    await assert.rejects(install({ INPUT_VERSION: value }, 'linux', 'x64'), /exact stable/);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test('rejects unsupported OS and architecture pairs before fetching', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('unexpected download'));
  for (const [os, arch] of [['win32', 'arm64'], ['linux', 'ia32'], ['freebsd', 'x64']]) {
    await assert.rejects(install({ INPUT_VERSION: version }, os, arch), /Unsupported/);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

const entry = `${digest}  ${linux}\n`;
for (const [reason, manifest, binary, error] of [
  ['manifest HTTP error', () => new Response(null, { status: 404 }), null, /HTTP 404/],
  ['missing entry', () => new Response(`${digest}  ${linux}.other\n`), null, /exactly one valid/],
  ['duplicate entries', () => new Response(entry + entry), null, /exactly one valid/],
  ['invalid digest', () => new Response(`bad  ${linux}\n`), null, /exactly one valid/],
  ['conflicting entries', () => new Response(entry + `bad  ${linux}\n`), null, /exactly one valid/],
  ['binary HTTP error', () => new Response(entry), () => new Response(null, { status: 503 }), /HTTP 503/],
  ['empty binary response', () => new Response(entry), () => new Response(null, { status: 204 }), /Empty download/],
  ['connection failure', () => new Response(entry), () => { throw new Error('offline'); }, /offline/],
  ['interrupted body', () => new Response(entry), () => new Response(new ReadableStream({
    start(controller) { controller.error(new Error('interrupted')); },
  })), /interrupted/],
  ['mismatched bytes', () => new Response(entry), () => new Response('corrupt'), /SHA-256 mismatch/],
]) {
  test(`${reason} leaves PATH and the runner temp directory intact`, async t => {
    const env = await runner(t);
    const fetch = t.mock.method(globalThis, 'fetch', async url => {
      if (url === `${release}/SHA256SUMS`) return manifest();
      assert.equal(url, `${release}/${linux}`);
      return binary();
    });
    await assert.rejects(install(env, 'linux', 'x64'), error);
    assert.equal(fetch.mock.callCount(), binary ? 2 : 1);
    assert.equal(await readFile(env.GITHUB_PATH, 'utf8'), 'previous' + EOL);
    assert.deepEqual(await readdir(env.RUNNER_TEMP), [basename(env.GITHUB_PATH)]);
  });
}
