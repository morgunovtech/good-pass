import { mkdir, readdir, stat, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const sourceDir = path.join(projectRoot, 'public');
const targetDir = path.join(projectRoot, 'dist');

async function main() {
  try {
    await rm(targetDir, { recursive: true, force: true });
    await copyDirectory(sourceDir, targetDir);
    console.info('📦  Static bundle ready in dist/');
  } catch (error) {
    console.error('build_failed', { message: error.message });
    process.exitCode = 1;
  }
}

async function copyDirectory(from, to) {
  await mkdir(to, { recursive: true });
  const entries = await readdir(from, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const stats = await stat(srcPath);
      if (stats.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }
}

await main();
