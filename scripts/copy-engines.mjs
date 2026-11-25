import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const enginesDir = path.join(rootDir, 'public', 'engines');

const pyodideSrc = path.join(rootDir, 'node_modules', 'pyodide');
const pyodideDest = path.join(enginesDir, 'pyodide');
const pyodideFiles = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

const clangSrc = path.join(rootDir, 'node_modules', '@yowasp', 'clang', 'gen');
const clangDest = path.join(enginesDir, 'clang');
const clangFiles = [
  'bundle.js',
  'llvm-resources.tar',
  'llvm.core.wasm',
  'llvm.core2.wasm',
  'llvm.core3.wasm',
  'llvm.core4.wasm',
];

function copyIfNeeded(srcFile, destFile) {
  const srcStat = fs.statSync(srcFile);
  if (fs.existsSync(destFile)) {
    const destStat = fs.statSync(destFile);
    if (destStat.size === srcStat.size && destStat.mtimeMs >= srcStat.mtimeMs) {
      return srcStat.size;
    }
  }
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.copyFileSync(srcFile, destFile);
  return srcStat.size;
}

function readPackageVersion(pkgPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function main() {
  fs.mkdirSync(pyodideDest, { recursive: true });
  fs.mkdirSync(clangDest, { recursive: true });

  const pyodideEntries = pyodideFiles.map((file) => {
    const size = copyIfNeeded(path.join(pyodideSrc, file), path.join(pyodideDest, file));
    return { path: `engines/pyodide/${file}`, size };
  });

  const clangEntries = clangFiles.map((file) => {
    const size = copyIfNeeded(path.join(clangSrc, file), path.join(clangDest, file));
    return { path: `engines/clang/${file}`, size };
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    engines: {
      python: {
        name: 'Pyodide (Python 3)',
        version: readPackageVersion(path.join(pyodideSrc, 'package.json')),
        cacheName: 'code-studio-engine-python-v1',
        totalBytes: pyodideEntries.reduce((sum, f) => sum + f.size, 0),
        files: pyodideEntries,
      },
      c: {
        name: 'YoWASP Clang/LLVM (C17)',
        version: readPackageVersion(path.join(rootDir, 'node_modules', '@yowasp', 'clang', 'package.json')),
        cacheName: 'code-studio-engine-c-v1',
        totalBytes: clangEntries.reduce((sum, f) => sum + f.size, 0),
        files: clangEntries,
      },
    },
  };

  fs.writeFileSync(path.join(enginesDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(
    `[copy-engines] Ready — Python: ${(manifest.engines.python.totalBytes / 1024 / 1024).toFixed(1)} MB, C/Clang: ${(manifest.engines.c.totalBytes / 1024 / 1024).toFixed(1)} MB`
  );
}

main();
