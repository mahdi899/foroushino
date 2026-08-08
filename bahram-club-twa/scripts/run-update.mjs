import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jdk = `${process.env.USERPROFILE}\\.bubblewrap\\jdk\\jdk-17.0.11+9`;

const child = spawn('npm run update', {
  cwd: root,
  shell: true,
  stdio: ['pipe', 'inherit', 'inherit'],
  env: {
    ...process.env,
    JAVA_HOME: jdk,
    Path: `${jdk}\\bin;${process.env.Path ?? ''}`,
  },
});

for (const delay of [1500, 3000, 8000, 20000, 45000, 90000, 180000]) {
  setTimeout(() => child.stdin.write('y\n'), delay);
}
setTimeout(() => child.stdin.write('Y\n'), 1000);

child.on('close', (code) => process.exit(code ?? 1));
