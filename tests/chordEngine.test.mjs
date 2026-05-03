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
  canNameChord,
  getChordDisplayNotes,
  inferChordSymbol,
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

test("infers major and minor triads correctly", () => {
  assert.equal(inferChordSymbol(["C", "E", "G"]), "C")
  assert.equal(inferChordSymbol(["C", "Eb", "G"]), "Cm")
  assert.equal(inferChordSymbol(["D", "F#", "A"]), "D")
  assert.equal(inferChordSymbol(["D", "F", "A"]), "Dm")
})

test("infers seventh chords correctly", () => {
  assert.equal(inferChordSymbol(["C", "E", "G", "Bb"]), "C7")
  assert.equal(inferChordSymbol(["C", "E", "G", "B"]), "Cmaj7")
  assert.equal(inferChordSymbol(["C", "Eb", "G", "Bb"]), "Cm7")
  assert.equal(inferChordSymbol(["C", "Eb", "Gb", "Bb"]), "Cm7b5")
})

test("infers extended chords correctly", () => {
  assert.equal(inferChordSymbol(["C", "E", "G", "A"]), "C6")
  assert.equal(inferChordSymbol(["C", "Eb", "G", "A"]), "Cm6")
  assert.equal(inferChordSymbol(["C", "E", "G", "D"]), "Cadd9")
  assert.equal(inferChordSymbol(["C", "Eb", "G", "D"]), "Cmadd9")
})

test("infers ninth and 6add9 chords correctly", () => {
  assert.equal(inferChordSymbol(["C", "E", "G", "B", "D"]), "Cmaj9")
  assert.equal(inferChordSymbol(["C", "E", "G", "Bb", "D"]), "C9")
  assert.equal(inferChordSymbol(["C", "Eb", "G", "Bb", "D"]), "Cm9")
  assert.equal(inferChordSymbol(["C", "E", "G", "A", "D"]), "C6add9")
  assert.equal(canNameChord(["C", "E", "G", "B", "D"]), true)
  assert.equal(canNameChord(["C", "Eb", "G", "Bb", "D"]), true)
})

test("infers suspended chords correctly", () => {
  assert.equal(inferChordSymbol(["C", "F", "G"]), "Csus4")
  assert.equal(inferChordSymbol(["C", "D", "G"]), "Csus2")
  assert.equal(inferChordSymbol(["C", "D", "G", "Bb"]), "C7sus2")
  assert.equal(inferChordSymbol(["C", "F", "G", "Bb"]), "C7sus4")
})

test("infers diminished and augmented chords correctly", () => {
  assert.equal(inferChordSymbol(["C", "Eb", "Gb"]), "Cdim")
  // Note: Bbb is enharmonically A, which forms a root relationship, so use A instead
  assert.equal(inferChordSymbol(["C", "Eb", "Gb", "A"]), "Cdim7")
  assert.equal(inferChordSymbol(["C", "E", "G#"]), "Caug")
})

test("handles two-note chords correctly", () => {
  assert.equal(inferChordSymbol(["C", "E"]), "C")
  assert.equal(inferChordSymbol(["C", "Eb"]), "Cm")
  assert.equal(inferChordSymbol(["C", "B"]), "Cmaj7")
  assert.equal(inferChordSymbol(["C", "Bb"]), "C7")
  assert.equal(inferChordSymbol(["C", "A"]), "C6")
})

test("handles single notes as major chords", () => {
  assert.equal(inferChordSymbol(["C"]), "C")
  assert.equal(inferChordSymbol(["D"]), "D")
})

test("handles octave doublings (duplicate pitches)", () => {
  assert.equal(inferChordSymbol(["C", "E", "G", "C"]), "C")
  assert.equal(inferChordSymbol(["C", "Eb", "G", "Eb"]), "Cm")
})

test("canNameChord validates chord-namability correctly", () => {
  // Valid chords should return true
  assert.equal(canNameChord(["C", "E", "G"]), true)
  assert.equal(canNameChord(["C", "Eb", "G"]), true)
  assert.equal(canNameChord(["C", "E", "G", "Bb"]), true)
  
  // Edge cases - any valid chord should be namable
  assert.equal(canNameChord(["C"]), true)
  assert.equal(canNameChord(["C", "E"]), true)
})

