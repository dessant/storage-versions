#! /usr/bin/env node

const path = require('path');
const {writeFileSync} = require('fs');

const {ensureDirSync, readJsonSync, writeJsonSync} = require('fs-extra');
const program = require('commander');
const shortid = require('shortid');
const _ = require('lodash');

program
  .description('Saves a new storage revision in the versions folder.')
  .option('-m, --message <value>', 'Revision description.')
  .option(
    '-v, --versions <value>',
    'Directory where versions are kept, grouped by storage area. Defaults to `./storage/versions`.'
  )
  .option(
    '-s, --storage <value>',
    'Storage area, one of `local` or `sync`. Defaults to `local`.',
    /^(local|sync)$/i,
    'local'
  )
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}

const message = program.message;
const storageArea = program.storage;

const versionsDir = program.versions
  ? path.resolve(program.versions, storageArea)
  : path.resolve('storage', 'versions', storageArea);
const versionsFile = path.join(versionsDir, 'versions.json');

ensureDirSync(versionsDir);

let revisionId;
while (true) {
  revisionId = shortid.generate();
  if (
    !revisionId.includes('-') &&
    !revisionId.includes('_') &&
    !'0123456789'.includes(revisionId.charAt(0))
  ) {
    break;
  }
}

let versions;
let downRevisionId;

try {
  versions = readJsonSync(versionsFile);
  downRevisionId = `'${_.last(versions.versions)}'`;
} catch (err) {
  versions = {versions: []};
  downRevisionId = null;
}
versions.versions.push(revisionId);

const revisionCont = `import browser from 'webextension-polyfill';

const message = '${message}';

const revision = '${revisionId}';
const downRevision = ${downRevisionId};

const storage = browser.storage.${storageArea};

async function upgrade() {
  const changes = {};

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

module.exports = {
  message,
  revision,
  upgrade,
  downgrade
};
`;

writeFileSync(path.join(versionsDir, `${revisionId}.js`), revisionCont);
writeJsonSync(versionsFile, versions);
