const { createHash } = require('node:crypto');
const { createReadStream, createWriteStream } = require('node:fs');
const { appendFile, chmod, mkdtemp, rm } = require('node:fs/promises');
const { EOL } = require('node:os');
const { join } = require('node:path');
const { pipeline } = require('node:stream/promises');

const assets = {
  'linux-x64': 'noodle-linux-x86_64',
  'linux-arm64': 'noodle-linux-arm64',
  'darwin-x64': 'noodle-macos-x86_64',
  'darwin-arm64': 'noodle-macos-arm64',
  'win32-x64': 'noodle-windows-x86_64.exe',
};

function expectedChecksum(manifest, asset) {
  const entries = manifest.split(/\r?\n/)
    .map(line => /^(\S+)[ \t]+\*?(\S+)$/.exec(line))
    .filter(entry => entry?.[2] === asset);
  if (entries.length !== 1 || !/^[a-f0-9]{64}$/i.test(entries[0][1])) {
    throw new Error(`Expected exactly one valid SHA256SUMS entry for ${asset}`);
  }
  return entries[0][1].toLowerCase();
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (HTTP ${response.status}): ${url}`);
  if (!response.body) throw new Error(`Empty download: ${url}`);
  return response;
}

async function install(env, platform, arch) {
  const version = env.INPUT_VERSION;
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('version must be an exact stable Noodle release tag, such as v0.10.3');
  }
  const asset = assets[`${platform}-${arch}`];
  if (!asset) throw new Error(`Unsupported Noodle platform: ${platform}-${arch}`);
  if (!env.RUNNER_TEMP || !env.GITHUB_PATH) throw new Error('RUNNER_TEMP and GITHUB_PATH are required');

  const release = `https://github.com/noodle-rest/noodle/releases/download/${version}`;
  const manifest = await download(`${release}/SHA256SUMS`);
  const expected = expectedChecksum(await manifest.text(), asset);
  const response = await download(`${release}/${asset}`);
  const directory = await mkdtemp(join(env.RUNNER_TEMP, 'setup-noodle-'));
  const binary = join(directory, platform === 'win32' ? 'noodle.exe' : 'noodle');
  try {
    await pipeline(response.body, createWriteStream(binary, { flags: 'wx', mode: 0o600 }));
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(binary)) hash.update(chunk);
    if (hash.digest('hex') !== expected) throw new Error(`SHA-256 mismatch for ${asset}`);

    if (platform !== 'win32') await chmod(binary, 0o755);
    await appendFile(env.GITHUB_PATH, directory + EOL);
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  console.log(`Installed Noodle ${version} (${asset})`);
}

if (require.main === module) {
  install(process.env, process.platform, process.arch).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { install };
