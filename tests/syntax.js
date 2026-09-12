const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const files = [path.join('backend', 'server.js')];
const directories = [
  'services',
  'security',
  'router',
  'routes',
  'queues',
  'workers',
  'realtime',
  'monitoring',
  'resilience',
  'agents',
].map((directory) => path.join('backend', directory));

for (const directory of directories) {
  for (const entry of fs.readdirSync(directory).sort()) {
    if (entry.endsWith('.js')) files.push(path.join(directory, entry));
  }
}

for (const file of files) {
  console.log(`Checking ${file}`);
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log('All files parse');
