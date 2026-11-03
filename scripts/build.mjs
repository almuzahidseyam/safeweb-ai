import { build } from 'esbuild';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import manifest from '../manifest.json' with { type: 'json' };

await mkdir('dist/popup', { recursive: true });
await build({ entryPoints: ['src/background.js', 'src/content.js'], bundle: true, outdir: 'dist',
    minify: true, legalComments: 'linked', target: 'chrome120', platform: 'browser', format: 'iife' });
await writeFile('dist/manifest.json', JSON.stringify(manifest, null, 2));
for (const file of ['popup.html', 'popup.css', 'popup.js']) await copyFile(`popup/${file}`, `dist/popup/${file}`);
await copyFile('LICENSE', 'dist/LICENSE');
