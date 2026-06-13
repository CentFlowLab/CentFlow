const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const env = { ...process.env };
const easEntry = path.join(__dirname, '..', 'node_modules', 'eas-cli', 'bin', 'run');

function prependPath(dir) {
  if (!dir) return;
  const sep = process.platform === 'win32' ? ';' : ':';
  env.PATH = `${dir}${sep}${env.PATH || ''}`;
}

if (process.platform === 'win32') {
  prependPath(path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'cmd'));
  prependPath(path.join(process.env.WINDIR || 'C:\\Windows', 'System32'));
  prependPath(path.dirname(process.execPath));
}

const gitHelp = spawnSync('git', ['--help'], { env, shell: true, encoding: 'utf8' });
if (gitHelp.status !== 0) {
  env.EAS_NO_VCS = '1';
  console.warn('Git indisponível — a usar EAS_NO_VCS=1 (sem metadados de commit no update).');
}

const projectRoot = path.join(__dirname, '..');
const result = spawnSync(process.execPath, [easEntry, ...args], {
  env,
  stdio: 'inherit',
  cwd: projectRoot,
});
process.exit(result.status ?? 1);
