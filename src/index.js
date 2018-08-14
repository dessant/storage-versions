import browser from 'webextension-polyfill';
import {indexOf, last, slice} from 'lodash-es';

async function storageVersion(area = 'local') {
  const {storageVersion} = await browser.storage[area].get('storageVersion');
  return storageVersion;
}

async function getVersions(context, area) {
  return context(`./${area}/versions.json`).versions;
}

async function upgrade(context, {area = 'local'} = {}) {
  const versions = await getVersions(context, area);
  const fromVer = await storageVersion(area);
  const toVer = last(versions);

  if (fromVer === toVer) {
    return;
  }

  const migrationPath = slice(
    versions,
    indexOf(versions, fromVer) + 1,
    indexOf(versions, toVer) + 1
  );

  console.log(`Migrating storage (${area}): ${fromVer} => ${toVer}`);

  for (const revisionId of migrationPath) {
    const revision = context(`./${area}/${revisionId}.js`);
    console.log(
      `Applying revision (${area}): ${revision.revision} - ${revision.message}`
    );
    await revision.upgrade();
  }
}

async function migrate(context, {area = 'local'} = {}) {
  return upgrade(context, {area});
}

export {migrate, upgrade};
