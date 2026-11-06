# Release Setup Noodle v1.0.0

## Maintainer checklist

- [ ] Create `wilfredinni/setup-noodle` as a public repository, or set its visibility to public. Include the installer, tests, workflow and documentation, with a single `action.yml` at the root.
- [ ] Have the repository owner accept the **GitHub Marketplace Developer Agreement** and enable 2FA on the publishing account. An organization owner can accept the agreement for an organization.
- [ ] Push the candidate and record the commit SHA whose hosted unit job and all three smoke jobs pass. Each smoke job installs the published Noodle CLI with the local action and checks the version and collection exit codes.
- [ ] Recheck the display name **Setup Noodle**. It must be unique among published actions. A matching user or organization name is available only to its owner. Marketplace categories and reserved GitHub feature names are ineligible. [Search Marketplace](https://github.com/marketplace?type=actions&query=Setup%20Noodle)
- [ ] From the root `action.yml` on GitHub, select **Draft a release**. Select **Publish this Action to the GitHub Marketplace** and address any metadata validation messages. If a fix changes the commit, rerun CI on the new candidate.
- [ ] Choose **Continuous integration** as the primary category. Select the tag `v1.0.0` at the tested commit, enter the title **Setup Noodle v1.0.0**, and paste the draft notes below. Confirm the target SHA and publish the release with 2FA.
- [ ] Point the major tag `v1` at the same tested commit. For the first release, fetch the release tag, then run `git tag v1 'v1.0.0^{commit}'` and `git push origin refs/tags/v1`. Verify both tags resolve to the recorded SHA and the Marketplace listing shows `v1.0.0`.

The 2026-11-05 preflight found zero Marketplace action results for “Setup Noodle”. The listing URL and the GitHub account names `setup-noodle` and `setupnoodle` were unused. No matching category or published GitHub feature name surfaced. GitHub validates the final display name during publication. [Publishing guide](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace) · [GitHub features](https://github.com/features)

## Draft release notes

**Setup Noodle v1.0.0** is the first release of the official GitHub Action for installing the Noodle CLI.

- Use `wilfredinni/setup-noodle@v1` with an exact CLI release such as `version: v0.10.3`.
- Install on Linux and macOS (x64 or arm64) and Windows (x64) using the GitHub runner’s Node 24 runtime.
- The installer checks the binary against the same release’s `SHA256SUMS` before placing it on the path. Run `noodle collection run ./api --env ci` in the next step.
