'use strict';

// Local-only packager: reads the checked-in RSS app files and writes a bundle
// beneath this repository. It makes no network requests and never reads secrets.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const root = path.resolve(__dirname, '..');
const filesToInclude = [
  'README.md',
  'package.json',
  'app.yaml',
  'server.js',
  '.env.example',
  'scripts/check-reddit-feed.js',
  'android/settings.gradle',
  'android/build.gradle',
  'android/gradle.properties',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/app/src/main/java/com/example/redditfeedmonitor/MainActivity.kt',
];

function safeOutputPath(input) {
  const resolved = path.resolve(root, input);
  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Output must be a new directory inside this repository.');
  }
  return resolved;
}

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const nameInput = (await rl.question('Package name [enclave-local-provider]: ')).trim();
    const packageName = nameInput || 'enclave-local-provider';
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(packageName)) {
      throw new Error('Use 1–64 letters, numbers, dots, underscores, or hyphens for the package name.');
    }

    const mimeInput = (await rl.question('Package MIME type [application/zip]: ')).trim();
    const mimeType = mimeInput || 'application/zip';
    if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mimeType)) {
      throw new Error('Enter a valid MIME type, such as application/zip.');
    }

    const outputInput = (await rl.question('Output directory [build/enclave-local-provider]: ')).trim();
    const outputRelative = outputInput || 'build/enclave-local-provider';
    const output = safeOutputPath(outputRelative);
    if (fs.existsSync(output)) {
      throw new Error(`Output already exists; choose a new directory: ${outputRelative}`);
    }

    fs.mkdirSync(output, { recursive: true });
    for (const relativeFile of filesToInclude) {
      const source = path.join(root, relativeFile);
      if (!fs.existsSync(source) || !fs.lstatSync(source).isFile()) {
        throw new Error(`Required regular source file is missing: ${relativeFile}`);
      }
      const destination = path.join(output, relativeFile);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
    }

    const manifest = {
      name: packageName,
      mimeType,
      localOnly: true,
      purpose: 'Public RSS reader source bundle; no payment or credential processing.',
      createdAt: new Date().toISOString(),
      files: filesToInclude,
    };
    fs.writeFileSync(path.join(output, 'package-info.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    fs.writeFileSync(path.join(output, 'PACKAGE-README.md'), `# ${packageName}\n\nLocal-only source bundle for the public RSS reader.\n\n- MIME type: \`${mimeType}\`\n- Contains source files and templates; this wizard does not create an archive or contact a server.\n- No payment credentials, tokens, or device identifiers are collected.\n\nSee \`README.md\` for local setup and App Engine deployment instructions.\n`, { flag: 'wx' });
    console.log(`Package template created at ${path.relative(root, output)}`);
    console.log('No network requests were made.');
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(`Package wizard: ${error.message}`);
  process.exitCode = 1;
});
