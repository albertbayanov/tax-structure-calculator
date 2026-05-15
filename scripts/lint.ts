import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const checkedExtensions = new Set(['.ts', '.js', '.json']);
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage']);

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectFiles(fullPath);
    }

    return checkedExtensions.has(fullPath.slice(fullPath.lastIndexOf('.'))) ? [fullPath] : [];
  }));

  return files.flat();
}

const files = await collectFiles(process.cwd());
const errors: string[] = [];

await Promise.all(files.map(async (file) => {
  const content = await readFile(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (line.includes('\t')) {
      errors.push(`${file}:${index + 1}: tabs are not allowed`);
    }

    if (line.endsWith(' ')) {
      errors.push(`${file}:${index + 1}: trailing whitespace is not allowed`);
    }
  });

  if (!content.endsWith('\n')) {
    errors.push(`${file}: file must end with a newline`);
  }
}));

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
