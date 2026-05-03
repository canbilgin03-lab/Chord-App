import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const enginePath = resolve(rootDir, "app/lib/chordEngine.ts")
const source = readFileSync(enginePath, "utf8")
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
})

const engineModule = { exports: {} }
new Function("exports", "require", "module", "__filename", "__dirname", outputText)(
  engineModule.exports,
  require,
  engineModule,
  enginePath,
  dirname(enginePath)
)

const {
  analyzeChord,
  buildDiatonicChords,
  buildProgressionSuggestions,
  buildScaleFromMode,
  getChordDisplayNotes,
  normalizeChordSymbol,
  parseChordSymbol,
  spellNoteForKey
} = engineModule.exports

test("preserves user-facing flat spelling while exposing canonical pitch roots", () => {
  const parsed = parseChordSymbol("Dbmaj7/Ab")

  assert.equal(parsed.root, "C#")
  assert.equal(parsed.rootSpelling, "Db")
  assert.equal(parsed.bass, "G#")
  assert.equal(parsed.bassSpelling, "Ab")
  assert.equal(parsed.symbol, "Dbmaj7/Ab")
  assert.equal(normalizeChordSymbol("Dbmaj7/Ab"), "Dbmaj7/Ab")
})

test("parses slash chords strictly as chord-over-bass-note", () => {
  assert.equal(parseChordSymbol("C/G")?.symbol, "C/G")
  assert.equal(parseChordSymbol("Cmaj7/E")?.symbol, "Cmaj7/E")
  assert.equal(parseChordSymbol("C/G7"), null)
  assert.equal(parseChordSymbol("G/Cmaj7"), null)
  assert.equal(parseChordSymbol("C//G"), null)
  assert.equal(parseChordSymbol("/C"), null)
  assert.equal(parseChordSymbol("C/"), null)
})

test("rejects unknown quality tails instead of guessing from substrings", () => {
  assert.equal(parseChordSymbol("Cmajorish"), null)
  assert.equal(parseChordSymbol("Cmin9"), null)
  assert.equal(parseChordSymbol("Cbanana"), null)
  assert.equal(parseChordSymbol("Cmystery7"), null)
})

test("distinguishes major, minor, and dominant quality aliases exactly", () => {
  assert.equal(parseChordSymbol("Cmaj")?.type, "maj")
  assert.equal(parseChordSymbol("Cmajor")?.type, "maj")
  assert.equal(parseChordSymbol("CM7")?.type, "maj7")
  assert.equal(parseChordSymbol("Cm")?.type, "m")
  assert.equal(parseChordSymbol("Cmin")?.type, "m")
  assert.equal(parseChordSymbol("Cm7")?.type, "m7")
  assert.equal(parseChordSymbol("C7")?.type, "7")
})

test("supports diminished, half-diminished, augmented, and flat-five symbols", () => {
  assert.equal(parseChordSymbol("Cdim")?.type, "dim")
  assert.equal(parseChordSymbol("C\u00b0")?.type, "dim")
  assert.equal(parseChordSymbol("Co7")?.type, "dim7")
  assert.equal(parseChordSymbol("C\u00b07")?.type, "dim7")
  assert.equal(parseChordSymbol("C\u00f87")?.type, "m7b5")
  assert.equal(parseChordSymbol("C+")?.type, "aug")
  assert.equal(parseChordSymbol("Caug")?.type, "aug")
  assert.equal(parseChordSymbol("C7\u266d5")?.type, "7b5")
})

test("keeps edge-case note spelling separate from pitch normalization", () => {
  const cb = parseChordSymbol("Cb")
  const eSharp = parseChordSymbol("E#aug")
  const dFlatGlyph = parseChordSymbol("D\u266dmaj7/A\u266d")

  assert.equal(cb.root, "B")
  assert.equal(cb.rootSpelling, "Cb")
  assert.equal(cb.symbol, "Cb")
  assert.equal(eSharp.root, "F")
  assert.equal(eSharp.rootSpelling, "E#")
  assert.equal(eSharp.symbol, "E#aug")
  assert.equal(dFlatGlyph.root, "C#")
  assert.equal(dFlatGlyph.rootSpelling, "Db")
  assert.equal(dFlatGlyph.bass, "G#")
  assert.equal(dFlatGlyph.bassSpelling, "Ab")
  assert.equal(dFlatGlyph.symbol, "Dbmaj7/Ab")
  assert.equal(parseChordSymbol("H"), null)
  assert.equal(parseChordSymbol("C##"), null)
})

test("analysis keeps parsed display spelling predictable for user-entered slash chords", () => {
  const analysis = analyzeChord({
    symbol: "Dbmaj7/Ab",
    stringCount: 5,
    key: "Db",
    mode: "Ionian"
  })

  assert.equal(analysis.parsed.symbol, "Dbmaj7/Ab")
  assert.equal(analysis.parsed.root, "C#")
  assert.equal(analysis.parsed.bass, "G#")
})

test("spells generated scales and diatonic chords for flat keys", () => {
  assert.deepEqual(buildScaleFromMode("Db", "Ionian"), ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"])
  assert.deepEqual(buildDiatonicChords("Db", "Ionian"), ["Db", "Ebm", "Fm", "Gb", "Ab", "Bbm", "Cdim"])
  assert.equal(spellNoteForKey("G#", "Db", "Ionian"), "Ab")
  assert.equal(spellNoteForKey("F#", "Db", "Ionian"), "Gb")
})

test("spells generated scales and diatonic chords for sharp keys", () => {
  assert.deepEqual(buildScaleFromMode("E", "Ionian"), ["E", "F#", "G#", "A", "B", "C#", "D#"])
  assert.deepEqual(buildDiatonicChords("E", "Ionian"), ["E", "F#m", "G#m", "A", "B", "C#m", "D#dim"])
  assert.equal(spellNoteForKey("A#", "E", "Ionian"), "A#")
})

test("uses key spelling for displayed chord tones without changing pitch analysis", () => {
  assert.deepEqual(
    getChordDisplayNotes("Dbmaj7/Ab", "Db", "Ionian").map(item => item.note),
    ["Ab", "Db", "F", "Ab", "C"]
  )

  const analysis = analyzeChord({
    symbol: "C#maj7/G#",
    stringCount: 5,
    key: "Db",
    mode: "Ionian"
  })

  assert.deepEqual(analysis.scale_notes, ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"])
  assert.deepEqual(analysis.diatonic_chords, ["Db", "Ebm", "Fm", "Gb", "Ab", "Bbm", "Cdim"])
})

test("spells progression suggestions in the selected key", () => {
  const suggestions = buildProgressionSuggestions({
    progression: ["Db", "Ab"],
    key: "Db",
    mode: "Ionian"
  })

  assert.ok([...suggestions.simple, ...suggestions.complex].every(symbol => !symbol.includes("#")))
})
