import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const rootDir = resolve('.');
const enginePath = resolve(rootDir, 'app/lib/chordEngine.ts');
const source = readFileSync(enginePath, 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
});

const engineModule = { exports: {} };
new Function('exports', 'require', 'module', '__filename', '__dirname', outputText)(engineModule.exports, require, engineModule, enginePath, rootDir);
const { inferChordSymbol } = engineModule.exports;

const cases = [
  ['E', 'G'],
  ['E', 'G', 'A'],
  ['E', 'G', 'C'],
  ['G', 'B', 'D'],
  ['E', 'A', 'B'],
  ['G', 'E', 'B']
];

for (const notes of cases) {
  console.log(notes, '=>', inferChordSymbol(notes, 'C', 'Ionian'));
}
