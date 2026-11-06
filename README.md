# Setup Noodle

Install the Noodle CLI for use in subsequent GitHub Actions steps. The action runs on GitHub’s Node 24 runtime and requires no Bun, package installation, or separate Node setup.

[Noodle repository](https://github.com/wilfredinni/noodle) · [Noodle website](https://noodlerest.dev/) 

```yaml
name: API tests
on: [push, pull_request]
permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: wilfredinni/setup-noodle@v1
        with:
          version: v0.10.3
      - run: noodle collection run ./api --env ci
```

`@v1` selects the major version of the **setup action**. The required `version` input selects the **Noodle CLI**. Supply an exact stable release tag in the form `vMAJOR.MINOR.PATCH`. The example expects a collection in `./api` with a `ci` environment. Your workflow supplies any API credentials, runs the collection, and chooses which reports to upload.

### Pin the action to a commit

After the action release is published, open its tagged commit and copy the full 40-character SHA. Replace the placeholder below with that SHA to keep using the same installer even when `v1` moves. Keep the CLI tag in `with.version`. [Action releases](https://github.com/wilfredinni/setup-noodle/releases)

```yaml
- uses: wilfredinni/setup-noodle@<FULL_40_CHARACTER_COMMIT_SHA> # v1.0.0
  with:
    version: v0.10.3
```

### Supported runners and verification

| Runner | CPU |
| --- | --- |
| Linux | x64, arm64 |
| macOS | x64, arm64 |
| Windows | x64 |

Each invocation downloads the platform binary and `SHA256SUMS` from the requested official release. The action requires one matching checksum entry and verifies the file before adding its fresh directory under `RUNNER_TEMP` to `GITHUB_PATH`. Subsequent steps can invoke `noodle` on every supported platform. [Noodle CLI releases](https://github.com/wilfredinni/noodle/releases)

### Development

Run `node --test` with Node 24 for the offline installer tests. With Noodle CLI `v0.10.3` on your path, run `node scripts/smoke.mjs` to check the exact version and exercise a collection against a temporary loopback server. The smoke test checks both a passing assertion (exit 0) and a failed assertion (exit 1).

Maintainers can find the publication steps and draft release notes in the [release checklist](RELEASING.md).
