import { execSync } from 'node:child_process';
import chalk from 'chalk';

export async function dockerCommand(filter?: string) {
  console.log(chalk.blue(`🐳 Docker Status${filter ? ` (filter: ${filter})` : ''}`));
  console.log(chalk.gray('─'.repeat(60)));

  // Check docker is available
  try {
    execSync('docker version --format "{{.Server.Version}}"', { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    console.error(chalk.red('❌ Docker is not running or not installed.'));
    return;
  }

  // Containers
  try {
    const containers = execSync('docker ps -a --format "{{.Names}}|{{.Status}}|{{.Image}}|{{.Ports}}"', { encoding: 'utf-8', timeout: 10000 });
    const lines = containers.split('\n').filter(l => l.trim());

    if (filter) {
      const filtered = lines.filter(l => l.toLowerCase().includes(filter.toLowerCase()));
      lines.length = 0;
      lines.push(...filtered);
    }

    console.log(chalk.bold(`Containers (${lines.length}):`));
    console.log('  ' + 'Name'.padEnd(25) + 'Status'.padEnd(20) + 'Image'.padEnd(30) + 'Ports');

    for (const line of lines.slice(0, 20)) {
      const [name, status, image, ports] = line.split('|');
      const icon = status?.startsWith('Up') ? '🟢' : '🔴';
      const shortStatus = status?.replace(/\s*\(.+\)/, '').trim() || '';
      const shortPorts = (ports || '').replace(/0\.0\.0\.0:/g, ':').replace(/:::/, ':').substring(0, 30);
      console.log(`  ${icon} ${(name || '').padEnd(23)}${shortStatus.padEnd(20)}${(image || '').substring(0, 28).padEnd(30)}${shortPorts}`);
    }

    if (lines.length > 20) {
      console.log(chalk.gray(`  ... ${lines.length - 20} more containers`));
    }
  } catch (e: any) {
    console.log(chalk.yellow(`  (containers unavailable: ${e.message})`));
  }

  // Images (compact)
  console.log('');
  try {
    const images = execSync('docker images --format "{{.Repository}}:{{.Tag}}|{{.Size}}" | head -10', { encoding: 'utf-8', timeout: 10000, shell: process.platform === 'win32' ? undefined : '/bin/sh' });
    const imgLines = images.split('\n').filter(l => l.trim());
    console.log(chalk.bold(`Images (top ${imgLines.length}):`));
    for (const line of imgLines) {
      const [repo, size] = line.split('|');
      console.log(`  ${(repo || '').padEnd(45)}${size || ''}`);
    }
  } catch {
    console.log(chalk.yellow('  (images unavailable)'));
  }

  // Volumes count
  try {
    const volCount = execSync('docker volume ls -q | wc -l', { encoding: 'utf-8', timeout: 5000, shell: process.platform === 'win32' ? undefined : '/bin/sh' }).trim();
    console.log(chalk.gray(`\nVolumes: ${volCount} | Networks: `) +
      execSync('docker network ls -q | wc -l', { encoding: 'utf-8', timeout: 5000, shell: process.platform === 'win32' ? undefined : '/bin/sh' }).trim());
  } catch {}
}
