import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';

const distDirectory = new URL('../dist/', import.meta.url);
const sourceHtmlUrl = new URL('../index.html', import.meta.url);
const sourceCssUrl = new URL('../src/styles.css', import.meta.url);
const compiledDirectory = new URL('../dist-web/', import.meta.url);
const assetsDirectory = new URL('assets/', distDirectory);

async function copyCompiledFiles(sourceDirectory: URL, targetDirectory: URL): Promise<void> {
  await mkdir(targetDirectory, { recursive: true });
  const entries = await readdir(sourceDirectory, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    const source = new URL(entry.name, sourceDirectory);
    const target = new URL(entry.name, targetDirectory);

    if (entry.isDirectory()) {
      await copyCompiledFiles(new URL(`${entry.name}/`, sourceDirectory), new URL(`${entry.name}/`, targetDirectory));
      return;
    }

    const content = await readFile(source, 'utf8');
    await writeFile(target, content);
  }));
}

await rm(distDirectory, { recursive: true, force: true });
await mkdir(assetsDirectory, { recursive: true });

const [html, css] = await Promise.all([
  readFile(sourceHtmlUrl, 'utf8'),
  readFile(sourceCssUrl, 'utf8')
]);

const productionHtml = html
  .replace('<link rel="stylesheet" href="/src/styles.css" />', '<link rel="stylesheet" href="/assets/styles.css" />')
  .replace('<script type="module" src="/src/main.ts"></script>', '<script type="module" src="/assets/main.js"></script>');

await Promise.all([
  writeFile(new URL('index.html', distDirectory), productionHtml),
  writeFile(new URL('styles.css', assetsDirectory), css),
  copyCompiledFiles(compiledDirectory, assetsDirectory)
]);
