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
  buildProgressionCompletion,
  analyzeProgressionState,
  buildDiatonicChords,
  buildFunctionalChordUniverse,
  buildProgressionSuggestions,
  buildScaleFromMode,
  canNameChord,
  getChordDisplayNotes,
  inferChordSymbol,
  normalizeChordSymbol,
  parseChordSymbol,
  smartStringCountForChord,
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
  assert.equal(parseChordSymbol("G7b9")?.type, "7b9")
  assert.equal(parseChordSymbol("E7#9")?.type, "7#9")
  assert.equal(parseChordSymbol("Dm11")?.type, "m11")
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

test("progression state keeps the selected key and tonic fixed", () => {
  const state = analyzeProgressionState({
    progression: ["Am", "F", "G"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })

  assert.equal(state.key, "C")
  assert.equal(state.tonicRoot, "C")
  assert.equal(state.context.tonicRoot, "C")
  assert.equal(state.context.tonicScaleDegree, 0)
  assert.equal(state.chords[0].role, "tonicSubstitute")
  assert.notEqual(state.context.currentHarmonicFunctionState, "tonic")
})

test("progression analysis labels functions and resolution targets explicitly", () => {
  const tonic = analyzeProgressionState({
    progression: ["C"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(tonic.chords[0].role, "tonic")
  assert.equal(tonic.chords[0].resolutionTarget.targetRoot, "C")

  const dominant = analyzeProgressionState({
    progression: ["G7"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(dominant.chords[0].role, "dominant")
  assert.equal(dominant.chords[0].resolutionTarget.targetRoot, "C")
  assert.equal(dominant.chords[0].resolutionTarget.targetScaleDegree, 0)

  const secondary = analyzeProgressionState({
    progression: ["D7"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(secondary.chords[0].role, "secondaryDominant")
  assert.equal(secondary.chords[0].resolutionTarget.targetRoot, "G")
  assert.equal(secondary.chords[0].resolutionTarget.targetScaleDegree, 4)

  const leadingTone = analyzeProgressionState({
    progression: ["Bdim"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(leadingTone.chords[0].role, "leadingTone")
  assert.equal(leadingTone.chords[0].resolutionTarget.targetRoot, "C")
  assert.equal(leadingTone.chords[0].resolutionTarget.mandatorySoon, true)
})

test("progression suggestions follow fixed-key functional examples", () => {
  const opening = buildProgressionSuggestions({
    progression: [],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(opening.simple[0], "C")

  const predominant = buildProgressionSuggestions({
    progression: ["Dm"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(predominant.simple[0], "G")

  const dominant = buildProgressionSuggestions({
    progression: ["G"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(dominant.simple[0], "C")
  assert.ok(![...dominant.simple, ...dominant.complex].includes("F#m"))

  const applied = buildProgressionSuggestions({
    progression: ["A7"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(applied.simple[0], "Dm")
  assert.ok(![...applied.simple, ...applied.complex].includes("D7"))
  assert.ok(![...applied.simple, ...applied.complex].includes("D"))

  const leadingTone = buildProgressionSuggestions({
    progression: ["Bdim"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(leadingTone.simple[0], "C")
  assert.ok(![...leadingTone.simple, ...leadingTone.complex].includes("E"))
})

test("progression suggestions expose fixed-key debug metadata and score tiers", () => {
  const suggestions = buildProgressionSuggestions({
    progression: ["Dm", "G7"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  const debugItems = [...suggestions.debug.simple, ...suggestions.debug.complex]
  const bestSource = new Set([
    ...suggestions.simple,
    ...suggestions.complex,
    ...buildDiatonicChords("C", "Ionian")
  ])

  assert.ok(debugItems.length > 0)
  assert.ok(suggestions.best)
  assert.ok(bestSource.has(suggestions.best.symbol))
  assert.ok(suggestions.best.breakdown.parts.some(part => part.label === "believable resolution route"))
  assert.ok(debugItems.every(item => item.context.key === "C"))
  assert.ok(debugItems.every(item => item.context.tonicRoot === "C"))
  assert.ok(debugItems.every(item => item.role))
  assert.ok(debugItems.every(item => item.generatedBecause.length > 0))
  assert.ok(debugItems.every(item => item.validBecause.length > 0))
  assert.ok(debugItems.every(item => item.resolvesTo && "targetRoot" in item.resolvesTo))

  const tierNames = ["hardConstraints", "playability", "harmonicCorrectness", "preference"]
  assert.ok(debugItems.every(item => tierNames.every(tier => tier in item.breakdown.tiers)))
})

test("functional chord universe exposes harmonic families in the fixed key", () => {
  const universe = buildFunctionalChordUniverse({ key: "C", mode: "Ionian" })
  const bySymbol = new Map(universe.map(entry => [entry.symbol, entry]))

  assert.equal(bySymbol.get("C")?.role, "tonic")
  assert.equal(bySymbol.get("Dm")?.role, "predominant")
  assert.equal(bySymbol.get("G")?.role, "dominant")
  assert.equal(bySymbol.get("Bdim")?.role, "leadingTone")
  assert.equal(bySymbol.get("Bdim")?.target.targetRoot, "C")
  assert.equal(bySymbol.get("A7")?.family, "appliedDominant")
  assert.equal(bySymbol.get("A7")?.target.targetRoot, "D")
  assert.equal(bySymbol.get("Fm")?.family, "borrowed")
  assert.equal(bySymbol.get("Fm")?.role, "borrowedPredominant")
})

test("functional suggestions resolve active tension inside a short window", () => {
  const dominant = buildProgressionSuggestions({
    progression: ["G"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 2
  })
  assert.equal(dominant.simple[0], "C")

  const applied = buildProgressionSuggestions({
    progression: ["D7"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 2
  })
  assert.equal(applied.simple[0], "G")
})

test("functional suggestions complete common musical sentences", () => {
  const predominant = buildProgressionSuggestions({
    progression: ["C", "F"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.ok(predominant.simple.slice(0, 2).includes("G"))

  const cadence = buildProgressionSuggestions({
    progression: ["Am", "Dm", "G"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(cadence.simple[0], "C")

  const axis = buildProgressionSuggestions({
    progression: ["C", "G", "Am"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.ok(axis.simple.slice(0, 2).includes("F"))
})

test("debug explanations read as musical theory notes", () => {
  const suggestions = buildProgressionSuggestions({
    progression: ["D7"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 2
  })
  const debug = [...suggestions.debug.simple, ...suggestions.debug.complex].find(item => item.symbol === "G")

  assert.ok(debug)
  assert.equal(debug.context.key, "C")
  assert.equal(debug.resolvesTo.targetRoot, "C")
  assert.match(debug.theoryNote, /functions|cadence|diatonic|dominant|tonic/)
  assert.match(debug.resolutionNote, /points toward|resolution/)
  assert.match(debug.rankNote, /resolves|ranked|phrase/)
  assert.ok(debug.completionPath.length > 0)
})

test("debug scoring explains playability, voice leading, common notes, and completion route", () => {
  const suggestions = buildProgressionSuggestions({
    progression: ["A7"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  const debug = suggestions.debug.simple.find(item => item.symbol === "Dm")

  assert.ok(debug)
  assert.deepEqual(debug.completionPath, ["Dm", "G7", "C"])
  assert.notEqual(debug.breakdown.tiers.playability, 0)
  assert.ok(debug.breakdown.parts.some(part => part.label === "guitar voicing feasibility"))
  assert.ok(debug.breakdown.parts.some(part => part.label === "voice leading: common notes and stepwise motion"))
  assert.ok(debug.breakdown.parts.some(part => part.label === "common-note connection"))
  assert.match(debug.rankNote, /common tone/)
  assert.match(debug.rankNote, /Strongest factors/)
  assert.match(debug.rankNote, /Limiting factors|not held back/)
})

test("contextual analysis exposes multiple resolution routes without changing tonic", () => {
  const chain = analyzeProgressionState({
    progression: ["Em", "A7", "Dm"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })

  assert.equal(chain.tonicRoot, "C")
  assert.equal(chain.chords[0].role, "passingChord")
  assert.equal(chain.chords[0].resolutionTarget.targetRoot, "A")
  assert.equal(chain.chords[1].role, "secondaryDominant")
  assert.equal(chain.chords[1].resolutionTarget.targetRoot, "D")
  assert.ok(chain.chords[1].resolutionTarget.strength > 80)
  assert.ok(chain.chords[1].resolutionTarget.secondaryTargets.some(target => target.targetRoot === "G"))
  assert.ok(chain.chords[1].resolutionTarget.secondaryTargets.some(target => target.targetRoot === "C"))

  const dominant = analyzeProgressionState({
    progression: ["G"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(dominant.chords[0].resolutionTarget.targetRoot, "C")
  assert.ok(dominant.chords[0].resolutionTarget.secondaryTargets.some(target => {
    return target.targetRoot === "A" && target.resolutionType === "deceptive"
  }))
})

test("basic, applied, and borrowed resolutions rank the expected fixed-key target first", () => {
  const cases = [
    { progression: ["C", "G"], expected: "C" },
    { progression: ["Dm", "G"], expected: "C" },
    { progression: ["Bdim"], expected: "C" },
    { progression: ["A7"], expected: "Dm" },
    { progression: ["D7"], expected: "G" },
    { progression: ["E7", "Am", "Dm", "G"], expected: "C" },
    { progression: ["Fm", "G"], expected: "C" },
    { progression: ["Bb", "G"], expected: "C" }
  ]

  for(const item of cases) {
    const suggestions = buildProgressionSuggestions({
      progression: item.progression,
      key: "C",
      mode: "Ionian",
      resolveWithin: 4
    })

    assert.equal(suggestions.simple[0], item.expected, item.progression.join(" -> "))
  }
})

test("resolveWithin four-chord windows resolve or sustain tonic when resolution is expected", () => {
  const cases = [
    { progression: ["C", "F", "G", "C"], phrase: "postCadentialRelease" },
    { progression: ["Dm", "G", "C", "G"], phrase: "cadential" },
    { progression: ["A7", "Dm", "G", "C"], phrase: "postCadentialRelease" },
    { progression: ["C", "Am", "Dm", "G"], phrase: "cadential" }
  ]

  for(const item of cases) {
    const state = analyzeProgressionState({
      progression: item.progression,
      key: "C",
      mode: "Ionian",
      resolveWithin: 4
    })
    const suggestions = buildProgressionSuggestions({
      progression: item.progression,
      key: "C",
      mode: "Ionian",
      resolveWithin: 4
    })

    assert.equal(state.phrasePosition, item.phrase, item.progression.join(" -> "))
    assert.equal(suggestions.simple[0], "C", item.progression.join(" -> "))
  }
})

test("phrase position actively shapes generation and ranking", () => {
  const opening = buildProgressionSuggestions({
    progression: [],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(opening.simple[0], "C")
  assert.ok(!opening.simple.includes("Bdim"))

  const preCadential = analyzeProgressionState({
    progression: ["C", "G", "Am"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  const preCadentialSuggestions = buildProgressionSuggestions({
    progression: ["C", "G", "Am"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(preCadential.phrasePosition, "preCadential")
  assert.equal(preCadential.harmonicNeed, "preparation")
  assert.equal(preCadentialSuggestions.simple[0], "F")

  const loop = analyzeProgressionState({
    progression: ["C", "G", "Am", "F"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(loop.phrasePosition, "loopingVamp")
  assert.equal(loop.harmonicNeed, "prolongation")
})

test("lookahead and voice-leading components are visible in debug scoring", () => {
  const applied = buildProgressionSuggestions({
    progression: ["A7"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  const dm = applied.debug.simple.find(item => item.symbol === "Dm")
  assert.ok(dm)
  assert.deepEqual(dm.completionPath, ["Dm", "G7", "C"])
  assert.ok(dm.breakdown.parts.some(part => {
    return part.label === "short lookahead resolution path" && part.weighted > 0
  }))
  assert.ok(dm.breakdown.parts.some(part => {
    return part.label === "current harmonic need fit" && part.weighted > 0
  }))

  const afterC = buildProgressionSuggestions({
    progression: ["C"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  const am = afterC.debug.simple.find(item => item.symbol === "Am")
  const dmAfterC = afterC.debug.simple.find(item => item.symbol === "Dm")
  const commonToneRaw = item => item.breakdown.parts.find(part => part.label === "common-note connection").raw

  assert.ok(am)
  assert.ok(dmAfterC)
  assert.ok(commonToneRaw(am) > commonToneRaw(dmAfterC))
})

test("complex suggestions include color while near-resolution lists keep non-tonic options", () => {
  const afterC = buildProgressionSuggestions({
    progression: ["C"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.ok(afterC.complex.some(symbol => /maj7|m11|7b5|9|13/.test(symbol)))
  assert.ok(afterC.complex.some(symbol => parseChordSymbol(symbol)?.root !== "C"))

  const afterDominant = buildProgressionSuggestions({
    progression: ["G"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  const all = [...afterDominant.simple, ...afterDominant.complex]
  const tonicVariants = all.filter(symbol => parseChordSymbol(symbol)?.root === "C")

  assert.ok(all.includes("Em") || all.includes("Am"))
  assert.ok(tonicVariants.length / all.length <= 0.7)
  assert.ok(afterDominant.best)
  assert.ok(new Set([...afterDominant.simple, ...afterDominant.complex].slice(0, 3)).has(afterDominant.best.symbol))
})

test("pattern preference helps but does not override harmonic correctness", () => {
  const axis = buildProgressionSuggestions({
    progression: ["C", "G", "Am"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(axis.simple[0], "F")

  const dominant = buildProgressionSuggestions({
    progression: ["G"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.equal(dominant.simple[0], "C")
  assert.ok(dominant.simple.indexOf("Am") > dominant.simple.indexOf("C"))
  assert.ok(![...dominant.simple, ...dominant.complex].includes("F#"))
})

test("progression completion keeps input fixed and follows the functional path", () => {
  const cf = buildProgressionCompletion({
    progression: ["C", "F"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.deepEqual(cf.fixedInput, ["C", "F"])
  assert.deepEqual(cf.suggestedContinuation, ["G", "C"])
  assert.equal(cf.finalResolvesToTonic, true)

  const iiV = buildProgressionCompletion({
    progression: ["Dm", "G"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.deepEqual(iiV.suggestedContinuation, ["C"])

  const applied = buildProgressionCompletion({
    progression: ["A7"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.deepEqual(applied.suggestedContinuation, ["Dm", "G", "C"])

  const vamp = buildProgressionCompletion({
    progression: ["C", "G", "Am"],
    key: "C",
    mode: "Ionian",
    resolveWithin: 4
  })
  assert.deepEqual(vamp.suggestedContinuation, ["F"])
  assert.equal(vamp.finalTonicBehavior, "loopingOpen")
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
  assert.equal(inferChordSymbol(["D", "F", "A", "C", "E", "G"], "C", "Ionian"), "Dm11")
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
  assert.equal(inferChordSymbol(["C", "E", "G#", "Bb"]), "C7#5")
})

test("infers partial, rootless, altered, and inversion chord names", () => {
  assert.equal(inferChordSymbol(["C", "E", "Bb"]), "C7")
  assert.equal(inferChordSymbol(["E", "Bb", "D"]), "C9")
  assert.equal(inferChordSymbol(["G", "B", "E"]), "Cmaj7/E")
  assert.equal(inferChordSymbol(["E", "G", "C"]), "C/E")
  assert.equal(inferChordSymbol(["G", "C", "E"]), "C/G")
  assert.equal(inferChordSymbol(["C", "E", "G", "Bb", "A"]), "C13")
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
  assert.equal(canNameChord(["C", "E", "G"]), true)
  assert.equal(canNameChord(["C", "Eb", "G"]), true)
  assert.equal(canNameChord(["C", "E", "G", "Bb"]), true)
  assert.equal(canNameChord(["E", "Bb", "D"]), true)

  assert.equal(canNameChord(["C"]), false)
  assert.equal(canNameChord(["C", "E"]), false)
  assert.equal(canNameChord(["C", "G"]), false)
  assert.equal(canNameChord(["C", "E", "C"]), false)
  assert.equal(canNameChord(["C", "C", "C"]), false)
  assert.equal(canNameChord(["C", "C#", "F#"]), false)
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

function frettedSpan(voicing) {
  const fretted = voicing.map(entry => entry.fret).filter(fret => fret > 0)
  if(fretted.length <= 1) return 0
  return Math.max(...fretted) - Math.min(...fretted)
}

function maxPlayableSpanForVoicing(voicing) {
  const fretted = voicing.map(entry => entry.fret).filter(fret => fret > 0)
  if(fretted.length <= 1) return 0
  const min = Math.min(...fretted)
  if(min <= 4) return 4
  if(min <= 8) return 5
  if(min <= 12) return 6
  return 7
}

function hasUnplayableFretJump(voicing) {
  const fretted = voicing
    .filter(entry => entry.fret > 0)
    .sort((a, b) => a.string - b.string)

  for(let i = 1; i < fretted.length; i++) {
    const fretJump = Math.abs(fretted[i].fret - fretted[i - 1].fret)
    const stringJump = fretted[i].string - fretted[i - 1].string
    if(fretJump >= 5 && stringJump <= 2) return true
  }

  return false
}

function isHumanPlayableVoicing(voicing) {
  const frets = voicing.map(entry => entry.fret)
  return frettedSpan(voicing) <= maxPlayableSpanForVoicing(voicing) &&
    !(frets.includes(0) && Math.max(...frets) > 7) &&
    !hasUnplayableFretJump(voicing)
}

function uniquePitchCount(voicing) {
  return new Set(voicing.map(entry => entry.note)).size
}

function voicingFrets(voicing) {
  return voicing.map(entry => entry.fret)
}

function hasDefiningTone(voicing) {
  return voicing.some(entry => ["3", "b3", "7", "b7", "bb7", "2", "4", "b9", "#9", "9", "11", "13"].includes(entry.role))
}

function hasTriadCore(voicing) {
  const roles = new Set(voicing.map(entry => entry.role))
  return roles.has("1") &&
    (roles.has("3") || roles.has("b3")) &&
    (roles.has("5") || roles.has("b5") || roles.has("#5"))
}

function hasSeventh(voicing) {
  return voicing.some(entry => ["7", "b7", "bb7"].includes(entry.role))
}

function fretZone(voicing) {
  const min = Math.min(...voicing.map(entry => entry.fret))
  if(min <= 2) return 0
  if(min <= 5) return 1
  if(min <= 8) return 2
  if(min <= 11) return 3
  return 4
}

test("voicing quality rules hold across generated string sets", () => {
  const symbols = ["C", "Cm", "Cmaj7", "C9", "C13", "C7#5", "Dadd9", "Fmaj9", "G7b5/C"]

  for(const symbol of symbols) {
    for(const stringCount of [3, 4, 5, 6]) {
      const analysis = analyzeChord({ symbol, stringCount, key: "C", mode: "Ionian" })

      assert.ok(analysis.voicings.length <= 12, `${symbol} should stay within the voicing cap`)
      assert.ok(analysis.voicings.every(voicing => voicing.length === stringCount), `${symbol} should keep the requested string count`)
      assert.ok(analysis.voicings.every(isHumanPlayableVoicing), `${symbol} should avoid impossible stretches`)
      assert.ok(analysis.voicings.every(voicing => uniquePitchCount(voicing) >= Math.min(3, stringCount)), `${symbol} should keep meaningful pitch variety`)
      assert.ok(analysis.voicings.every(hasDefiningTone), `${symbol} should preserve chord identity`)
    }
  }
})

test("extended voicings can use triad cores without forced sevenths", () => {
  for(const symbol of ["Cmaj7", "Cmaj9", "C13", "Dm11", "Fmaj9"]) {
    const compact = analyzeChord({ symbol, stringCount: 3, key: "C", mode: "Ionian" })

    assert.ok(compact.voicings.length > 0, `${symbol} should produce compact voicings`)
    assert.ok(
      compact.voicings.some(voicing => hasTriadCore(voicing) && !hasSeventh(voicing)),
      `${symbol} should allow a compact triad-core voicing without forcing the seventh`
    )
  }

  for(const symbol of ["C7#5", "G7b5/C"]) {
    const altered = analyzeChord({ symbol, stringCount: 4, key: "C", mode: "Ionian" })
    assert.ok(altered.voicings.some(hasSeventh), `${symbol} should still offer seventh-bearing altered voicings`)
  }
})

test("smart string selector favors standard full guitar forms for common chords", () => {
  const cases = [
    { symbol: "Am", stringCount: 5, frets: [0, 2, 2, 1, 0] },
    { symbol: "C", stringCount: 5, frets: [3, 2, 0, 1, 0] },
    { symbol: "G", stringCount: 6, frets: [3, 2, 0, 0, 0, 3] },
    { symbol: "E", stringCount: 6, frets: [0, 2, 2, 1, 0, 0] },
    { symbol: "D", stringCount: 4, frets: [0, 2, 3, 2] },
    { symbol: "F", stringCount: 6, frets: [1, 3, 3, 2, 1, 1] },
    { symbol: "Bm", stringCount: 5, frets: [2, 4, 4, 3, 2] }
  ]

  for(const item of cases) {
    const stringCount = smartStringCountForChord({ symbol: item.symbol, key: "C", mode: "Ionian" })
    const analysis = analyzeChord({ symbol: item.symbol, stringCount, key: "C", mode: "Ionian" })

    assert.equal(stringCount, item.stringCount, `${item.symbol} should choose its standard string span`)
    assert.deepEqual(voicingFrets(analysis.voicings[0]), item.frets, `${item.symbol} should put the standard form first`)
  }
})

test("voicing counts scale by string set without exceeding musical limits", () => {
  const symbols = ["C", "Cmaj7", "Dadd9", "Fmaj9", "C13"]
  const averageCount = stringCount => {
    const counts = symbols.map(symbol => analyzeChord({ symbol, stringCount, key: "C", mode: "Ionian" }).voicings.length)
    return counts.reduce((sum, count) => sum + count, 0) / counts.length
  }

  assert.ok(averageCount(3) >= averageCount(6))
  assert.ok(averageCount(3) >= averageCount(4))
  assert.ok(averageCount(4) >= averageCount(6))
  assert.ok(averageCount(6) <= 4)

  const slashExtensionCounts = [3, 4].map(stringCount => {
    return analyzeChord({ symbol: "Gmaj7/E", stringCount, key: "C", mode: "Ionian" }).voicings.length
  })
  assert.ok(slashExtensionCounts[0] >= slashExtensionCounts[1])
})

test("smart string selector chooses the most suitable span for the chord", () => {
  assert.equal(smartStringCountForChord({ symbol: "C", key: "C", mode: "Ionian" }), 5)
  assert.equal(smartStringCountForChord({ symbol: "Gmaj7/E", key: "C", mode: "Ionian" }), 5)
  assert.equal(smartStringCountForChord({ symbol: "C13", key: "C", mode: "Ionian" }), 5)
  assert.equal(
    smartStringCountForChord({ symbol: "C", key: "C", mode: "Ionian", previousStringCount: 6, previousChord: "G" }),
    5
  )
  assert.equal(smartStringCountForChord({ symbol: "definitely-not-a-chord", key: "C", mode: "Ionian" }), 4)
})

test("voicing selection spreads usable shapes across the fretboard", () => {
  for(const symbol of ["C", "Cmaj7", "Dadd9", "Fmaj9"]) {
    const analysis = analyzeChord({ symbol, stringCount: 4, key: "C", mode: "Ionian" })
    const zones = new Set(analysis.voicings.map(fretZone))

    assert.ok(zones.size >= 3, `${symbol} should offer low, middle, and upper positions when enough shapes exist`)
  }
})

test("voicing scores keep playable and harmonically clear shapes near the front", () => {
  const analysis = analyzeChord({ symbol: "Cmaj7", stringCount: 4, key: "C", mode: "Ionian" })
  const firstScore = analysis.voicing_scores[0].total
  const medianScore = [...analysis.voicing_scores].sort((a, b) => a.total - b.total)[Math.floor(analysis.voicing_scores.length / 2)].total

  assert.ok(firstScore <= medianScore)
  assert.ok(isHumanPlayableVoicing(analysis.voicings[0]))
  assert.ok(hasDefiningTone(analysis.voicings[0]))
})

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