test("handles power chords and various voicings", () => {
  assert.equal(inferChordSymbol(["C", "G"]), "C")
  assert.equal(inferChordSymbol(["D", "A"]), "D")
  // C, G, D is C sus2 (root, 5th, 2nd)
  assert.equal(inferChordSymbol(["C", "G", "D"]), "Csus2")
})

test("does not name triads with unrelated extra tones as plain triads", () => {
  assert.equal(inferChordSymbol(["E", "G", "B", "D"]), "Em7")
  assert.equal(inferChordSymbol(["E", "G", "B", "C#"]), "Em6")
  assert.equal(inferChordSymbol(["E", "G", "B", "F#"]), "Emadd9")
  assert.equal(inferChordSymbol(["E", "G", "B", "A"]), "A7sus2")
  assert.equal(inferChordSymbol(["E", "G", "B", "A#"]), null)
  assert.equal(inferChordSymbol(["E", "G", "B", "F"]), null)
  assert.equal(canNameChord(["E", "G", "B", "A#"]), false)
})

function voicingGapCount(voicing) {
  const strings = voicing.map(entry => entry.string).sort((a, b) => a - b)
  let gapCount = 0

  for(let i = 1; i < strings.length; i++) {
    gapCount += Math.max(0, strings[i] - strings[i - 1] - 1)
  }

  return gapCount
}

function voicingMaxGap(voicing) {
  const strings = voicing.map(entry => entry.string).sort((a, b) => a - b)
  let maxGap = 0

  for(let i = 1; i < strings.length; i++) {
    maxGap = Math.max(maxGap, strings[i] - strings[i - 1] - 1)
  }

  return maxGap
}

test("gap-aware voicing suggestions keep the requested sounding note count", () => {
  for(const symbol of ["Dadd9", "Fmaj9", "Cmaj7", "G7", "Bdim", "G7b5/C"]) {
    for(const stringCount of [3, 4, 5, 6]) {
      const analysis = analyzeChord({ symbol, stringCount, key: "C", mode: "Ionian" })
      assert.ok(analysis.voicings.length > 0, `${symbol} should produce ${stringCount}-note voicings`)
      assert.ok(
        analysis.voicings.every(voicing => voicing.length === stringCount),
        `${symbol} ${stringCount}-note voicings should contain exactly ${stringCount} sounding notes`
      )
    }
  }
})

test("gap-aware voicing suggestions keep skipped strings rare and practical", () => {
  for(const symbol of ["Dadd9", "Fmaj9", "Cmaj7", "G7", "Bdim", "G7b5/C"]) {
    const analysis = analyzeChord({ symbol, stringCount: 4, key: "C", mode: "Ionian" })
    const gapVoicings = analysis.voicings.filter(voicing => voicingGapCount(voicing) > 0)

    assert.ok(
      gapVoicings.length <= Math.ceil(analysis.voicings.length * 0.35),
      `${symbol} should not let skipped-string voicings dominate the suggestion list`
    )
    assert.ok(
      gapVoicings.every(voicing => voicingGapCount(voicing) <= 2 && voicingMaxGap(voicing) <= 1),
      `${symbol} skipped-string voicings should use only small intentional gaps`
    )
  }
})

test("gap-aware voicing suggestions use gaps for extensions rather than filler variety", () => {
  const bdim = analyzeChord({ symbol: "Bdim", stringCount: 4, key: "C", mode: "Ionian" })
  assert.equal(bdim.voicings.filter(voicing => voicingGapCount(voicing) > 0).length, 0)

  const dadd9 = analyzeChord({ symbol: "Dadd9", stringCount: 4, key: "C", mode: "Ionian" })
  assert.ok(
    dadd9.voicings.some(voicing => voicingGapCount(voicing) > 0 && voicing.some(entry => entry.role === "9")),
    "Dadd9 should allow a meaningful skipped-string voicing for the 9"
  )

  const fmaj9 = analyzeChord({ symbol: "Fmaj9", stringCount: 4, key: "C", mode: "Ionian" })
  assert.ok(
    fmaj9.voicings.some(voicing => voicingGapCount(voicing) > 0 && voicing.some(entry => entry.role === "9" || entry.role === "7")),
    "Fmaj9 should allow a meaningful skipped-string voicing for upper color tones"
  )
})
