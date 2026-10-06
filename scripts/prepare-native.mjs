import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { planPackage } from '../src/closure.mjs';
import { zipStore } from '../src/zip-store.mjs';

const base = resolve('artifacts/fixture-source');
const files = new Map();
async function walk(path) {
  for (const item of await readdir(path, {withFileTypes: true})) {
    const target = resolve(path, item.name);
    if (item.isSymbolicLink()) throw new Error(`Symlink rejected: ${target}`);
    if (item.isDirectory()) await walk(target);
    else if (item.isFile()) files.set(relative(base, target).split('\\').join('/'), new Uint8Array(await readFile(target)));
    else throw new Error(`Unsupported filesystem entry: ${target}`);
  }
}
await walk(base);
const plan = planPackage(files, 'maps/selected.tmx');
await mkdir('artifacts', {recursive: true});
await writeFile('artifacts/selected-map.zip', zipStore(plan));
await writeFile('artifacts/package-manifest.json', JSON.stringify({entry: plan.entry, paths: plan.paths, edges: plan.edges, excluded: plan.excluded, hashes: Object.fromEntries(plan.paths.map(path => [path, createHash('sha256').update(plan.files.get(path)).digest('hex')]))}, null, 2) + '\n');
console.log(`Packaged ${plan.paths.length} unchanged files, excluded ${plan.excluded.length}`);
