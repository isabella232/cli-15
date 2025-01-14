import {
  getLastTag,
  parseCommits,
  getCommits,
  npmBumpVersion,
  npmPublish,
  generateChangelog,
  writeChangelog,
} from '@coveo/semantic-monorepo-tools';
import {spawnSync} from 'child_process';
import {readFileSync} from 'fs';
import angularChangelogConvention from 'conventional-changelog-angular';

// Run on each package, it generate the changelog, install the latest dependencies that are part of the workspace, publish the package.
(async () => {
  const PATH = '.';
  const versionPrefix = 'v';
  const convention = await angularChangelogConvention;
  const lastTag = getLastTag(versionPrefix);
  const commits = getCommits(PATH, lastTag);
  const parsedCommits = parseCommits(commits, convention.parserOpts);
  const newVersion = getReleaseVersion();
  const changelog = await generateChangelog(
    parsedCommits,
    newVersion,
    {
      host: 'https://github.com',
      owner: 'coveo',
      repository: 'cli',
    },
    convention.writerOpts
  );
  await writeChangelog(PATH, changelog);
  updateWorkspaceDependencies();
  npmBumpVersion(newVersion, PATH);
  npmPublish();
})();

function getReleaseVersion() {
  return JSON.parse(readFileSync('../../package.json', {encoding: 'utf-8'}))
    .version;
}

// TODO [PRE_NX]: Clean  this mess.
function updateWorkspaceDependencies() {
  const topology = JSON.parse(
    readFileSync('../../topology.json', {encoding: 'utf-8'})
  );
  const packageJson = JSON.parse(
    readFileSync('package.json', {encoding: 'utf-8'})
  );

  topology.graph.dependencies[packageJson.name]
    .filter((dependency) => dependency.source == packageJson.name)
    .map((dependency) => dependency.target)
    .forEach((dependency) => updateDependency(packageJson, dependency));
}

function updateDependency(packageJson, dependency) {
  const npmInstallFlags = [];
  if (Object.hasOwn(packageJson.dependencies ?? {}, dependency)) {
    ('-P');
  }
  if (Object.hasOwn(packageJson.devDependencies ?? {}, dependency)) {
    ('-D');
  }
  if (Object.hasOwn(packageJson.optionalDependencies ?? {}, dependency)) {
    ('-O');
  }
  spawnSync(appendCmdIfWindows`npm`, [
    'install',
    `${dependency}@latest`,
    '-E',
    ...npmInstallFlags,
    '--no-package-lock',
  ]);
}

export const appendCmdIfWindows = (cmd) =>
  `${cmd}${process.platform === 'win32' ? '.cmd' : ''}`;
