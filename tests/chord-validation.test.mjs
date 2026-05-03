#!/usr/bin/env node

import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { readFileSync } from 'fs'
import { createRequire } from 'module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const enginePath = resolve(rootDir, 'app/lib/chordEngine.ts')
const source = readFileSync(enginePath, 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
})

const engineModule = { exports: {} }
new Function('exports', 'require', 'module', '__filename', '__dirname', outputText)(
  engineModule.exports,
  require,
  engineModule,
  enginePath,
  dirname(enginePath)
)

const { 
  inferChordSymbol, 
  canNameChord
} = engineModule.exports

console.log('🎸 Testing Chord Naming System\n')
console.log('=' .repeat(60))

// Verify the functions exist and work
console.log(`\ninferChordSymbol type: ${typeof inferChordSymbol}`)
console.log(`canNameChord type: ${typeof canNameChord}`)

// Quick test
const testNotes = ['C', 'E', 'G']
console.log(`\nQuick test with [${testNotes}]:`)
try {
  const result = inferChordSymbol(testNotes, 'C', 'Ionian')
  console.log(`Result: ${result}`)
  const canName = canNameChord(testNotes, 'C', 'Ionian')
  console.log(`canNameChord: ${canName}`)
} catch (err) {
  console.error(`Error: ${err.message}`)
  console.error(`Stack: ${err.stack}`)
}

// Test cases: [notes, expectedChord, description]
const testCases = [
  // Basic triads
  [['C', 'E', 'G'], 'C', 'Major triad'],
  [['C', 'Eb', 'G'], 'Cm', 'Minor triad'],
  [['C', 'G'], 'C', 'Power chord (root + 5th)'],
  
  // 7th chords
  [['C', 'E', 'G', 'Bb'], 'C7', 'Dominant 7'],
  [['C', 'E', 'G', 'B'], 'Cmaj7', 'Major 7'],
  [['C', 'Eb', 'G', 'Bb'], 'Cm7', 'Minor 7'],
  
  // Extended chords
  [['C', 'E', 'G', 'A'], 'C6', 'Major 6'],
  [['C', 'Eb', 'G', 'A'], 'Cm6', 'Minor 6'],
  [['C', 'E', 'G', 'D'], 'Cadd9', 'Add 9'],
  [['C', 'Eb', 'G', 'D'], 'Cmadd9', 'Minor add 9'],
  [['C', 'E', 'G', 'A', 'D'], 'C6add9', '6 add 9'],
  
  // Suspended chords
  [['C', 'F', 'G'], 'Csus4', 'Sus 4'],
  [['C', 'D', 'G'], 'Csus2', 'Sus 2'],
  [['C', 'D', 'G', 'Bb'], 'C7sus2', '7 Sus 2'],
  [['C', 'F', 'G', 'Bb'], 'C7sus4', '7 Sus 4'],
  
  // Augmented/Diminished
  [['C', 'E', 'G#'], 'Caug', 'Augmented'],
  [['C', 'Eb', 'Gb'], 'Cdim', 'Diminished'],
  [['C', 'Eb', 'Gb', 'A'], 'Cdim7', 'Diminished 7'],
  
  // Flat 5 chords
  [['C', 'E', 'Gb', 'Bb'], 'C7b5', 'Dominant 7 flat 5'],
  [['C', 'Eb', 'Gb', 'Bb'], 'Cm7b5', 'Half diminished'],
  
  // Edge cases - Two note chords
  [['C', 'E'], 'C', '2-note: root + major 3'],
  [['C', 'Eb'], 'Cm', '2-note: root + minor 3'],
  [['C', 'B'], 'Cmaj7', '2-note: root + major 7'],
  [['C', 'Bb'], 'C7', '2-note: root + minor 7'],
  [['C', 'A'], 'C6', '2-note: root + 6'],
  
  // Single note
  [['C'], 'C', 'Single note'],
  
  // Duplicates (octaves)
  [['C', 'E', 'G', 'C'], 'C', 'Major with octave'],
  [['C', 'Eb', 'G', 'Eb'], 'Cm', 'Minor with octave'],
]

let passed = 0
let failed = 0

console.log('\nRunning tests...\n')

for (const [notes, expected, description] of testCases) {
  const result = inferChordSymbol(notes, 'C', 'Ionian')
  const canName = canNameChord(notes, 'C', 'Ionian')
  
  const status = result === expected
  if (status) {
    passed++
    console.log(`✓ ${description.padEnd(30)} | ${JSON.stringify(notes).padEnd(30)} => ${result}`)
  } else {
    failed++
    console.log(`✗ ${description.padEnd(30)} | ${JSON.stringify(notes).padEnd(30)} => ${result} (expected ${expected})`)
  }
  
  // Verify canNameChord matches
  if (!canName && result === null) {
    // OK - both agree it's unnamable
  } else if (canName && result !== null) {
    // OK - both agree it's namable
  } else {
    console.log(`  WARNING: canNameChord mismatch for ${JSON.stringify(notes)}`)
  }
}

console.log('\n' + '='.repeat(60))
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} tests`)
console.log(`Success rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`)

if (failed > 0) {
  process.exit(1)
} else {
  console.log('✓ All tests passed!')
}
