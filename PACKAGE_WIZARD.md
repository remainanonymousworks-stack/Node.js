# Local package wizard

Generate a local source bundle containing the Android public RSS reader and its App Engine API template. The wizard only copies an explicit allowlist of project files and writes package metadata. It makes no network requests and does not read tokens, payment data, or device identity.

From the repository root:

```sh
node scripts/package-wizard.js
```

Prompts let you set a package name, MIME type, and output directory. Defaults are `enclave-local-provider`, `application/zip`, and `build/enclave-local-provider`. Output must be a new directory inside this repository; existing directories and paths outside the repository are rejected. The wizard creates a source bundle directory, not a ZIP archive. Build/archive it locally with your preferred trusted tooling if needed.
