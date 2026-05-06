export type Fret = number | "x"

export type Quality =
  | "maj"
  | "m"
  | "7"
  | "7b5"
  | "7#5"
  | "7b9"
  | "7#9"
  | "maj7"
  | "6"
  | "m6"
  | "add9"
  | "madd9"
  | "6add9"
  | "maj9"
  | "m9"
  | "9"
  | "11"
  | "13"
  | "m7"
  | "m11"
  | "m7b5"
  | "dim"
  | "dim7"
  | "sus2"
  | "sus4"
  | "7sus2"
  | "7sus4"
  | "aug"

type ChordShape = {
  notes: string[]
  roles: string[]
}

type VoicingGapMetadata = {
  hasGap: boolean
  gapCount: number
  maxGapSize: number
  isMeaningfulGap: boolean
  extensionOnHigherString: boolean
  fillableGapPenalty: number
}

type ParsedChord = {
  root: string
  rootSpelling: string
  type: Quality
  bass?: string
  bassSpelling?: string
  symbol: string
}

export type CandidateEntry = {
  string: number
  fret: number
  note: string
  role: string
}

type ChordAnalysisResult = {
  chord_name: string
  voicings: CandidateEntry[][]
  voicing_scores?: ScoreBreakdown[]
  suggestions: string[]
  key_context: string
  scale_notes: string[]
  diatonic_chords: string[]
  degree: string | null
  parsed: ParsedChord
}

export type ProgressionSuggestionSet = {
  simple: string[]
  complex: string[]
  best?: ProgressionSuggestionDebug
  debug?: {
    simple: ProgressionSuggestionDebug[]
    complex: ProgressionSuggestionDebug[]
  }
}

export type ProgressionCompletion = {
  fixedInput: string[]
  suggestedContinuation: string[]
  phrasePosition: PhrasePosition
  resolutionPath: string[]
  finalResolvesToTonic: boolean
  finalTonicBehavior: "resolvedToTonic" | "tonicProlongation" | "loopingOpen" | "unresolved"
  explanation: string
  debug: ProgressionSuggestionDebug[]
}

type ScoreTier = "hardConstraints" | "playability" | "harmonicCorrectness" | "preference"

export type ScoreBreakdownPart = {
  tier: ScoreTier
  label: string
  raw: number
  normalized: number
  weighted: number
}

export type ScoreBreakdown = {
  direction: "higher" | "lower"
  total: number
  tiers: Record<ScoreTier, number>
  parts: ScoreBreakdownPart[]
}

type ProgressionSuggestionDebug = {
  symbol: string
  score: number
  breakdown: ScoreBreakdown
  role: HarmonicFunction
  family: CandidateFamily
  generatedBecause: string[]
  validBecause: string[]
  resolvesTo: ResolutionTarget
  context: ProgressionDebugContext
  theoryNote: string
  resolutionNote: string
  rankNote: string
  completionPath: string[]
}

export type HarmonicFunction =
  | "tonic"
  | "tonicSubstitute"
  | "predominant"
  | "dominant"
  | "secondaryDominant"
  | "leadingTone"
  | "borrowedPredominant"
  | "borrowedDominant"
  | "chromaticColor"
  | "color"
  | "passingChord"
  | "approachChord"
  | "cadenceChord"

export type PhrasePosition =
  | "startOfPhrase"
  | "midPhraseContinuation"
  | "preCadential"
  | "cadential"
  | "postCadentialRelease"
  | "loopingVamp"

export type ResolutionType = "direct" | "delayed" | "deceptive"

export type HarmonicNeed =
  | "stability"
  | "movement"
  | "preparation"
  | "tension"
  | "resolution"
  | "prolongation"
  | "deceptiveDelay"
  | "cadenceCompletion"

export type ResolutionOption = {
  targetRoot: string
  targetScaleDegree: number | null
  targetChordType?: Quality
  strength: number
  resolutionType: ResolutionType
  expectedDistance: number
  chordsUntilExpectedResolution: number
  mandatorySoon: boolean
  overdue: boolean
  via?: string[]
}

export type ResolutionTarget = ResolutionOption & {
  secondaryTargets: ResolutionOption[]
}

export type CandidateFamily =
  | "diatonic"
  | "appliedDominant"
  | "leadingTone"
  | "borrowed"
  | "cadential"
  | "prolongation"
  | "chromaticColor"
  | "approach"
  | "passing"

export type FunctionalChordEntry = {
  symbol: string
  root: string
  type: Quality
  bass?: string
  notes: string[]
  inKey: boolean
  family: CandidateFamily
  families: CandidateFamily[]
  role: HarmonicFunction
  target: ResolutionTarget
  theoryNote: string
  resolutionNote: string
}

type ResolutionPlan = {
  resolveWithin: number
  slotsToResolution: number
  resolutionDue: boolean
  targetRoot: string
}

type ParsedProgressionChord = {
  symbol: string
  parsed: ParsedChord
  notes: string[]
}

export type AnalyzedProgressionChord = {
  symbol: string
  root: string
  type: Quality
  bass?: string
  notes: string[]
  scaleDegree: number | null
  role: HarmonicFunction
  tension: number
  resolutionTarget: ResolutionTarget
  resolutionOptions: ResolutionOption[]
}

export type HarmonicContext = {
  key: string
  mode: string
  tonicScaleDegree: 0
  tonicRoot: string
  currentChord: AnalyzedProgressionChord | null
  previousChord: AnalyzedProgressionChord | null
  phrasePosition: PhrasePosition
  resolveWithin: number
  slotsToResolution: number
  resolutionDue: boolean
  currentTensionState: {
    level: number
    label: "rest" | "stable" | "moving" | "tense" | "urgent"
  }
  currentHarmonicFunctionState: HarmonicFunction | null
  currentTargetChordState: ResolutionTarget
  harmonicNeed: HarmonicNeed
}

export type ProgressionState = {
  key: string
  mode: string
  tonicRoot: string
  scale: string[]
  chordSequence: string[]
  chords: AnalyzedProgressionChord[]
  fixedAnchors: boolean[]
  isCompletingProgression: boolean
  phraseLength: number
  phrasePosition: PhrasePosition
  cadencePressure: number
  tensionLevel: number
  targetChord: ResolutionTarget
  targetFunction: HarmonicFunction | null
  remainingSlotsToResolution: number
  harmonicNeed: HarmonicNeed
  context: HarmonicContext
}

type ProgressionDebugContext = {
  key: string
  mode: string
  tonicRoot: string
  tonicScaleDegree: 0
  phrasePosition: PhrasePosition
  tensionLevel: number
  cadencePressure: number
  slotsToResolution: number
  resolutionDue: boolean
  harmonicNeed: HarmonicNeed
}

export const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
const NOTES = NOTE_ORDER
const TUNING = ["E","A","D","G","B","E"]
const TUNING_MIDI = [40, 45, 50, 55, 59, 64]
const FRETBOARD_MAX_FRET = 18
const VOICING_WINDOW_ANCHORS = [0, 2, 4, 6, 8, 10, 12, 14]
const THREE_STRING_VOICING_WINDOW_ANCHORS = Array.from({ length: 16 }, (_, index) => index)
const voicingGenerationCache = new Map<string, CandidateEntry[][]>()

const SCORE_CONFIG = {
  progression: {
    direction: "higher" as const,
    tierWeights: {
      hardConstraints: 1,
      playability: 1,
      harmonicCorrectness: 1,
      preference: 0.72
    },
    components: {
      generatedCandidate: { tier: "hardConstraints" as const, weight: 0, scale: 1 },
      musicalRejection: { tier: "hardConstraints" as const, weight: 0, scale: 1 },
      guitarVoicingFeasibility: { tier: "playability" as const, weight: 10, scale: 80 },
      guitarVoicingBalance: { tier: "playability" as const, weight: 8, scale: 70 },
      targetMotion: { tier: "harmonicCorrectness" as const, weight: 18, scale: 60 },
      qualityFit: { tier: "harmonicCorrectness" as const, weight: 12, scale: 12 },
      voiceLeading: { tier: "harmonicCorrectness" as const, weight: 14, scale: 70 },
      tendencyResolution: { tier: "harmonicCorrectness" as const, weight: 18, scale: 100 },
      inKeyAffinity: { tier: "harmonicCorrectness" as const, weight: 9, scale: 32 },
      chromaticPull: { tier: "harmonicCorrectness" as const, weight: 12, scale: 80 },
      fixedTonicRelation: { tier: "harmonicCorrectness" as const, weight: 14, scale: 80 },
      functionalRole: { tier: "harmonicCorrectness" as const, weight: 22, scale: 140 },
      functionalNeed: { tier: "harmonicCorrectness" as const, weight: 24, scale: 100 },
      resolutionIntent: { tier: "harmonicCorrectness" as const, weight: 18, scale: 90 },
      resolutionRoute: { tier: "harmonicCorrectness" as const, weight: 24, scale: 100 },
      lookaheadResolution: { tier: "harmonicCorrectness" as const, weight: 28, scale: 120 },
      harmonicNeedFit: { tier: "harmonicCorrectness" as const, weight: 22, scale: 100 },
      phraseFunction: { tier: "harmonicCorrectness" as const, weight: 20, scale: 90 },
      tensionManagement: { tier: "harmonicCorrectness" as const, weight: 18, scale: 90 },
      cadenceBehavior: { tier: "harmonicCorrectness" as const, weight: 22, scale: 100 },
      commonToneConnection: { tier: "preference" as const, weight: 12, scale: 36 },
      patternMatch: { tier: "preference" as const, weight: 24, scale: 140 },
      phrasePosition: { tier: "preference" as const, weight: 8, scale: 28 },
      familyPriority: { tier: "preference" as const, weight: 12, scale: 60 },
      sentenceCompletion: { tier: "preference" as const, weight: 20, scale: 110 },
      bassMotion: { tier: "preference" as const, weight: 8, scale: 90 },
      sameRootColor: { tier: "preference" as const, weight: 5, scale: 18 },
      recentSymbolPenalty: { tier: "preference" as const, weight: 18, scale: 60 },
      recentRootPenalty: { tier: "preference" as const, weight: 6, scale: 8 }
    }
  },
  voicing: {
    direction: "lower" as const,
    tierWeights: {
      hardConstraints: 1,
      playability: 1,
      harmonicCorrectness: 1,
      preference: 1
    },
    components: {
      generatedVoicing: { tier: "hardConstraints" as const, weight: 0, scale: 1 },
      fretSpan: { tier: "playability" as const, weight: 12, scale: 7 },
      averageFret: { tier: "playability" as const, weight: 8, scale: 12 },
      frettedSpan: { tier: "playability" as const, weight: 8, scale: 7 },
      positionCoherence: { tier: "playability" as const, weight: 16, scale: 120 },
      fingeringAwkwardness: { tier: "playability" as const, weight: 14, scale: 10 },
      requiredBass: { tier: "harmonicCorrectness" as const, weight: 26, scale: 1 },
      definingTone: { tier: "harmonicCorrectness" as const, weight: 22, scale: 1 },
      colorToneCoverage: { tier: "harmonicCorrectness" as const, weight: 14, scale: 1 },
      rootBassPreference: { tier: "preference" as const, weight: 10, scale: 1 },
      openPositionPreference: { tier: "preference" as const, weight: 10, scale: 1 },
      commonGuitarShape: { tier: "preference" as const, weight: 18, scale: 1.5 },
      pitchVariety: { tier: "preference" as const, weight: 12, scale: 2 },
      duplicateTonePenalty: { tier: "preference" as const, weight: 6, scale: 3 },
      stringGapPenalty: { tier: "preference" as const, weight: 8, scale: 2 },
      stringGroupPreference: { tier: "preference" as const, weight: 8, scale: 12 }
    }
  }
}

function emptyScoreBreakdown(direction: ScoreBreakdown["direction"]): ScoreBreakdown {
  return {
    direction,
    total: 0,
    tiers: {
      hardConstraints: 0,
      playability: 0,
      harmonicCorrectness: 0,
      preference: 0
    },
    parts: []
  }
}

function clampUnit(value: number) {
  return Math.max(-1, Math.min(1, value))
}

function normalizeMetric(raw: number, scale: number) {
  if(scale <= 0) return raw === 0 ? 0 : Math.sign(raw)
  return clampUnit(raw / scale)
}

function addScorePart(
  breakdown: ScoreBreakdown,
  tierWeights: Record<ScoreTier, number>,
  tier: ScoreTier,
  label: string,
  raw: number,
  weight: number,
  scale: number
) {
  const normalized = normalizeMetric(raw, scale)
  const weighted = normalized * weight * tierWeights[tier]

  breakdown.parts.push({
    tier,
    label,
    raw,
    normalized,
    weighted
  })
  breakdown.tiers[tier] += weighted
  breakdown.total += weighted

  return weighted
}

function normalize(note: string): string {
  const clean = note.trim()
    .replace(/\u266d/g, "b")
    .replace(/\u266f/g, "#")
  const canonical = clean.charAt(0).toUpperCase() + clean.slice(1)
  const map: Record<string,string> = {
    "B#": "C",
    Cb: "B",
    Db: "C#",
    "E#": "F",
    Eb: "D#",
    Fb: "E",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#"
  }
  return map[canonical] || canonical
}

function normalizeNoteSpelling(note: string) {
  const clean = note.trim()
    .replace(/\u266d/g, "b")
    .replace(/\u266f/g, "#")

  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

function parseBareNote(note: string) {
  const spelling = normalizeNoteSpelling(note)
  if(!spelling.match(/^[A-G](?:#|b)?$/)) return null

  const pitch = normalize(spelling)
  if(!NOTES.includes(pitch)) return null

  return {
    pitch,
    spelling
  }
}

function idx(note: string) {
  return NOTES.indexOf(normalize(note))
}

function add(root: string, semitones: number) {
  return NOTES[(idx(root)+semitones+1200)%12]
}

function fretNote(open: string, fret: number) {
  return add(open, fret)
}

function fretsForNote(open: string, note: string) {
  const frets: number[] = []
  for(let fret = 0; fret <= FRETBOARD_MAX_FRET; fret++) {
    if(fretNote(open, fret) === note) frets.push(fret)
  }
  return frets
}

function parseQualityTail(tail: string): Quality | null {
  const symbolic = tail
    .replace(/\u266d/g, "b")
    .replace(/\u266f/g, "#")
    .replace(/\u0394/g, "maj")
    .replace(/\u03b4/g, "maj")
    .replace(/\u00b0/g, "dim")
    .replace(/\u00f8(?:7)?/g, "m7b5")

  if(symbolic === "M") return "maj"
  if(symbolic === "M7") return "maj7"

  const clean = symbolic.toLowerCase()
  const aliases: Record<string, Quality> = {
    "": "maj",
    maj: "maj",
    major: "maj",
    m: "m",
    min: "m",
    minor: "m",
    "-": "m",
    "7": "7",
    "6": "6",
    "7b5": "7b5",
    "7#5": "7#5",
    "7+5": "7#5",
    "7b9": "7b9",
    "7#9": "7#9",
    maj7: "maj7",
    ma7: "maj7",
    major7: "maj7",
    m7: "m7",
    min7: "m7",
    minor7: "m7",
    "-7": "m7",
    m7b5: "m7b5",
    min7b5: "m7b5",
    minor7b5: "m7b5",
    halfdim: "m7b5",
    halfdim7: "m7b5",
    dim: "dim",
    o: "dim",
    dim7: "dim7",
    o7: "dim7",
    sus2: "sus2",
    sus4: "sus4",
    "7sus2": "7sus2",
    "7sus4": "7sus4",
    aug: "aug",
    "+": "aug",
    add9: "add9",
    add2: "add9",
    "6add9": "6add9",
    "6/9": "6add9",
    "maj9": "maj9",
    "m9": "m9",
    "9": "9",
    "dom9": "9",
    "11": "11",
    "dom11": "11",
    "13": "13",
    "dom13": "13",
    m11: "m11",
    min11: "m11",
    minor11: "m11",
    "madd9": "madd9",
    "madd2": "madd9",
    m6: "m6",
    "m6add9": "m6"
  }

  return aliases[clean] ?? null
}

function symbolForParsed(parsed: ParsedChord) {
  const suffix = QUALITY_SUFFIX[parsed.type]
  return parsed.bass && parsed.bass !== parsed.root
    ? `${parsed.rootSpelling}${suffix}/${parsed.bassSpelling ?? parsed.bass}`
    : `${parsed.rootSpelling}${suffix}`
}

function parseCore(symbol: string): ParsedChord | null {
  const m = symbol.trim().match(/^([A-G](?:#|b|\u266d|\u266f)?)(.*)$/i)
  if(!m) return null

  const note = parseBareNote(m[1])
  if(!note) return null

  const type = parseQualityTail(m[2] || "")
  if(!type) return null

  const parsed = {
    root: note.pitch,
    rootSpelling: note.spelling,
    type,
    symbol: ""
  }

  return {
    ...parsed,
    symbol: symbolForParsed(parsed)
  }
}

function parse(symbol: string): ParsedChord {
  const clean = symbol.trim().replace(/\s+/g, "")
  return parseChordSymbol(clean) || {
    root: "C",
    rootSpelling: "C",
    type: "maj",
    symbol: "C"
  }
}

export function normalizeNote(note: string) {
  return normalize(note)
}

export function parseChordSymbol(symbol: string): ParsedChord | null {
  const clean = symbol.trim().replace(/\s+/g, "")
  if(!clean) return null

  const slashParts = clean.split("/")
  if(slashParts.length > 2 || slashParts.some(part => part.length === 0)) return null

  const chord = parseCore(slashParts[0])
  if(!chord) return null

  if(slashParts.length === 1) return chord

  const bass = parseBareNote(slashParts[1])
  if(!bass) return null

  const parsed = {
    ...chord,
    bass: bass.pitch,
    bassSpelling: bass.spelling
  }

  return {
    ...parsed,
    symbol: symbolForParsed(parsed)
  }
}

export function normalizeChordSymbol(symbol: string) {
  const parsed = parseChordSymbol(symbol)
  if(!parsed) return symbol.trim()
  return parsed.symbol
}

type ChordInferencePattern = {
  type: Quality
  intervals: number[]
}

type ChordInferenceTemplate = ChordInferencePattern & {
  required: number[]
  priority: number
  rootless?: boolean
  rootlessBassInterval?: number
  minNotes?: number
}

const CHORD_INFERENCE_TEMPLATES: ChordInferenceTemplate[] = [
  { type: "13", intervals: [0, 2, 4, 7, 9, 10], required: [0, 4, 7, 9, 10], priority: 132, minNotes: 5 },
  { type: "m11", intervals: [0, 2, 3, 5, 7, 10], required: [0, 3, 5, 10], priority: 128, minNotes: 4 },
  { type: "11", intervals: [0, 2, 4, 5, 7, 10], required: [0, 4, 5, 10], priority: 127, minNotes: 4 },
  { type: "6add9", intervals: [0, 2, 4, 7, 9], required: [0, 2, 4, 9], priority: 126 },
  { type: "maj9", intervals: [0, 2, 4, 7, 11], required: [0, 2, 4, 11], priority: 124 },
  { type: "m9", intervals: [0, 2, 3, 7, 10], required: [0, 2, 3, 10], priority: 122 },
  { type: "9", intervals: [0, 2, 4, 7, 10], required: [0, 2, 4, 10], priority: 120 },
  { type: "9", intervals: [0, 2, 4, 7, 10], required: [2, 4, 10], priority: 112, rootless: true, minNotes: 3 },
  { type: "add9", intervals: [0, 2, 4, 7], required: [0, 2, 4], priority: 100 },
  { type: "madd9", intervals: [0, 2, 3, 7], required: [0, 2, 3], priority: 100 },
  { type: "maj7", intervals: [0, 4, 7, 11], required: [0, 4, 11], priority: 94 },
  { type: "maj7", intervals: [0, 4, 7, 11], required: [4, 7, 11], priority: 88, rootless: true, rootlessBassInterval: 4, minNotes: 3 },
  { type: "m7", intervals: [0, 3, 7, 10], required: [0, 3, 10], priority: 92 },
  { type: "m7b5", intervals: [0, 3, 6, 10], required: [0, 3, 6, 10], priority: 91 },
  { type: "7b5", intervals: [0, 4, 6, 10], required: [0, 4, 6, 10], priority: 91 },
  { type: "7#5", intervals: [0, 4, 8, 10], required: [0, 4, 8, 10], priority: 91 },
  { type: "7b9", intervals: [0, 1, 4, 7, 10], required: [0, 1, 4, 10], priority: 91 },
  { type: "7#9", intervals: [0, 3, 4, 7, 10], required: [0, 3, 4, 10], priority: 91 },
  { type: "7", intervals: [0, 4, 7, 10], required: [0, 4, 10], priority: 90 },
  { type: "dim7", intervals: [0, 3, 6, 9], required: [0, 3, 6, 9], priority: 89 },
  { type: "6", intervals: [0, 4, 7, 9], required: [0, 4, 9], priority: 86 },
  { type: "m6", intervals: [0, 3, 7, 9], required: [0, 3, 9], priority: 86 },
  { type: "7sus2", intervals: [0, 2, 7, 10], required: [0, 2, 10], priority: 84 },
  { type: "7sus4", intervals: [0, 5, 7, 10], required: [0, 5, 10], priority: 84 },
  { type: "dim", intervals: [0, 3, 6], required: [0, 3, 6], priority: 72 },
  { type: "aug", intervals: [0, 4, 8], required: [0, 4, 8], priority: 72 },
  { type: "sus2", intervals: [0, 2, 7], required: [0, 2, 7], priority: 68 },
  { type: "sus4", intervals: [0, 5, 7], required: [0, 5, 7], priority: 68 },
  { type: "m", intervals: [0, 3, 7], required: [0, 3], priority: 54 },
  { type: "maj", intervals: [0, 4, 7], required: [0, 4], priority: 54 }
]

const TWO_NOTE_INFERENCE_PATTERNS: ChordInferencePattern[] = [
  { type: "maj", intervals: [0, 4] },
  { type: "m", intervals: [0, 3] },
  { type: "maj", intervals: [0, 7] },
  { type: "sus4", intervals: [0, 5] },
  { type: "sus2", intervals: [0, 2] },
  { type: "6", intervals: [0, 9] },
  { type: "maj7", intervals: [0, 11] },
  { type: "7", intervals: [0, 10] }
]

function intervalSetMatches(intervals: Set<number>, expected: number[]) {
  return intervals.size === expected.length && expected.every(interval => intervals.has(interval))
}

function intervalsForRoot(notes: string[], root: string) {
  return new Set<number>(
    notes.map(note => (idx(note) - idx(root) + 12) % 12)
  )
}

function intervalSetIsSubset(intervals: Set<number>, allowed: number[]) {
  return [...intervals].every(interval => allowed.includes(interval))
}

function intervalSetHasAll(intervals: Set<number>, required: number[]) {
  return required.every(interval => intervals.has(interval))
}

function chordInferenceRoots(uniquePitches: string[]) {
  return Array.from(new Set([...uniquePitches, ...NOTE_ORDER]))
}

function inferredRootlessBass(root: string, template: ChordInferenceTemplate) {
  return template.rootlessBassInterval === undefined
    ? undefined
    : add(root, template.rootlessBassInterval)
}

function scoreChordInferenceMatch({
  root,
  intervals,
  template,
  bass,
  key,
  mode
}:{
  root: string
  intervals: Set<number>
  template: ChordInferenceTemplate
  bass: string
  key: string
  mode: string
}) {
  const exact = intervalSetMatches(intervals, template.intervals)
  const hasRoot = intervals.has(0)
  const rootDegree = scaleDegreeForRoot(root, buildPitchScaleFromMode(key, mode))
  let score = template.priority

  if(exact) score += 64
  score += intervals.size * 5
  if(hasRoot) score += 28
  else score -= 12
  if(samePitch(root, bass)) score += 18
  if(rootDegree >= 0) score += 4
  if(samePitch(root, normalize(key))) score += 8

  if(template.rootless) {
    score -= 8
    if(samePitch(root, normalize(key))) score += 48
    if(template.type === "maj7" && intervals.size === 3) score += 20
  }

  if(
    exact &&
    (template.type === "maj" || template.type === "m") &&
    !samePitch(root, bass) &&
    !samePitch(root, normalize(key))
  ) {
    score -= 36
  }

  return score
}

function inferChordMatch(notes: string[], key: string, mode: string) {
  const pitchSet = new Set(notes.map(normalize))
  const uniquePitches = [...pitchSet]

  if(uniquePitches.length === 0) return null
  const bass = normalize(notes[0])

  if(uniquePitches.length === 1) {
    return {
      root: uniquePitches[0],
      type: "maj" as Quality,
      bass: undefined,
      score: 0
    }
  }

  if(uniquePitches.length === 2) {
    for (const root of uniquePitches) {
      const intervals = intervalsForRoot(uniquePitches, root)
      const match = TWO_NOTE_INFERENCE_PATTERNS.find(pattern => intervalSetMatches(intervals, pattern.intervals))
      if(match) {
        return {
          root,
          type: match.type,
          bass: undefined,
          score: 0
        }
      }
    }
    return null
  }

  const matches = chordInferenceRoots(uniquePitches)
    .flatMap(root => {
      const intervals = intervalsForRoot(uniquePitches, root)

      return CHORD_INFERENCE_TEMPLATES
        .filter(template => {
          if((template.minNotes ?? 1) > intervals.size) return false
          if(template.rootless && intervals.has(0)) return false
          if(!template.rootless && !intervals.has(0)) return false
          return intervalSetIsSubset(intervals, template.intervals) &&
            intervalSetHasAll(intervals, template.required)
        })
        .map(template => {
          const rootlessBass = inferredRootlessBass(root, template)
          const bassForSymbol = template.rootless
            ? rootlessBass
            : intervals.has(0) &&
              !samePitch(root, bass) &&
              (template.type === "maj" || template.type === "m")
              ? bass
              : undefined

          return {
            root,
            type: template.type,
            bass: bassForSymbol && !samePitch(bassForSymbol, root) ? bassForSymbol : undefined,
            score: scoreChordInferenceMatch({
              root,
              intervals,
              template,
              bass,
              key,
              mode
            })
          }
        })
    })
    .sort((a, b) => {
      if(b.score !== a.score) return b.score - a.score
      if(Boolean(a.bass) !== Boolean(b.bass)) return a.bass ? 1 : -1
      return NOTE_ORDER.indexOf(a.root) - NOTE_ORDER.indexOf(b.root)
    })

  return matches[0] ?? null
}

export function inferChordSymbol(notes: string[], key = "C", mode = "Ionian") {
  if(!Array.isArray(notes)) return null

  const match = inferChordMatch(notes, key, mode)
  return match
    ? symbolForQuality(match.root, match.type, match.bass, key, mode)
    : null
}

/**
 * Validates whether a set of notes can be named as a valid chord.
 * Returns true if the notes can form a recognizable chord, false otherwise.
 * This is used to validate whether moving a note to a fret position results in a namable chord.
 */
export function canNameChord(notes: string[], key = "C", mode = "Ionian"): boolean {
  if(!Array.isArray(notes) || notes.length < 3) return false
  if(new Set(notes.map(normalize)).size < 3) return false
  return inferChordSymbol(notes, key, mode) !== null
}

export function getChordRoot(symbol: string) {
  return parseChordSymbol(symbol)?.root ?? null
}

export function getNoteIndex(note: string) {
  return idx(note)
}

export function getFretNote(open: string, fret: number) {
  return fretNote(open, fret)
}

export function getFretNoteDisplay(open: string, fret: number, key = "C", mode = "Ionian") {
  return spellNoteForKey(fretNote(open, fret), key, mode)
}

function buildChord(root: string, type: Quality): ChordShape {
  if (type==="maj") return { notes:[root,add(root,4),add(root,7)], roles:["1","3","5"] }
  if (type==="m") return { notes:[root,add(root,3),add(root,7)], roles:["1","b3","5"] }

  if (type==="7") return { notes:[root,add(root,4),add(root,7),add(root,10)], roles:["1","3","5","b7"] }
  if (type==="7b5") return { notes:[root,add(root,4),add(root,6),add(root,10)], roles:["1","3","b5","b7"] }
  if (type==="7#5") return { notes:[root,add(root,4),add(root,8),add(root,10)], roles:["1","3","#5","b7"] }
  if (type==="7b9") return { notes:[root,add(root,4),add(root,7),add(root,10),add(root,1)], roles:["1","3","5","b7","b9"] }
  if (type==="7#9") return { notes:[root,add(root,4),add(root,7),add(root,10),add(root,3)], roles:["1","3","5","b7","#9"] }
  if (type==="maj7") return { notes:[root,add(root,4),add(root,7),add(root,11)], roles:["1","3","5","7"] }
  if (type==="6") return { notes:[root,add(root,4),add(root,7),add(root,9)], roles:["1","3","5","6"] }

  if (type==="m7") return { notes:[root,add(root,3),add(root,7),add(root,10)], roles:["1","b3","5","b7"] }

  if (type==="m7b5") return { notes:[root,add(root,3),add(root,6),add(root,10)], roles:["1","b3","b5","b7"] }
  if (type==="dim") return { notes:[root,add(root,3),add(root,6)], roles:["1","b3","b5"] }
  if (type==="dim7") return { notes:[root,add(root,3),add(root,6),add(root,9)], roles:["1","b3","b5","bb7"] }
  if (type==="sus2") return { notes:[root,add(root,2),add(root,7)], roles:["1","2","5"] }
  if (type==="sus4") return { notes:[root,add(root,5),add(root,7)], roles:["1","4","5"] }
  if (type==="7sus2") return { notes:[root,add(root,2),add(root,7),add(root,10)], roles:["1","2","5","b7"] }
  if (type==="7sus4") return { notes:[root,add(root,5),add(root,7),add(root,10)], roles:["1","4","5","b7"] }
  if (type==="aug") return { notes:[root,add(root,4),add(root,8)], roles:["1","3","#5"] }
  if (type==="m6") return { notes:[root,add(root,3),add(root,7),add(root,9)], roles:["1","b3","5","6"] }
  if (type==="add9") return { notes:[root,add(root,4),add(root,7),add(root,2)], roles:["1","3","5","9"] }
  if (type==="madd9") return { notes:[root,add(root,3),add(root,7),add(root,2)], roles:["1","b3","5","9"] }
  if (type==="6add9") return { notes:[root,add(root,4),add(root,7),add(root,9),add(root,2)], roles:["1","3","5","6","9"] }
  if (type==="maj9") return { notes:[root,add(root,4),add(root,7),add(root,11),add(root,2)], roles:["1","3","5","7","9"] }
  if (type==="m9") return { notes:[root,add(root,3),add(root,7),add(root,10),add(root,2)], roles:["1","b3","5","b7","9"] }
  if (type==="9") return { notes:[root,add(root,4),add(root,7),add(root,10),add(root,2)], roles:["1","3","5","b7","9"] }
  if (type==="11") return { notes:[root,add(root,4),add(root,7),add(root,10),add(root,2),add(root,5)], roles:["1","3","5","b7","9","11"] }
  if (type==="13") return { notes:[root,add(root,4),add(root,7),add(root,10),add(root,2),add(root,9)], roles:["1","3","5","b7","9","13"] }
  if (type==="m11") return { notes:[root,add(root,3),add(root,7),add(root,10),add(root,2),add(root,5)], roles:["1","b3","5","b7","9","11"] }

  return { notes:[root], roles:["1"] }
}

function buildChordWithBass(parsed: ParsedChord): ChordShape {
  const chord = buildChord(parsed.root, parsed.type)
  if(!parsed.bass || chord.notes.includes(parsed.bass)) return chord

  return {
    notes: [...chord.notes, parsed.bass],
    roles: [...chord.roles, "bass"]
  }
}

function roleForBassNote(root: string, bass: string) {
  const intervals: Record<number, string> = {
    0: "1",
    1: "b2",
    2: "2",
    3: "b3",
    4: "3",
    5: "4",
    6: "b5",
    7: "5",
    8: "#5",
    9: "6",
    10: "b7",
    11: "7"
  }

  return intervals[(idx(bass) - idx(root) + 12) % 12] || "bass"
}

export function getChordDisplayNotes(symbol: string, key?: string, mode = "Ionian") {
  const parsed = parse(symbol)
  const chord = buildChord(parsed.root, parsed.type)
  const displayNote = (note: string) => key ? spellNoteForKey(note, key, mode) : note
  const chordTones = chord.notes.map((note, index) => ({
    note: displayNote(note),
    role: chord.roles[index]
  }))
  const displayTones = parsed.type === "sus2" || parsed.type === "sus4"
    ? [
      ...chordTones,
      {
        note: displayNote(parsed.root),
        role: "8"
      }
    ]
    : chordTones

  return parsed.bass && parsed.bass !== parsed.root
    ? [
      {
        note: displayNote(parsed.bass),
        role: chord.roles[chord.notes.indexOf(parsed.bass)] || roleForBassNote(parsed.root, parsed.bass)
      },
      ...displayTones
    ]
    : displayTones
}

function combinations<T>(items:T[], length:number) {
  const result:T[][] = []

  function build(start:number, chosen:T[]) {
    if(chosen.length === length) {
      result.push(chosen)
      return
    }

    for(let i = start; i < items.length; i++) {
      build(i + 1, [...chosen, items[i]])
    }
  }

  build(0, [])
  return result
}

function groups(size:number){
  const strings = [0,1,2,3,4,5]
  const maxSpan = Math.min(6, size + 2)
  const groupSets: number[][] = []

  for(let length = size; length <= maxSpan; length++) {
    groupSets.push(...combinations(strings, length))
  }

  return groupSets.sort((a,b) => {
    if(a.length !== b.length) return a.length - b.length
    const aMax = Math.max(...a)
    const bMax = Math.max(...b)
    if(aMax !== bMax) return bMax - aMax
    const aAvg = a.reduce((sum, n) => sum + n, 0) / a.length
    const bAvg = b.reduce((sum, n) => sum + n, 0) / b.length
    if(aAvg !== bAvg) return bAvg - aAvg
    return Math.min(...b) - Math.min(...a)
  })
}

function containsThird(v:CandidateEntry[]){
  return v.some(x=>x.role==="3"||x.role==="b3")
}

function chordRequiresThird(chord: ChordShape) {
  return chord.roles.some(role => role === "3" || role === "b3")
}

function containsDefiningTone(v: CandidateEntry[], chord: ChordShape) {
  if(chordRequiresThird(chord)) return containsThird(v)
  return chord.roles.some(role => role !== "1" && v.some(entry => entry.role === role))
}

function hasOpen(v:CandidateEntry[]){
  return v.some(x=>x.fret===0)
}

function fretBounds(v: CandidateEntry[]) {
  const frets = v.map(x => x.fret)
  return {
    min: Math.min(...frets),
    max: Math.max(...frets)
  }
}

function isOpenPositionVoicing(v: CandidateEntry[]) {
  const { min, max } = fretBounds(v)
  return min === 0 && max <= 4 && hasOpen(v)
}

function isLowFretFirstPositionVoicing(v: CandidateEntry[]) {
  const { min, max } = fretBounds(v)
  return min <= 3 && max <= 5
}

function getZone(min:number){
  if(min<=2) return 0
  if(min<=5) return 1
  if(min<=8) return 2
  if(min<=11) return 3
  return 4
}

function positionMetric(v:CandidateEntry[]){
  const frets=v.map(x=>x.fret)
  return {
    min: Math.min(...frets),
    avg: frets.reduce((a,b)=>a+b,0)/frets.length
  }
}

function maxStretchForPosition(minFret: number) {
  if (minFret <= 4) return 4
  if (minFret <= 8) return 5
  if (minFret <= 12) return 6
  return 7
}

function isPlayableStretch(v: CandidateEntry[]) {
  const frets = v.map(x => x.fret)
  const min = Math.min(...frets)
  const max = Math.max(...frets)
  return max - min <= maxStretchForPosition(min)
}

function lowestPlayedString(v: CandidateEntry[]) {
  return v.reduce((lowest, entry) => entry.string < lowest.string ? entry : lowest, v[0])
}

function primaryFretCluster(v: CandidateEntry[]) {
  const counts = new Map<number, number>()
  for (const entry of v) {
    counts.set(entry.fret, (counts.get(entry.fret) || 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return b[0] - a[0]
    })[0]?.[0] ?? 0
}

function positionCoherencePenalty(v: CandidateEntry[], stringCount:number) {
  const center = primaryFretCluster(v)
  if (center <= 4) return 0

  let penalty = 0
  for (const entry of v) {
    const behind = center - entry.fret
    if (behind >= 2) {
      penalty += behind * behind * (stringCount >= 5 ? 24 : 7)
    }
  }

  return penalty
}

function hasSplitPositionCluster(v: CandidateEntry[]) {
  const center = primaryFretCluster(v)
  if (center < 7) return false

  const behindCount = v.filter(entry => center - entry.fret >= 2).length
  return behindCount >= 1
}

function stringGapPenalty(v: CandidateEntry[]) {
  const strings = v.map(x => x.string).sort((a, b) => a - b)
  let penalty = 0
  for (let i = 1; i < strings.length; i++) {
    const gap = strings[i] - strings[i - 1] - 1
    if (gap > 0) penalty += gap
  }
  return penalty
}

function gapStrings(v: CandidateEntry[]) {
  const strings = v.map(x => x.string).sort((a, b) => a - b)
  const gaps: number[] = []

  for(let i = 1; i < strings.length; i++) {
    for(let string = strings[i - 1] + 1; string < strings[i]; string++) {
      gaps.push(string)
    }
  }

  return gaps
}

function maxStringGap(v: CandidateEntry[]) {
  const strings = v.map(x => x.string).sort((a, b) => a - b)
  let maxGap = 0

  for(let i = 1; i < strings.length; i++) {
    maxGap = Math.max(maxGap, strings[i] - strings[i - 1] - 1)
  }

  return maxGap
}

function isColorRole(role: string) {
  return role === "2" ||
    role === "4" ||
    role === "6" ||
    role === "7" ||
    role === "b7" ||
    role === "bb7" ||
    role === "b9" ||
    role === "#9" ||
    role === "9" ||
    role === "11" ||
    role === "13"
}

function fillableGapPenalty(v: CandidateEntry[], chord: ChordShape) {
  const gaps = gapStrings(v)
  if(gaps.length === 0) return 0

  const frets = v.map(entry => entry.fret)
  const minFret = Math.min(...frets)
  const maxFret = Math.max(...frets)
  const usedRoles = new Set(v.map(entry => entry.role))
  let penalty = 0

  for(const stringIndex of gaps) {
    for(let fret = minFret; fret <= maxFret; fret++) {
      const note = fretNote(TUNING[stringIndex], fret)
      const roleIndex = chord.notes.indexOf(note)
      if(roleIndex < 0) continue

      const role = chord.roles[roleIndex]
      penalty += usedRoles.has(role) ? 0.35 : 1
    }
  }

  return penalty
}

function voicingGapMetadata(v: CandidateEntry[], chord: ChordShape): VoicingGapMetadata {
  const gapCount = stringGapPenalty(v)
  const maxGapSize = maxStringGap(v)
  const hasGap = gapCount > 0
  const sorted = v.slice().sort((a, b) => a.string - b.string)
  const gapStart = gapStrings(v)[0] ?? Number.POSITIVE_INFINITY
  const extensionOnHigherString = sorted.some(entry => {
    return entry.string > gapStart && entry.string >= 3 && isColorRole(entry.role)
  })
  const fillablePenalty = fillableGapPenalty(v, chord)
  const hasMeaningfulTone = extensionOnHigherString

  return {
    hasGap,
    gapCount,
    maxGapSize,
    isMeaningfulGap: hasGap &&
      gapCount <= 2 &&
      maxGapSize <= 1 &&
      fillablePenalty < 1 &&
      hasMeaningfulTone,
    extensionOnHigherString,
    fillableGapPenalty: fillablePenalty
  }
}

function stringGroupPreferenceScore(v: CandidateEntry[], stringCount:number){
  const strings = v.map(x=>x.string)
  const avg = strings.reduce((a,b)=>a+b,0)/strings.length

  let score = 0

  if(stringCount === 3){
    score += Math.abs(avg - 4) * 10
  }

  if(stringCount === 4){
    score += Math.abs(avg - 3.5) * 7
  }

  if(stringCount === 5){
    score += Math.abs(avg - 3) * 2
  }

  return score
}

function uniqueVoicingPitchCount(v: CandidateEntry[]) {
  return new Set(v.map(entry => entry.note)).size
}

function uniqueChordPitchCount(chord: ChordShape) {
  return new Set(chord.notes.map(note => normalize(note))).size
}

function hasAnyVoicingRole(v: CandidateEntry[], roles: string[]) {
  return v.some(entry => roles.includes(entry.role))
}

function seventhRolesForChord(chord: ChordShape) {
  return chord.roles.filter(role => role === "7" || role === "b7" || role === "bb7")
}

function needsSeventhForIdentity(chord: ChordShape) {
  return seventhRolesForChord(chord).length > 0
}

function isSuspendedChordShape(chord: ChordShape) {
  return chord.roles.includes("2") || chord.roles.includes("4")
}

function isPowerLikeVoicing(v: CandidateEntry[]) {
  const roles = new Set(v.map(entry => entry.role))
  return roles.size <= 2 && roles.has("1") && roles.has("5")
}

function hasTriadCore(v: CandidateEntry[]) {
  const roles = new Set(v.map(entry => entry.role))
  return roles.has("1") &&
    (roles.has("3") || roles.has("b3")) &&
    (roles.has("5") || roles.has("b5") || roles.has("#5"))
}

function hasSuspendedCore(v: CandidateEntry[]) {
  const roles = new Set(v.map(entry => entry.role))
  return (roles.has("2") || roles.has("4") || roles.has("11")) &&
    (roles.has("1") || roles.has("5"))
}

function hasCompactChordIdentity(v: CandidateEntry[], chord: ChordShape, requiresThird: boolean) {
  if(hasTriadCore(v)) return true
  if(requiresThird) return hasAnyVoicingRole(v, ["3", "b3"])
  if(isSuspendedChordShape(chord)) return hasSuspendedCore(v)
  if(isPowerLikeVoicing(v)) return true
  return containsDefiningTone(v, chord)
}

function hasCommonGuitarVoicingStructure(v: CandidateEntry[], chord: ChordShape, stringCount: number, requiresThird: boolean) {
  if(!hasCompactChordIdentity(v, chord, requiresThird)) return false
  if(!hasTriadCore(v) && !hasSuspendedCore(v) && !isPowerLikeVoicing(v)) return false
  if(stringCount >= 5 && requiresThird && !hasTriadCore(v)) return false

  const mostlyAdjacentStrings = maxStringGap(v) <= 1 && stringGapPenalty(v) <= 1
  const frets = v.map(entry => entry.fret)
  const fretted = frets.filter(fret => fret > 0)
  const frettedSpan = fretted.length > 1 ? Math.max(...fretted) - Math.min(...fretted) : 0
  const compactHandShape = fretted.length <= 1 || frettedSpan <= maxStretchForPosition(Math.min(...fretted))

  return compactHandShape &&
    (isOpenPositionVoicing(v) ||
      mostlyAdjacentStrings ||
      (stringCount >= 5 && hasTriadCore(v)))
}

function commonOpenVoicingScore(v: CandidateEntry[], root: string, stringCount: number) {
  if(!hasOpen(v) || !hasTriadCore(v)) return 0

  const frets = v.map(entry => entry.fret)
  const max = Math.max(...frets)
  const fretted = frets.filter(fret => fret > 0)
  const frettedSpan = fretted.length > 1 ? Math.max(...fretted) - Math.min(...fretted) : 0

  if(max > 4 || frettedSpan > 4) return 0

  const lowest = lowestPlayedString(v)
  const openCount = frets.filter(fret => fret === 0).length
  let score = 0.38

  score += Math.min(0.34, openCount * 0.09)
  if(max <= 3) score += 0.24
  if(samePitch(lowest.note, root)) score += 0.32
  if(lowest.string <= 2) score += 0.12
  if(stringCount >= 5) score += 0.12

  return score
}

function commonBarreVoicingScore(v: CandidateEntry[], root: string, stringCount: number) {
  if(hasOpen(v) || stringCount < 5 || !hasTriadCore(v)) return 0

  const lowest = lowestPlayedString(v)
  if(!samePitch(lowest.note, root)) return 0

  const frets = v.map(entry => entry.fret)
  const min = Math.min(...frets)
  const max = Math.max(...frets)
  const minFretCount = frets.filter(fret => fret === min).length
  const highStringUsesBarre = v.some(entry => entry.string >= 4 && entry.fret === min)

  if(min < 1 || max - min > 4 || minFretCount < 2 || !highStringUsesBarre) return 0

  let score = 0.86
  if(max - min <= 3) score += 0.24
  if(minFretCount >= 3) score += 0.18
  if(lowest.string <= 1) score += 0.12

  return score
}

function commonClosedVoicingScore(v: CandidateEntry[], root: string, stringCount: number) {
  if(hasOpen(v) || !hasTriadCore(v) || stringCount > 4) return 0

  const frets = v.map(entry => entry.fret)
  const min = Math.min(...frets)
  const max = Math.max(...frets)
  if(max - min > 4) return 0

  const lowest = lowestPlayedString(v)
  let score = 0.34
  if(samePitch(lowest.note, root)) score += 0.18
  if(maxStringGap(v) === 0) score += 0.16

  return score
}

function commonGuitarVoicingScore(v: CandidateEntry[], root: string, stringCount: number) {
  return Math.max(
    commonOpenVoicingScore(v, root, stringCount),
    commonBarreVoicingScore(v, root, stringCount),
    commonClosedVoicingScore(v, root, stringCount)
  )
}

function pitchVarietyPenalty(v: CandidateEntry[], chord: ChordShape, stringCount = v.length) {
  if(hasTriadCore(v)) return 0

  const uniqueCount = uniqueVoicingPitchCount(v)
  const expected = stringCount >= 5
    ? Math.min(3, uniqueChordPitchCount(chord), v.length)
    : Math.min(3, uniqueChordPitchCount(chord), v.length)

  if(uniqueCount >= expected) return 0
  if(stringCount >= 5 && uniqueCount >= 2 && !chordRequiresThird(chord) && hasCompactChordIdentity(v, chord, false)) return 0.25
  if(isPowerLikeVoicing(v) && v.length <= 3) return 0.25
  return (expected - uniqueCount) * 1.25
}

function excessiveDuplicatePenalty(v: CandidateEntry[]) {
  const roleCounts = new Map<string, number>()
  let penalty = 0

  for(const entry of v) {
    roleCounts.set(entry.role, (roleCounts.get(entry.role) || 0) + 1)
  }

  for(const [role, count] of roleCounts.entries()) {
    if(count <= 1) continue
    const allowed = role === "1" ? 2 : 1
    if(count > allowed) penalty += (count - allowed) * (role === "1" ? 0.6 : 1.2)
  }

  return penalty
}

function harmonicIdentityPenalty(v: CandidateEntry[], chord: ChordShape, requiresThird: boolean, stringCount = v.length) {
  if(hasTriadCore(v)) return 0

  let penalty = 0
  const hasThird = hasAnyVoicingRole(v, ["3", "b3"])
  const compact = stringCount <= 4

  if(compact) {
    if(!hasCompactChordIdentity(v, chord, requiresThird)) penalty += 1.25
    return penalty
  }

  if(requiresThird && !hasThird) penalty += 0.75

  return penalty
}

function fingeringAwkwardnessPenalty(v: CandidateEntry[], stringCount: number) {
  const fretted = v
    .filter(entry => entry.fret > 0)
    .sort((a, b) => a.string - b.string)

  if(fretted.length <= 1) return 0

  const frets = fretted.map(entry => entry.fret)
  const min = Math.min(...frets)
  const max = Math.max(...frets)
  const frettedSpan = max - min
  const allowedSpan = Math.max(4, maxStretchForPosition(min) - (stringCount >= 5 ? 1 : 0))
  let penalty = Math.max(0, frettedSpan - allowedSpan) * 2

  for(let i = 1; i < fretted.length; i++) {
    const fretJump = Math.abs(fretted[i].fret - fretted[i - 1].fret)
    const stringJump = fretted[i].string - fretted[i - 1].string
    if(fretJump >= 5 && stringJump <= 2) penalty += fretJump - 3
  }

  const sortedFrets = frets.slice().sort((a, b) => a - b)
  const lowClusterMax = sortedFrets[Math.max(0, sortedFrets.length - 2)]
  if(max - lowClusterMax >= 5) penalty += max - lowClusterMax

  if(hasOpen(v) && max > 7) penalty += max - 6

  return penalty
}

function hasSevereAdjacentFretJump(v: CandidateEntry[]) {
  const fretted = v
    .filter(entry => entry.fret > 0)
    .sort((a, b) => a.string - b.string)

  for(let i = 1; i < fretted.length; i++) {
    const fretJump = Math.abs(fretted[i].fret - fretted[i - 1].fret)
    const stringJump = fretted[i].string - fretted[i - 1].string
    if(fretJump >= 5 && stringJump <= 2) return true
  }

  return false
}

function isRealisticVoicingCandidate(v: CandidateEntry[], stringCount: number, chord: ChordShape, requiresThird: boolean) {
  const frets = v.map(entry => entry.fret)
  const fretted = frets.filter(fret => fret > 0)
  const gapMetadata = voicingGapMetadata(v, chord)
  const compact = stringCount <= 4
  const wide = stringCount >= 5
  const triadCore = hasTriadCore(v)
  const commonGuitarShape = hasCommonGuitarVoicingStructure(v, chord, stringCount, requiresThird)

  if(!isPlayableStretch(v)) return false

  if(fretted.length > 1) {
    const min = Math.min(...fretted)
    const max = Math.max(...fretted)
    if(max - min > maxStretchForPosition(min)) return false
  }

  if(hasOpen(v) && Math.max(...frets) > 7) return false
  if(hasSevereAdjacentFretJump(v)) return false
  if(gapMetadata.hasGap && !gapMetadata.isMeaningfulGap && gapMetadata.gapCount > (wide ? 2 : 1) && !commonGuitarShape) return false
  if(pitchVarietyPenalty(v, chord, stringCount) >= 1 && !triadCore && !commonGuitarShape) return false

  if(compact && !hasCompactChordIdentity(v, chord, requiresThird)) return false
  if(wide && requiresThird && !hasAnyVoicingRole(v, ["3", "b3"]) && !commonGuitarShape) return false

  if(harmonicIdentityPenalty(v, chord, requiresThird, stringCount) >= (wide ? 2.5 : 2) && !triadCore && !commonGuitarShape) return false
  if(fingeringAwkwardnessPenalty(v, stringCount) >= (wide ? 12 : 10) && !commonGuitarShape) return false

  return true
}

function scoreVoicingBreakdown(
  v:CandidateEntry[],
  stringCount:number,
  root:string,
  requiresThird = true,
  bass?: string,
  chord?: ChordShape
){
  const config = SCORE_CONFIG.voicing
  const frets=v.map(x=>x.fret)
  const fretted = frets.filter(fret => fret > 0)
  const breakdown = emptyScoreBreakdown(config.direction)
  const add = (
    key: keyof typeof config.components,
    raw: number,
    label: string = key
  ) => {
    const component = config.components[key]
    addScorePart(
      breakdown,
      config.tierWeights,
      component.tier,
      label,
      raw,
      component.weight,
      component.scale
    )
  }

  add("generatedVoicing", 1, "candidate passed generation constraints")

  add("fretSpan", Math.max(...frets)-Math.min(...frets), "compact fret span")
  if(stringCount === 3 || stringCount === 4) {
    add("averageFret", frets.reduce((sum, fret) => sum + fret, 0) / frets.length, "lower average fret")
  }
  if(fretted.length > 1) {
    add("frettedSpan", Math.max(...fretted)-Math.min(...fretted), "compact fretted span")
  }
  add("positionCoherence", positionCoherencePenalty(v, stringCount), "single hand position")
  add("fingeringAwkwardness", fingeringAwkwardnessPenalty(v, stringCount), "realistic fingering shape")

  const lowest = lowestPlayedString(v)
  if(bass) {
    add("requiredBass", lowest.note === bass ? -0.35 : 1, "requested bass in lowest voice")
    if(lowest.note === bass && lowest.string <= 1) add("rootBassPreference", -0.25, "bass on low strings")
  }

  const isFirstPosition = Math.min(...frets) <= 3 && Math.max(...frets) <= 4
  if(stringCount >= 5 && isOpenPositionVoicing(v)) {
    add("openPositionPreference", -0.45 - frets.filter(fret => fret === 0).length * 0.08, "open-position guitar shape")
  }
  if(isFirstPosition && lowest.note === root) {
    add("rootBassPreference", lowest.fret === 0 ? -0.75 : -0.4, "root in bass")
  }
  add("commonGuitarShape", -commonGuitarVoicingScore(v, root, stringCount), "common guitar chord form")

  const hasThird = v.some(x=>x.role==="3"||x.role==="b3")
  if(requiresThird) add("definingTone", hasThird ? -0.25 : 1, "contains defining third")
  if(chord && needsSeventhForIdentity(chord)) {
    const seventhRaw = hasAnyVoicingRole(v, ["7", "b7", "bb7"])
      ? -0.25
      : stringCount <= 4 || hasTriadCore(v)
        ? 0
        : 0.35
    add("colorToneCoverage", seventhRaw, "contains defining seventh")
  }

  const counts: Record<string, number> = {}
  for (const n of v) {
    counts[n.note] = (counts[n.note] || 0) + 1
  }
  let duplicateCount = 0
  for (const c of Object.values(counts)) {
    if (c > 1) duplicateCount += c - 1
  }
  add("pitchVariety", pitchVarietyPenalty(v, chord ?? { notes: v.map(entry => entry.note), roles: v.map(entry => entry.role) }, stringCount), "meaningful pitch variety")
  duplicateCount += excessiveDuplicatePenalty(v)
  if(stringCount >= 5) {
    duplicateCount *= hasTriadCore(v) ? 0.35 : 0.55
  }
  add("duplicateTonePenalty", duplicateCount, "avoid excessive doubled tones")
  const gapMetadata = chord ? voicingGapMetadata(v, chord) : null
  const gapRaw = gapMetadata
    ? gapMetadata.isMeaningfulGap
      ? gapMetadata.gapCount * 0.45 + gapMetadata.fillableGapPenalty
      : gapMetadata.gapCount + gapMetadata.fillableGapPenalty
    : stringGapPenalty(v)
  add("stringGapPenalty", gapRaw, "avoid gaps in string voicing")
  add("stringGroupPreference", stringGroupPreferenceScore(v, stringCount), "preferred string group")

  return breakdown
}

function voicingGenerationKey(chord: ChordShape, size: number, bass?: string) {
  return [
    size,
    bass || "",
    chord.notes.join(","),
    chord.roles.join(",")
  ].join("|")
}

function definingRolesForChord(chord: ChordShape) {
  if(chordRequiresThird(chord)) return new Set(["3", "b3"])
  return new Set(chord.roles.filter(role => role !== "1"))
}

function containsAnyRole(v: CandidateEntry[], roles: Set<string>) {
  return v.some(entry => roles.has(entry.role))
}

function windowBounds(anchor: number) {
  const start = anchor <= 2 ? 0 : anchor
  const end = Math.min(FRETBOARD_MAX_FRET, anchor + maxStretchForPosition(anchor))
  return { start, end }
}

function stringOptionsForWindow(chord: ChordShape, stringIndex: number, anchor: number) {
  const { start, end } = windowBounds(anchor)
  const options: CandidateEntry[] = []

  for(let fret = start; fret <= end; fret++) {
    const note = fretNote(TUNING[stringIndex], fret)
    const roleIndex = chord.notes.indexOf(note)
    if(roleIndex >= 0) {
      options.push({
        string: stringIndex,
        fret,
        note,
        role: chord.roles[roleIndex]
      })
    }
  }

  return options
}

function remainingCanSupplyRole(options: CandidateEntry[][], startIndex: number, roles: Set<string>) {
  for(let i = startIndex; i < options.length; i++) {
    if(options[i].some(entry => roles.has(entry.role))) return true
  }

  return false
}

function remainingCanSupplyBass(options: CandidateEntry[][], startIndex: number, bass: string) {
  for(let i = startIndex; i < options.length; i++) {
    if(options[i].some(entry => entry.note === bass)) return true
  }

  return false
}

function hasAllowedStringGaps(curr: CandidateEntry[]) {
  if(curr.length < 2) return true
  const sorted = curr.slice().sort((a, b) => a.string - b.string)
  for(let i = 1; i < sorted.length; i++) {
    if(sorted[i].string - sorted[i - 1].string > 2) return false
  }
  return true
}

function sortStringOptions(options: CandidateEntry[], definingRoles: Set<string>, bass?: string) {
  return [...options].sort((a, b) => {
    const aPriority = a.note === bass ? 0 : definingRoles.has(a.role) ? 1 : 2
    const bPriority = b.note === bass ? 0 : definingRoles.has(b.role) ? 1 : 2
    if(aPriority !== bPriority) return aPriority - bPriority
    return a.fret - b.fret
  })
}

function isPartialStretchPlayable(curr: CandidateEntry[]) {
  if(curr.length < 2) return true
  const frets = curr.map(entry => entry.fret)
  const min = Math.min(...frets)
  const max = Math.max(...frets)
  return max - min <= maxStretchForPosition(min)
}

function generateForWindow(chord: ChordShape, group: number[], anchor: number, targetSize: number, bass?: string) {
  const definingRoles = definingRolesForChord(chord)
  const options = group.map(stringIndex => stringOptionsForWindow(chord, stringIndex, anchor))
  const result: CandidateEntry[][] = []

  const playableStrings = options.filter(items => items.length > 0).length
  if(playableStrings < targetSize) return result

  const orderedOptions = options
    .map(items => sortStringOptions(items, definingRoles, bass))
    .reverse()

  function build(index: number, curr: CandidateEntry[]) {
    const hasDefiningRole = containsAnyRole(curr, definingRoles)
    const hasBassNote = !!bass && curr.some(entry => entry.note === bass)
    const remainingStrings = orderedOptions.length - index
    const remainingNeeded = targetSize - curr.length

    if(remainingNeeded < 0 || remainingNeeded > remainingStrings) return
    if(!hasDefiningRole && !remainingCanSupplyRole(orderedOptions, index, definingRoles)) return
    if(bass && !hasBassNote && !remainingCanSupplyBass(orderedOptions, index, bass)) return

    if(index === orderedOptions.length) {
      if(
        curr.length === targetSize &&
        containsDefiningTone(curr, chord) &&
        isPlayableStretch(curr) &&
        isRealisticVoicingCandidate(curr, targetSize, chord, chordRequiresThird(chord)) &&
        (!(group.length >= 5 && hasSplitPositionCluster(curr)) ||
          hasCommonGuitarVoicingStructure(curr, chord, targetSize, chordRequiresThird(chord))) &&
        (!bass || lowestPlayedString(curr).note === bass)
      ) {
        result.push(curr.slice().sort((a, b) => a.string - b.string))
      }
      return
    }

    if(remainingStrings > remainingNeeded) {
      build(index + 1, curr)
    }

    for(const option of orderedOptions[index]) {
      const next = [...curr, option]
      if(!isPartialStretchPlayable(next)) continue
      if(!hasAllowedStringGaps(next)) continue
      if(targetSize < 5 && group.length >= 5 && next.length >= 4 && hasSplitPositionCluster(next)) continue

      build(index + 1, next)
    }
  }

  build(0, [])
  return result
}

function generate(chord:ChordShape,size:number,bass?: string){
  const cacheKey = voicingGenerationKey(chord, size, bass)
  const cached = voicingGenerationCache.get(cacheKey)
  if(cached) return cached

  const generated: CandidateEntry[][] = []
  const anchors = size === 3 ? THREE_STRING_VOICING_WINDOW_ANCHORS : VOICING_WINDOW_ANCHORS

  for(const group of groups(size)) {
    const preferredAnchors = anchors
      .filter(anchor => {
        const { start } = windowBounds(anchor)
        return start <= FRETBOARD_MAX_FRET
      })

    for(const anchor of preferredAnchors) {
      generated.push(...generateForWindow(chord, group, anchor, size, bass))
    }
  }

  const result = dedupe(generated)
  voicingGenerationCache.set(cacheKey, result)
  return result
}

function voicingFromFrets(chord: ChordShape, frets: number[], strings: number[]) {
  const voicing: CandidateEntry[] = []

  for(let i = 0; i < frets.length; i++) {
    const string = strings[i]
    const note = fretNote(TUNING[string], frets[i])
    const roleIndex = chord.notes.indexOf(note)
    if(roleIndex < 0) return null

    voicing.push({
      string,
      fret: frets[i],
      note,
      role: chord.roles[roleIndex]
    })
  }

  return voicing
}

function canonicalBarreVoicings(chord: ChordShape, root: string, type: Quality, stringCount: number) {
  if(type !== "maj" && type !== "m") return []

  const voicings: CandidateEntry[][] = []
  const isMinor = type === "m"

  if(stringCount === 6) {
    for(const rootFret of fretsForNote("E", root)) {
      const frets = isMinor
        ? [rootFret, rootFret + 2, rootFret + 2, rootFret, rootFret, rootFret]
        : [rootFret, rootFret + 2, rootFret + 2, rootFret + 1, rootFret, rootFret]

      if(Math.max(...frets) <= FRETBOARD_MAX_FRET) {
        const voicing = voicingFromFrets(chord, frets, [0,1,2,3,4,5])
        if(voicing) voicings.push(voicing)
      }
    }

    for(const rootFret of fretsForNote("A", root)) {
      const frets = isMinor
        ? [rootFret, rootFret, rootFret + 2, rootFret + 2, rootFret + 1, rootFret]
        : [rootFret, rootFret, rootFret + 2, rootFret + 2, rootFret + 2, rootFret]

      if(Math.max(...frets) <= FRETBOARD_MAX_FRET) {
        const voicing = voicingFromFrets(chord, frets, [0,1,2,3,4,5])
        if(voicing) voicings.push(voicing)
      }
    }
  }

  if(stringCount === 5) {
    for(const rootFret of fretsForNote("A", root)) {
      const frets = isMinor
        ? [rootFret, rootFret + 2, rootFret + 2, rootFret + 1, rootFret]
        : [rootFret, rootFret + 2, rootFret + 2, rootFret + 2, rootFret]

      if(Math.max(...frets) <= FRETBOARD_MAX_FRET) {
        const voicing = voicingFromFrets(chord, frets, [1,2,3,4,5])
        if(voicing) voicings.push(voicing)
      }
    }
  }

  return dedupe(voicings).sort((a, b) => positionMetric(a).min - positionMetric(b).min)
}

function dedupe(vs:CandidateEntry[][]){
  const seen=new Set<string>()
  return vs.filter(v=>{
    const k=v.map(x=>`${x.string}-${x.fret}`).join("|")
    if(seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const MODES: Record<string, number[]> = {
  Ionian: [0,2,4,5,7,9,11],
  Dorian: [0,2,3,5,7,9,10],
  Phrygian: [0,1,3,5,7,8,10],
  Lydian: [0,2,4,6,7,9,11],
  Mixolydian: [0,2,4,5,7,9,10],
  Aeolian: [0,2,3,5,7,8,10],
  Locrian: [0,1,3,5,6,8,10]
}

const MODE_QUALITIES: Record<string, string[]> = {
  Ionian: ["","m","m","","","m","dim"],
  Dorian: ["m","m","","","m","dim",""],
  Phrygian: ["m","","","m","dim","","m"],
  Lydian: ["","","m","dim","","m","m"],
  Mixolydian: ["","m","dim","","m","m",""],
  Aeolian: ["m","dim","","m","m","",""],
  Locrian: ["dim","","m","m","","","m"]
}

const LETTER_ORDER = ["C", "D", "E", "F", "G", "A", "B"]
const NATURAL_NOTE_PITCHES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
}
const FLAT_NOTE_ORDER = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"]
const FLAT_KEY_TONICS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"])

const DEGREE_LABELS = ["I","bII","II","bIII","III","IV","#IV","V","bVI","VI","bVII","VII"]

function pitchClass(note: string) {
  return idx(note)
}

function samePitch(a: string, b: string) {
  return normalize(a) === normalize(b)
}

function canonicalPitchSet(notes: string[]) {
  return new Set(notes.map(note => normalize(note)))
}

function buildPitchScaleFromMode(key:string, mode:string){
  const intervals = MODES[mode] || MODES["Ionian"]
  return intervals.map(i => add(key, i))
}

function accidentalForDistance(distance: number) {
  const normalizedDistance = ((distance + 6) % 12) - 6
  if(normalizedDistance === 0) return ""
  if(normalizedDistance === 1) return "#"
  if(normalizedDistance === 2) return "##"
  if(normalizedDistance === -1) return "b"
  if(normalizedDistance === -2) return "bb"
  return normalizedDistance > 0 ? "#" : "b"
}

function spellPitchWithLetter(pitch: string, letter: string) {
  const naturalPitch = NATURAL_NOTE_PITCHES[letter]
  const pitchIndex = pitchClass(pitch)
  if(naturalPitch === undefined || pitchIndex < 0) return pitch

  return `${letter}${accidentalForDistance(pitchIndex - naturalPitch)}`
}

function prefersFlatsForKey(key: string) {
  const parsed = parseBareNote(key)
  if(!parsed) return false
  return parsed.spelling.includes("b") || FLAT_KEY_TONICS.has(parsed.spelling)
}

export function spellNoteForKey(note: string, key = "C", mode = "Ionian") {
  const pitch = normalize(note)
  const pitchIndex = pitchClass(pitch)
  if(pitchIndex < 0) return note

  const pitchScale = buildPitchScaleFromMode(key, mode)
  const spelledScale = buildScaleFromMode(key, mode)
  const scaleIndex = pitchScale.findIndex(scaleNote => samePitch(scaleNote, pitch))
  if(scaleIndex >= 0) return spelledScale[scaleIndex]

  return prefersFlatsForKey(key) ? FLAT_NOTE_ORDER[pitchIndex] : NOTE_ORDER[pitchIndex]
}

export function buildScaleFromMode(key:string, mode:string){
  const intervals = MODES[mode] || MODES["Ionian"]
  const pitchScale = intervals.map(i => add(key, i))
  const parsedKey = parseBareNote(key) || { spelling: "C", pitch: "C" }
  const tonicLetterIndex = LETTER_ORDER.indexOf(parsedKey.spelling.charAt(0))
  const safeTonicLetterIndex = tonicLetterIndex >= 0 ? tonicLetterIndex : 0

  return pitchScale.map((pitch, degree) => {
    const letter = LETTER_ORDER[(safeTonicLetterIndex + degree) % LETTER_ORDER.length]
    return spellPitchWithLetter(pitch, letter)
  })
}

export function buildDiatonicChords(key:string, mode:string){
  const scale = buildScaleFromMode(key, mode)
  const qualities = MODE_QUALITIES[mode] || MODE_QUALITIES["Ionian"]

  return scale.map((note, i)=>{
    const q = qualities[i]
    return q ? `${note}${q}` : note
  })
}

function getModeAwareSuggestions(symbol:string, key:string, mode:string){
  const root = normalize(parse(symbol).root)

  return buildDiatonicChords(key, mode).filter(ch => parse(ch).root !== root)
}

const QUALITY_SUFFIX: Record<Quality, string> = {
  maj: "",
  m: "m",
  "7": "7",
  "7b5": "7b5",
  "7#5": "7#5",
  "7b9": "7b9",
  "7#9": "7#9",
  maj7: "maj7",
  m7: "m7",
  m7b5: "m7b5",
  dim: "dim",
  dim7: "dim7",
  sus2: "sus2",
  sus4: "sus4",
  "6": "6",
  m6: "m6",
  add9: "add9",
  madd9: "madd9",
  "6add9": "6add9",
  maj9: "maj9",
  m9: "m9",
  "9": "9",
  "11": "11",
  "13": "13",
  m11: "m11",
  "7sus2": "7sus2",
  "7sus4": "7sus4",
  aug: "aug"
}

type ProgressionSuggestionCandidate = {
  symbol: string
  root: string
  type: Quality
  bass?: string
  notes: string[]
  inKey: boolean
  targetRoot: string
  functionCategory: HarmonicFunction
  family: CandidateFamily
  families: CandidateFamily[]
  resolutionTarget: ResolutionTarget
  generatedBecause: string[]
  validBecause: string[]
  theoryNote: string
  resolutionNote: string
  rankNote: string
  completionPath: string[]
  rejectionReasons: string[]
  score: number
  scoreBreakdown?: ScoreBreakdown
}

type ProgressionPattern = {
  name: string
  offsets: number[]
  boost: number
}

const COMMON_PROGRESSION_PATTERNS: ProgressionPattern[] = [
  { name: "pop axis I-V-vi-IV", offsets: [0, 7, 9, 5], boost: 46 },
  { name: "pop axis vi-IV-I-V", offsets: [9, 5, 0, 7], boost: 44 },
  { name: "50s I-vi-IV-V", offsets: [0, 9, 5, 7], boost: 42 },
  { name: "doo-wop I-vi-ii-V", offsets: [0, 9, 2, 7], boost: 40 },
  { name: "jazz ii-V-I", offsets: [2, 7, 0], boost: 48 },
  { name: "jazz iii-vi-ii-V-I", offsets: [4, 9, 2, 7, 0], boost: 42 },
  { name: "rhythm changes I-vi-ii-V", offsets: [0, 9, 2, 7], boost: 40 },
  { name: "rock I-bVII-IV-I", offsets: [0, 10, 5, 0], boost: 38 },
  { name: "rock i-bVII-bVI-bVII", offsets: [0, 10, 8, 10], boost: 38 },
  { name: "minor pop i-bVI-bIII-bVII", offsets: [0, 8, 3, 10], boost: 44 },
  { name: "andalusian i-bVII-bVI-V", offsets: [0, 10, 8, 7], boost: 42 },
  { name: "blues I-IV-I-V", offsets: [0, 5, 0, 7], boost: 40 },
  { name: "blues I-IV-V-IV", offsets: [0, 5, 7, 5], boost: 38 },
  { name: "country I-IV-V-I", offsets: [0, 5, 7, 0], boost: 40 },
  { name: "folk I-V-IV-I", offsets: [0, 7, 5, 0], boost: 36 },
  { name: "gospel I-IV-I-V", offsets: [0, 5, 0, 7], boost: 38 },
  { name: "soul I-iii-IV-iv", offsets: [0, 4, 5, 5], boost: 34 },
  { name: "modal I-bVII-bVI-I", offsets: [0, 10, 8, 0], boost: 34 }
]

function symbolForQuality(root: string, type: Quality, bass?: string, key?: string, mode = "Ionian") {
  const cleanBass = bass ? normalize(bass) : undefined
  const displayRoot = key ? spellNoteForKey(root, key, mode) : root
  const displayBass = cleanBass ? key ? spellNoteForKey(cleanBass, key, mode) : cleanBass : undefined
  const suffix = QUALITY_SUFFIX[type]
  return cleanBass && cleanBass !== normalize(root)
    ? `${displayRoot}${suffix}/${displayBass}`
    : `${displayRoot}${suffix}`
}

function parseProgressionSymbols(symbols: string[]): ParsedProgressionChord[] {
  return symbols
    .map(symbol => {
      const clean = symbol.trim()
      if(!clean) return null
      const parsed = parseChordSymbol(clean)
      if(!parsed) return null
      return {
        symbol: symbolForQuality(parsed.root, parsed.type, parsed.bass),
        parsed,
        notes: buildChordWithBass(parsed).notes
      }
    })
    .filter((item): item is ParsedProgressionChord => Boolean(item))
}

function chordNotesForSymbol(symbol: string) {
  const parsed = parse(symbol)
  return buildChordWithBass(parsed).notes
}

function isInKeyNotes(notes: string[], scaleSet: Set<string>) {
  return notes.every(note => scaleSet.has(normalize(note)))
}

function isDominantQuality(type: Quality) {
  return type === "7" ||
    type === "7b5" ||
    type === "7#5" ||
    type === "7b9" ||
    type === "7#9" ||
    type === "9" ||
    type === "11" ||
    type === "13" ||
    type === "7sus2" ||
    type === "7sus4" ||
    type === "maj" ||
    type === "aug"
}

function isDiminishedQuality(type: Quality) {
  return type === "dim" || type === "dim7" || type === "m7b5"
}

function isSimpleSuggestionQuality(type: Quality) {
  return type === "maj" || type === "m" || type === "7" || type === "sus2" || type === "sus4"
}

function isSimpleSuggestionCandidate(candidate: ProgressionSuggestionCandidate) {
  return !candidate.bass && isSimpleSuggestionQuality(candidate.type)
}

function isPlainTriadSuggestion(candidate: ProgressionSuggestionCandidate) {
  return candidate.type === "maj" || candidate.type === "m"
}

function isSimpleColorSuggestion(candidate: ProgressionSuggestionCandidate) {
  return candidate.type === "7" || candidate.type === "sus2" || candidate.type === "sus4"
}

function scaleDegreeForRoot(root: string, scale: string[]) {
  return scale.findIndex(note => samePitch(note, root))
}

function scaleDegreeOrNull(root: string, scale: string[]) {
  const degree = scaleDegreeForRoot(root, scale)
  return degree >= 0 ? degree : null
}

function resolutionOptionFor({
  targetRoot,
  scale,
  targetChordType,
  strength,
  resolutionType,
  expectedDistance,
  chordsUntilExpectedResolution,
  mandatorySoon,
  overdue,
  via
}:{
  targetRoot: string
  scale: string[]
  targetChordType?: Quality
  strength: number
  resolutionType: ResolutionType
  expectedDistance: number
  chordsUntilExpectedResolution: number
  mandatorySoon: boolean
  overdue: boolean
  via?: string[]
}): ResolutionOption {
  const cleanTargetRoot = normalize(targetRoot)

  return {
    targetRoot: cleanTargetRoot,
    targetScaleDegree: scaleDegreeOrNull(cleanTargetRoot, scale),
    targetChordType,
    strength: Math.max(0, Math.min(100, Math.round(strength))),
    resolutionType,
    expectedDistance: Math.max(0, Math.round(expectedDistance)),
    chordsUntilExpectedResolution: Math.max(0, Math.round(chordsUntilExpectedResolution)),
    mandatorySoon,
    overdue,
    via
  }
}

function resolutionTargetFor({
  targetRoot,
  scale,
  targetChordType,
  strength = 50,
  resolutionType = "direct",
  expectedDistance = 1,
  chordsUntilExpectedResolution,
  mandatorySoon,
  overdue,
  secondaryTargets = [],
  via
}:{
  targetRoot: string
  scale: string[]
  targetChordType?: Quality
  strength?: number
  resolutionType?: ResolutionType
  expectedDistance?: number
  chordsUntilExpectedResolution: number
  mandatorySoon: boolean
  overdue: boolean
  secondaryTargets?: ResolutionOption[]
  via?: string[]
}): ResolutionTarget {
  return {
    ...resolutionOptionFor({
      targetRoot,
      scale,
      targetChordType,
      strength,
      resolutionType,
      expectedDistance,
      chordsUntilExpectedResolution,
      mandatorySoon,
      overdue,
      via
    }),
    secondaryTargets
  }
}

function roleBaseTension(role: HarmonicFunction) {
  const tensions: Record<HarmonicFunction, number> = {
    tonic: 8,
    tonicSubstitute: 18,
    predominant: 34,
    dominant: 68,
    secondaryDominant: 78,
    leadingTone: 82,
    borrowedPredominant: 46,
    borrowedDominant: 70,
    chromaticColor: 52,
    color: 24,
    passingChord: 36,
    approachChord: 56,
    cadenceChord: 12
  }

  return tensions[role]
}

function tensionLabel(level: number): HarmonicContext["currentTensionState"]["label"] {
  if(level >= 75) return "urgent"
  if(level >= 58) return "tense"
  if(level >= 34) return "moving"
  if(level >= 12) return "stable"
  return "rest"
}

function isBorrowedPredominantRoot(root: string, tonic: string) {
  const offset = tonicOffsetForRoot(root, tonic)
  return offset === 1 || offset === 3 || offset === 5 || offset === 8 || offset === 10
}

function isBorrowedDominantRoot(root: string, tonic: string) {
  const offset = tonicOffsetForRoot(root, tonic)
  return offset === 7 || offset === 10 || offset === 1
}

function parsedChordInKey(item: ParsedProgressionChord | null | undefined, scaleSet: Set<string>) {
  return item ? isInKeyNotes(item.notes, scaleSet) : false
}

function chordSharesToneWithParsed(root: string, type: Quality, next: ParsedProgressionChord | null | undefined) {
  if(!next) return false
  return commonPitches(buildChord(root, type).notes, next.notes).length > 0
}

function classifyHarmonicFunction({
  root,
  type,
  inKey,
  targetRoot,
  scale,
  phrasePosition,
  previousChord,
  nextChord,
  scaleSet
}:{
  root: string
  type: Quality
  inKey: boolean
  targetRoot: string
  scale: string[]
  phrasePosition?: PhrasePosition
  previousChord?: AnalyzedProgressionChord | null
  nextChord?: ParsedProgressionChord | null
  scaleSet?: Set<string>
}): HarmonicFunction {
  const tonic = scale[0]
  const degree = scaleDegreeForRoot(root, scale)
  const isCadentialTonic = phrasePosition === "cadential" && samePitch(root, tonic) && inKey
  const previousWasTonicDominant = previousChord &&
    (previousChord.role === "dominant" || previousChord.role === "borrowedDominant") &&
    samePitch(previousChord.resolutionTarget.targetRoot, tonic)
  const nextIsChromaticDominant = nextChord &&
    isDominantQuality(nextChord.parsed.type) &&
    (!scaleSet || !parsedChordInKey(nextChord, scaleSet)) &&
    chordSharesToneWithParsed(root, type, nextChord)

  if(isCadentialTonic) return "cadenceChord"
  if(root === add(targetRoot, -1) && isDiminishedQuality(type)) return "leadingTone"
  if(!samePitch(targetRoot, tonic) && root === add(targetRoot, 7) && isDominantQuality(type)) return "secondaryDominant"

  if(!inKey) {
    if(isDominantQuality(type) && isBorrowedDominantRoot(root, tonic)) return "borrowedDominant"
    if(isBorrowedPredominantRoot(root, tonic)) return "borrowedPredominant"
    if(root === add(targetRoot, -1) || root === add(targetRoot, 1)) return "approachChord"
    if(root === add(targetRoot, -2) || root === add(targetRoot, 2)) return "passingChord"
    return "chromaticColor"
  }

  if(nextIsChromaticDominant && degree === 2) return "passingChord"
  if(previousWasTonicDominant && degree === 5) return "tonicSubstitute"
  if(degree === 0) return "tonic"
  if(degree === 2 || degree === 5) return "tonicSubstitute"
  if(degree === 1 || degree === 3) return "predominant"
  if(degree === 4) return "dominant"
  if(degree === 6) return isDiminishedQuality(type) ? "leadingTone" : "dominant"

  return "color"
}

function semitoneDistance(a: string, b: string) {
  const diff = Math.abs(idx(a) - idx(b))
  return Math.min(diff, 12 - diff)
}

function uniquePitches(notes: string[]) {
  return Array.from(new Set(notes.map(note => normalize(note))))
}

function commonPitches(fromNotes: string[], toNotes: string[]) {
  const toSet = new Set(toNotes.map(note => normalize(note)))
  return uniquePitches(fromNotes).filter(note => toSet.has(note))
}

function voiceLeadingMetrics(fromNotes: string[], toNotes: string[]) {
  const from = uniquePitches(fromNotes)
  const to = uniquePitches(toNotes)
  const common = commonPitches(from, to)

  if(from.length === 0 || to.length === 0) {
    return {
      score: 0,
      commonCount: 0,
      stepwiseCount: 0,
      largeLeapCount: 0,
      totalMotion: 0
    }
  }

  let score = common.length * 14
  let stepwiseCount = 0
  let largeLeapCount = 0
  let totalMotion = 0

  for(const note of from) {
    const nearest = Math.min(...to.map(target => semitoneDistance(note, target)))
    totalMotion += nearest

    if(nearest === 0) score += 10
    else if(nearest <= 2) {
      stepwiseCount += 1
      score += nearest === 1 ? 10 : 7
    } else if(nearest >= 5) {
      largeLeapCount += 1
      score -= nearest * 3.5
    } else {
      score -= nearest
    }
  }

  if(common.length === 0 && largeLeapCount >= 2) score -= 18
  if(common.length >= 2 && stepwiseCount > 0) score += 8

  return {
    score,
    commonCount: common.length,
    stepwiseCount,
    largeLeapCount,
    totalMotion
  }
}

function tonicOffsetForRoot(root: string, tonic: string) {
  const rootIdx = idx(root)
  const tonicIdx = idx(tonic)
  if(rootIdx < 0 || tonicIdx < 0) return -1
  return (rootIdx - tonicIdx + 12) % 12
}

function bassNoteForParsed(parsed: ParsedChord) {
  return parsed.bass ?? parsed.root
}

function targetMotionScores(lastDegree: number | null) {
  const scores = [18,18,18,18,18,18,18]
  if(lastDegree === null || lastDegree < 0) return scores

  const preferred: Record<number, number[]> = {
    0: [4,5,3,1],
    1: [4,0,3,6],
    2: [5,3,1,4],
    3: [4,0,1,5],
    4: [0,5,3,1],
    5: [1,3,4,0],
    6: [0,2,4,5]
  }

  for(const degree of preferred[lastDegree] || []) {
    scores[degree] += 22 - preferred[lastDegree].indexOf(degree) * 4
  }

  return scores
}

function buildResolutionPlan(progressionLength: number, key: string, mode: string, resolveWithin = 4): ResolutionPlan {
  const safeResolveWithin = Math.max(2, Math.min(8, Math.round(resolveWithin)))
  const scale = buildPitchScaleFromMode(key, mode)
  const elapsed = progressionLength % safeResolveWithin
  const resolutionDue = elapsed === 0 && progressionLength > 0

  return {
    resolveWithin: safeResolveWithin,
    slotsToResolution: resolutionDue ? 0 : safeResolveWithin - elapsed,
    resolutionDue,
    targetRoot: scale[0]
  }
}

function isStableTonicArrival(chord: AnalyzedProgressionChord | undefined, tonic: string) {
  return Boolean(chord && samePitch(chord.root, tonic) && isStableRole(chord.role))
}

function isLikelyLoopingVampAtBoundary(analyzed: AnalyzedProgressionChord[], plan: ResolutionPlan) {
  if(!plan.resolutionDue || analyzed.length < plan.resolveWithin) return false

  const window = analyzed.slice(-plan.resolveWithin)
  const last = window[window.length - 1]
  const previous = window[window.length - 2]
  if(!last || isTensionBearingRole(last.role) || isStableTonicArrival(last, plan.targetRoot)) return false
  if(previous && isTensionBearingRole(previous.role)) return false
  if(!isStableTonicArrival(window[0], plan.targetRoot)) return false

  const lateTension = window.slice(-2).some(chord => isTensionBearingRole(chord.role))
  const totalTension = window.filter(chord => chord.tension >= 58).length

  return !lateTension && totalTension <= 1
}

function phrasePositionForProgression(length: number, plan: ResolutionPlan, analyzed: AnalyzedProgressionChord[] = []): PhrasePosition {
  if(length === 0) return "startOfPhrase"

  const last = analyzed[analyzed.length - 1]
  const previous = analyzed[analyzed.length - 2]
  if(isLikelyLoopingVampAtBoundary(analyzed, plan)) return "loopingVamp"
  if(plan.resolutionDue && isStableTonicArrival(last, plan.targetRoot)) return "postCadentialRelease"
  if(plan.resolutionDue) return "cadential"
  if(plan.slotsToResolution === 1) return "preCadential"

  if(last?.role === "cadenceChord" || (previous?.role === "dominant" && last?.role === "tonic")) {
    return "postCadentialRelease"
  }

  if(length >= plan.resolveWithin && analyzed.slice(-Math.min(4, analyzed.length)).every(chord => chord.tension <= 28)) {
    return "loopingVamp"
  }

  return "midPhraseContinuation"
}

function targetChordTypeForRoot(root: string, scale: string[], mode: string): Quality | undefined {
  const symbol = buildDiatonicChords(scale[0], mode)[scaleDegreeForRoot(root, scale)]
  return symbol ? parse(symbol).type : undefined
}

function onwardResolutionRootForTarget(targetRoot: string, scale: string[]) {
  const degree = scaleDegreeForRoot(targetRoot, scale)
  if(degree === 1 || degree === 3) return scale[4] ?? add(scale[0], 7)
  if(degree === 4 || degree === 6) return scale[0]
  if(degree === 5 || degree === 2) return scale[1] ?? scale[0]
  return scale[0]
}

function resolutionOptionForRoot({
  targetRoot,
  scale,
  mode,
  plan,
  strength,
  resolutionType,
  expectedDistance,
  mandatorySoon,
  overdue,
  via
}:{
  targetRoot: string
  scale: string[]
  mode: string
  plan: ResolutionPlan
  strength: number
  resolutionType: ResolutionType
  expectedDistance: number
  mandatorySoon: boolean
  overdue: boolean
  via?: string[]
}) {
  const cleanTargetRoot = normalize(targetRoot)

  return resolutionOptionFor({
    targetRoot: cleanTargetRoot,
    scale,
    targetChordType: targetChordTypeForRoot(cleanTargetRoot, scale, mode),
    strength,
    resolutionType,
    expectedDistance,
    chordsUntilExpectedResolution: Math.min(plan.slotsToResolution, expectedDistance),
    mandatorySoon,
    overdue,
    via
  })
}

function resolutionTargetForRole({
  role,
  root,
  targetRoot,
  scale,
  mode,
  plan
}:{
  role: HarmonicFunction
  root: string
  targetRoot: string
  scale: string[]
  mode: string
  plan: ResolutionPlan
}) {
  const tonic = scale[0]
  const dominantRoot = scale[4] ?? add(tonic, 7)
  let resolvedTarget = normalize(targetRoot)
  let soon = plan.slotsToResolution <= 1
  let strength = 50
  let resolutionType: ResolutionType = "direct"
  let expectedDistance = 1
  const secondaryTargets: ResolutionOption[] = []
  const addSecondary = (
    nextTargetRoot: string,
    optionStrength: number,
    optionType: ResolutionType,
    optionDistance: number,
    via?: string[]
  ) => {
    if(samePitch(nextTargetRoot, resolvedTarget)) return
    if(secondaryTargets.some(target => samePitch(target.targetRoot, nextTargetRoot))) return

    secondaryTargets.push(resolutionOptionForRoot({
      targetRoot: nextTargetRoot,
      scale,
      mode,
      plan,
      strength: optionStrength,
      resolutionType: optionType,
      expectedDistance: optionDistance,
      mandatorySoon: optionDistance <= Math.max(1, plan.slotsToResolution),
      overdue: plan.resolutionDue && !samePitch(nextTargetRoot, plan.targetRoot),
      via
    }))
  }

  if(role === "tonic" || role === "tonicSubstitute" || role === "cadenceChord") {
    resolvedTarget = tonic
    strength = role === "tonicSubstitute" ? 56 : 82
    resolutionType = role === "tonicSubstitute" ? "delayed" : "direct"
    expectedDistance = role === "tonicSubstitute" ? 2 : 0
    if(role === "tonicSubstitute") {
      addSecondary(dominantRoot, 34, "delayed", 2, [symbolForQuality(dominantRoot, "7")])
    }
  } else if(role === "predominant" || role === "borrowedPredominant") {
    resolvedTarget = dominantRoot
    strength = role === "borrowedPredominant" ? 68 : 74
    resolutionType = "delayed"
    expectedDistance = 1
    addSecondary(tonic, 48, "delayed", 2, [symbolForQuality(dominantRoot, "7")])
  } else if(role === "dominant" || role === "borrowedDominant") {
    resolvedTarget = tonic
    soon = true
    strength = role === "borrowedDominant" ? 80 : 94
    resolutionType = "direct"
    expectedDistance = 1
    if(scale[5]) addSecondary(scale[5], 46, "deceptive", 1)
    if(scale[2]) addSecondary(scale[2], 34, "deceptive", 1)
  } else if(role === "leadingTone") {
    resolvedTarget = add(root, 1)
    soon = true
    strength = 95
    resolutionType = "direct"
    expectedDistance = 1
    if(!samePitch(resolvedTarget, tonic)) addSecondary(tonic, 42, "delayed", 3)
  } else if(role === "secondaryDominant" || role === "approachChord" || role === "passingChord") {
    soon = true
    strength = role === "secondaryDominant" ? 88 : 62
    resolutionType = "direct"
    expectedDistance = 1
    const onward = onwardResolutionRootForTarget(resolvedTarget, scale)
    if(onward) {
      addSecondary(onward, role === "secondaryDominant" ? 58 : 42, "delayed", 2, [symbolForQuality(resolvedTarget, targetChordTypeForRoot(resolvedTarget, scale, mode) ?? "maj")])
      if(!samePitch(onward, tonic)) {
        addSecondary(tonic, role === "secondaryDominant" ? 46 : 34, "delayed", 3, [
          symbolForQuality(resolvedTarget, targetChordTypeForRoot(resolvedTarget, scale, mode) ?? "maj"),
          symbolForQuality(onward, "7")
        ])
      }
    }
  } else if(role === "chromaticColor") {
    resolvedTarget = plan.targetRoot
    strength = 34
    resolutionType = "delayed"
    expectedDistance = Math.max(2, plan.slotsToResolution)
  } else if(role === "color") {
    resolvedTarget = samePitch(root, tonic) ? tonic : plan.targetRoot
    strength = 38
    resolutionType = "delayed"
    expectedDistance = Math.max(1, plan.slotsToResolution)
  }

  return resolutionTargetFor({
    targetRoot: resolvedTarget,
    scale,
    targetChordType: targetChordTypeForRoot(resolvedTarget, scale, mode),
    strength,
    resolutionType,
    expectedDistance,
    chordsUntilExpectedResolution: role === "predominant" || role === "borrowedPredominant"
      ? Math.max(1, plan.slotsToResolution)
      : plan.slotsToResolution,
    mandatorySoon: soon,
    overdue: plan.resolutionDue && !samePitch(root, plan.targetRoot) && role !== "cadenceChord",
    secondaryTargets
  })
}

function candidateGeneratedReasons(candidate: Pick<ProgressionSuggestionCandidate, "inKey" | "functionCategory" | "targetRoot" | "root" | "bass">, scale: string[]) {
  const reasons: string[] = []
  const degree = scaleDegreeForRoot(candidate.root, scale)

  if(candidate.inKey) reasons.push("diatonic option in the fixed key scale")
  if(!candidate.inKey) reasons.push("chromatic option evaluated inside the fixed key")
  if(candidate.functionCategory === "secondaryDominant") reasons.push("applied dominant targeting a fixed-key scale degree")
  if(candidate.functionCategory === "leadingTone") reasons.push("leading-tone chord targeting a fixed-key scale degree")
  if(candidate.functionCategory === "borrowedPredominant" || candidate.functionCategory === "borrowedDominant") reasons.push("borrowed harmony represented inside the fixed key")
  if(candidate.functionCategory === "approachChord" || candidate.functionCategory === "passingChord") reasons.push("linear approach or passing option toward a modeled target")
  if(candidate.bass) reasons.push("slash-bass color candidate with fixed-key validation")
  if(degree >= 0) reasons.push(`root is scale degree ${degree + 1} of the selected key`)

  return reasons.length ? reasons : ["candidate produced by the fixed-key generator"]
}

function candidateValidReasons(candidate: Pick<ProgressionSuggestionCandidate, "symbol" | "type" | "inKey" | "resolutionTarget">) {
  const reasons = [
    "valid chord symbol and supported quality",
    `quality ${candidate.type} is recognized by the parser`
  ]

  if(candidate.inKey) reasons.push("all chord tones fit the selected key/mode")
  else reasons.push("non-diatonic tones have an explicit local function")
  if(candidate.resolutionTarget.targetScaleDegree !== null) reasons.push("resolution target belongs to the fixed key scale")
  if(candidate.resolutionTarget.secondaryTargets.length > 0) reasons.push("alternate resolution routes remain inside fixed-key logic")

  return reasons
}

function scaleDegreeLabel(degree: number | null) {
  if(degree === null || degree < 0) return "outside the scale"
  return ["I", "II", "III", "IV", "V", "VI", "VII"][degree] ?? `${degree + 1}`
}

function roleLabel(role: HarmonicFunction) {
  const labels: Record<HarmonicFunction, string> = {
    tonic: "tonic",
    tonicSubstitute: "tonic substitute",
    predominant: "predominant",
    dominant: "dominant",
    secondaryDominant: "secondary dominant",
    leadingTone: "leading-tone",
    borrowedPredominant: "borrowed predominant",
    borrowedDominant: "borrowed dominant",
    chromaticColor: "chromatic color",
    color: "color",
    passingChord: "passing chord",
    approachChord: "approach chord",
    cadenceChord: "cadence chord"
  }

  return labels[role]
}

function familyLabel(family: CandidateFamily) {
  const labels: Record<CandidateFamily, string> = {
    diatonic: "diatonic harmony",
    appliedDominant: "applied dominant",
    leadingTone: "leading-tone harmony",
    borrowed: "borrowed harmony",
    cadential: "cadential harmony",
    prolongation: "prolongation",
    chromaticColor: "chromatic color",
    approach: "approach harmony",
    passing: "passing harmony"
  }

  return labels[family]
}

function isTensionBearingRole(role: HarmonicFunction) {
  return role === "dominant" ||
    role === "secondaryDominant" ||
    role === "leadingTone" ||
    role === "borrowedDominant" ||
    role === "approachChord"
}

function isStableRole(role: HarmonicFunction) {
  return role === "tonic" || role === "tonicSubstitute" || role === "cadenceChord"
}

function isTonicSubstituteRole(role: HarmonicFunction) {
  return role === "tonicSubstitute"
}

function targetDisplayName(target: ResolutionOption, key: string, mode: string) {
  const root = spellNoteForKey(target.targetRoot, key, mode)
  const suffix = target.targetChordType ? QUALITY_SUFFIX[target.targetChordType] : ""
  return `${root}${suffix}`
}

function candidateTheoryNote(
  symbol: string,
  family: CandidateFamily,
  role: HarmonicFunction,
  root: string,
  target: ResolutionTarget,
  key: string,
  mode: string,
  scale: string[]
) {
  const degree = scaleDegreeLabel(scaleDegreeOrNull(root, scale))
  const targetName = targetDisplayName(target, key, mode)
  const familyText = familyLabel(family)
  const roleText = roleLabel(role)

  if(family === "diatonic") {
    return `${symbol} is ${familyText} in ${key} ${mode}: its root is ${degree}, so it functions as ${roleText}.`
  }

  if(family === "appliedDominant") {
    return `${symbol} is an applied dominant in the fixed key, pointing locally toward ${targetName} without changing the tonic.`
  }

  if(family === "leadingTone") {
    return `${symbol} is a leading-tone chord: its root wants to resolve by semitone into ${targetName}.`
  }

  if(family === "borrowed") {
    return `${symbol} is borrowed color inside ${key} ${mode}; it is valid because its function still points back into the fixed-key phrase.`
  }

  if(family === "cadential") {
    return `${symbol} supports cadence behavior by preparing or completing arrival on ${targetName}.`
  }

  if(family === "prolongation") {
    return `${symbol} prolongs stable harmony while keeping motion inside the selected key.`
  }

  if(family === "approach" || family === "passing") {
    return `${symbol} is ${familyText}, used as directed motion toward ${targetName}.`
  }

  return `${symbol} is chromatic color, allowed only because it has an explicit relationship to ${targetName}.`
}

function candidateResolutionNote(candidate: Pick<ProgressionSuggestionCandidate, "functionCategory" | "resolutionTarget" | "targetRoot">, key: string, mode: string) {
  const targetName = targetDisplayName(candidate.resolutionTarget, key, mode)
  const roleText = roleLabel(candidate.functionCategory)
  const timing = candidate.resolutionTarget.overdue
    ? "that resolution is overdue"
    : candidate.resolutionTarget.mandatorySoon
      ? "that resolution is expected soon"
      : `there are about ${candidate.resolutionTarget.chordsUntilExpectedResolution} chord slots before it must resolve`
  const secondary = candidate.resolutionTarget.secondaryTargets.length
    ? ` Alternate route: ${targetDisplayName(candidate.resolutionTarget.secondaryTargets[0], key, mode)}.`
    : ""

  return `As ${roleText}, it has a ${candidate.resolutionTarget.resolutionType} pull toward ${targetName} (strength ${candidate.resolutionTarget.strength}/100); ${timing}.${secondary}`
}

function buildCandidateCompletionPath(candidate: ProgressionSuggestionCandidate, key: string, mode: string, state?: ProgressionState) {
  const targetName = targetDisplayName(candidate.resolutionTarget, key, mode)
  const tonicName = tonicResolutionSymbol(key, mode)

  if(state?.context.currentChord && isTensionBearingRole(state.context.currentChord.role)) {
    if(candidateMatchesResolutionTarget(candidate, state.context.currentChord.resolutionTarget)) {
      if(candidate.functionCategory === "predominant" || candidate.functionCategory === "borrowedPredominant") {
        const dominant = symbolForQuality(state.scale[4] ?? add(state.tonicRoot, 7), "7", undefined, key, mode)
        return [candidate.symbol, dominant, tonicName]
      }

      if(isTensionBearingRole(candidate.functionCategory) && !samePitch(candidate.root, candidate.resolutionTarget.targetRoot)) {
        return [candidate.symbol, targetName]
      }

      return [candidate.symbol]
    }

    if(isDeceptiveRelease(candidate, state.context.currentChord)) {
      return [candidate.symbol, tonicName]
    }
  }

  if(candidate.functionCategory === "predominant" || candidate.functionCategory === "borrowedPredominant") {
    const dominant = symbolForQuality(candidate.resolutionTarget.targetRoot, "7", undefined, key, mode)
    return samePitch(candidate.resolutionTarget.targetRoot, state?.tonicRoot ?? normalize(key))
      ? [candidate.symbol, targetName]
      : [candidate.symbol, dominant, tonicName]
  }

  if(isTensionBearingRole(candidate.functionCategory) && !samePitch(candidate.root, candidate.resolutionTarget.targetRoot)) {
    return [candidate.symbol, targetName]
  }

  if(state?.context.currentChord && isTensionBearingRole(state.context.currentChord.role)) {
    return [candidate.symbol]
  }

  return [candidate.symbol]
}

function scoreFactorSummary(breakdown?: ScoreBreakdown) {
  if(!breakdown) return ""

  const meaningful = breakdown.parts
    .filter(part => Math.abs(part.weighted) > 0.5)

  const strongest = meaningful
    .filter(part => part.weighted > 0)
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 2)
    .map(part => part.label)

  const limiting = meaningful
    .filter(part => part.weighted < 0)
    .sort((a, b) => a.weighted - b.weighted)
    .slice(0, 2)
    .map(part => part.label)

  const positiveText = strongest.length ? ` Strongest factors: ${strongest.join(", ")}.` : ""
  const limitingText = limiting.length ? ` Limiting factors: ${limiting.join(", ")}.` : " It is not held back by any major penalty."

  return `${positiveText}${limitingText}`
}

function commonToneRankText(candidate: ProgressionSuggestionCandidate, progression: ParsedProgressionChord[], key: string, mode: string) {
  const last = progression[progression.length - 1]
  if(!last) return ""

  const common = commonPitches(last.notes, candidate.notes)
  if(common.length === 0) return " It has no common tones with the previous chord, so the motion must justify itself functionally."

  const names = common.map(note => spellNoteForKey(note, key, mode)).join(", ")
  return ` It keeps ${names} as common ${common.length === 1 ? "tone" : "tones"}, which helps the change sound connected.`
}

function rankNoteForCandidate(
  candidate: ProgressionSuggestionCandidate,
  state: ProgressionState,
  breakdown?: ScoreBreakdown,
  progression: ParsedProgressionChord[] = []
) {
  const current = state.context.currentChord
  const targetName = targetDisplayName(candidate.resolutionTarget, state.key, state.mode)
  const currentTargetName = current ? targetDisplayName(current.resolutionTarget, state.key, state.mode) : targetName
  const suffix = `${commonToneRankText(candidate, progression, state.key, state.mode)}${scoreFactorSummary(breakdown)}`

  if(current && isTensionBearingRole(current.role) && candidateMatchesResolutionTarget(candidate, current.resolutionTarget)) {
    return `${candidate.symbol} ranks well because it resolves the active ${roleLabel(current.role)} tension into ${currentTargetName}.${suffix}`
  }

  if(state.context.resolutionDue && isStableRole(candidate.functionCategory)) {
    return `${candidate.symbol} ranks well because resolution is due and it closes the phrase with stable harmony.${suffix}`
  }

  if(state.phrasePosition === "preCadential" && isTensionBearingRole(candidate.functionCategory)) {
    return `${candidate.symbol} ranks well because the phrase is near cadence and needs directed tension toward ${targetName}.${suffix}`
  }

  if(state.phrasePosition === "midPhraseContinuation" && (candidate.functionCategory === "predominant" || candidate.functionCategory === "tonicSubstitute")) {
    return `${candidate.symbol} ranks well because the phrase is still developing and this function keeps the sentence moving coherently.${suffix}`
  }

  return `${candidate.symbol} is ranked by functional fit, resolution route, phrase position, voice leading, common-note connection, and common progression behavior.${suffix}`
}

function targetRootForAnalyzedChord(
  parsed: ParsedChord,
  scale: string[],
  scaleSet: Set<string>,
  fallbackTarget: string,
  nextChord?: ParsedProgressionChord | null
) {
  const root = parsed.root
  const fifthBelow = add(root, -7)
  const halfStepAbove = add(root, 1)
  const chordInKey = isInKeyNotes(buildChordWithBass(parsed).notes, scaleSet)
  const degree = scaleDegreeForRoot(root, scale)

  if(nextChord && chordInKey && chordSharesToneWithParsed(root, parsed.type, nextChord)) {
    const nextInKey = parsedChordInKey(nextChord, scaleSet)
    if(isDominantQuality(nextChord.parsed.type) && !nextInKey) {
      return nextChord.parsed.root
    }

    const nextDegree = scaleDegreeForRoot(nextChord.parsed.root, scale)
    if((degree === 1 || degree === 3) && nextDegree === 4) {
      return nextChord.parsed.root
    }
  }

  if(parsed.type === "maj" && chordInKey && degree !== 4) {
    return fallbackTarget
  }

  if(isDominantQuality(parsed.type) && scaleSet.has(normalize(fifthBelow))) {
    return fifthBelow
  }

  if(isDiminishedQuality(parsed.type) && scaleSet.has(normalize(halfStepAbove))) {
    return halfStepAbove
  }

  return fallbackTarget
}

function analyzeParsedProgressionChord(
  item: ParsedProgressionChord,
  scale: string[],
  scaleSet: Set<string>,
  mode: string,
  plan: ResolutionPlan,
  phrasePosition: PhrasePosition,
  previousChord: AnalyzedProgressionChord | null = null,
  nextChord: ParsedProgressionChord | null = null
): AnalyzedProgressionChord {
  const inKey = isInKeyNotes(item.notes, scaleSet)
  const targetRoot = targetRootForAnalyzedChord(item.parsed, scale, scaleSet, plan.targetRoot, nextChord)
  const role = classifyHarmonicFunction({
    root: item.parsed.root,
    type: item.parsed.type,
    inKey,
    targetRoot,
    scale,
    phrasePosition,
    previousChord,
    nextChord,
    scaleSet
  })
  const resolutionTarget = resolutionTargetForRole({
    role,
    root: item.parsed.root,
    targetRoot,
    scale,
    mode,
    plan
  })
  const cadenceAdjustment = phrasePosition === "cadential" && role !== "cadenceChord" ? 8 : 0
  const slashAdjustment = item.parsed.bass && item.parsed.bass !== item.parsed.root ? 5 : 0
  const chromaticAdjustment = inKey ? 0 : 7

  return {
    symbol: item.symbol,
    root: item.parsed.root,
    type: item.parsed.type,
    bass: item.parsed.bass,
    notes: item.notes,
    scaleDegree: scaleDegreeOrNull(item.parsed.root, scale),
    role,
    tension: Math.min(100, roleBaseTension(role) + cadenceAdjustment + slashAdjustment + chromaticAdjustment),
    resolutionTarget,
    resolutionOptions: [resolutionTarget, ...resolutionTarget.secondaryTargets]
  }
}

function analyzeProgressionChords(
  parsedProgression: ParsedProgressionChord[],
  scale: string[],
  scaleSet: Set<string>,
  mode: string,
  plan: ResolutionPlan,
  phrasePosition: PhrasePosition
) {
  const analyzed: AnalyzedProgressionChord[] = []

  for(let i = 0; i < parsedProgression.length; i++) {
    analyzed.push(analyzeParsedProgressionChord(
      parsedProgression[i],
      scale,
      scaleSet,
      mode,
      plan,
      phrasePosition,
      analyzed[i - 1] ?? null,
      parsedProgression[i + 1] ?? null
    ))
  }

  return analyzed
}

function cadencePressureFor(plan: ResolutionPlan, tensionLevel: number) {
  if(plan.resolutionDue) return 100
  const distancePressure = (1 - plan.slotsToResolution / plan.resolveWithin) * 72
  const tensionPressure = tensionLevel * 0.28
  return Math.max(0, Math.min(100, Math.round(distancePressure + tensionPressure)))
}

function debugContextFor(state: ProgressionState): ProgressionDebugContext {
  return {
    key: state.key,
    mode: state.mode,
    tonicRoot: state.tonicRoot,
    tonicScaleDegree: 0,
    phrasePosition: state.phrasePosition,
    tensionLevel: state.tensionLevel,
    cadencePressure: state.cadencePressure,
    slotsToResolution: state.remainingSlotsToResolution,
    resolutionDue: state.context.resolutionDue,
    harmonicNeed: state.harmonicNeed
  }
}

function harmonicNeedForContext(
  currentChord: AnalyzedProgressionChord | null,
  phrasePosition: PhrasePosition,
  plan: ResolutionPlan,
  tensionLevel: number
): HarmonicNeed {
  if(!currentChord) return "stability"
  if(phrasePosition === "loopingVamp") return "prolongation"
  if(phrasePosition === "postCadentialRelease") return "prolongation"
  if(phrasePosition === "cadential" || plan.resolutionDue) {
    return isTensionBearingRole(currentChord.role) ? "cadenceCompletion" : "prolongation"
  }
  if(isTensionBearingRole(currentChord.role)) {
    return currentChord.resolutionTarget.mandatorySoon || plan.slotsToResolution <= 1
      ? "resolution"
      : "deceptiveDelay"
  }
  if(phrasePosition === "preCadential") {
    return currentChord.role === "predominant" || currentChord.role === "borrowedPredominant"
      ? "tension"
      : "preparation"
  }
  if(currentChord.role === "predominant" || currentChord.role === "borrowedPredominant") return "tension"
  if(tensionLevel <= 20 && plan.slotsToResolution >= 3) return "movement"
  if(plan.slotsToResolution <= 2) return "preparation"

  return "movement"
}

export function analyzeProgressionState({
  progression,
  key = "C",
  mode = "Ionian",
  resolveWithin = 4
}:{
  progression: string[]
  key?: string
  mode?: string
  resolveWithin?: number
}): ProgressionState {
  const parsedProgression = parseProgressionSymbols(progression)
  const scale = buildPitchScaleFromMode(key, mode)
  const scaleSet = canonicalPitchSet(scale)
  const plan = buildResolutionPlan(parsedProgression.length, key, mode, resolveWithin)
  const preliminaryPosition = phrasePositionForProgression(parsedProgression.length, plan)
  const preliminaryChords = analyzeProgressionChords(parsedProgression, scale, scaleSet, mode, plan, preliminaryPosition)
  const phrasePosition = phrasePositionForProgression(parsedProgression.length, plan, preliminaryChords)
  const chords = phrasePosition === preliminaryPosition
    ? preliminaryChords
    : analyzeProgressionChords(parsedProgression, scale, scaleSet, mode, plan, phrasePosition)
  const currentChord = chords[chords.length - 1] ?? null
  const previousChord = chords[chords.length - 2] ?? null
  const tonicRoot = normalize(scale[0])
  const tonicTarget = resolutionTargetFor({
    targetRoot: tonicRoot,
    scale,
    targetChordType: targetChordTypeForRoot(tonicRoot, scale, mode),
    chordsUntilExpectedResolution: plan.slotsToResolution,
    mandatorySoon: plan.slotsToResolution <= 1 || plan.resolutionDue,
    overdue: false
  })
  const currentTarget = currentChord?.resolutionTarget ?? tonicTarget
  const tensionLevel = currentChord?.tension ?? 0
  const cadencePressure = cadencePressureFor(plan, tensionLevel)
  const harmonicNeed = harmonicNeedForContext(currentChord, phrasePosition, plan, tensionLevel)
  const context: HarmonicContext = {
    key,
    mode,
    tonicScaleDegree: 0,
    tonicRoot,
    currentChord,
    previousChord,
    phrasePosition,
    resolveWithin: plan.resolveWithin,
    slotsToResolution: plan.slotsToResolution,
    resolutionDue: plan.resolutionDue,
    currentTensionState: {
      level: tensionLevel,
      label: tensionLabel(tensionLevel)
    },
    currentHarmonicFunctionState: currentChord?.role ?? null,
    currentTargetChordState: currentTarget,
    harmonicNeed
  }

  return {
    key,
    mode,
    tonicRoot,
    scale,
    chordSequence: parsedProgression.map(item => item.symbol),
    chords,
    fixedAnchors: parsedProgression.map(() => true),
    isCompletingProgression: parsedProgression.length > 0,
    phraseLength: plan.resolveWithin,
    phrasePosition,
    cadencePressure,
    tensionLevel,
    targetChord: currentTarget,
    targetFunction: currentChord?.role ?? null,
    remainingSlotsToResolution: plan.slotsToResolution,
    harmonicNeed,
    context
  }
}

function progressionTargetScores(progression: ReturnType<typeof parseProgressionSymbols>, key: string, mode: string) {
  const scale = buildPitchScaleFromMode(key, mode)
  const scaleSet = canonicalPitchSet(scale)
  const last = progression[progression.length - 1]

  if(!last) {
    return [48, 18, 20, 28, 18, 34, 12]
  }

  const lastDegree = last ? scaleDegreeForRoot(last.parsed.root, scale) : 0
  const scores = targetMotionScores(lastDegree >= 0 ? lastDegree : null)
  const rootCounts = new Map<string, number>()

  for(const item of progression) {
    rootCounts.set(item.parsed.root, (rootCounts.get(item.parsed.root) || 0) + 1)
  }

  if(last) {
    for(let degree = 0; degree < scale.length; degree++) {
      const targetRoot = scale[degree]
      const leadingTone = add(targetRoot, -1)
      const upperNeighbor = add(targetRoot, 1)

      if(last.notes.includes(leadingTone)) scores[degree] += scaleSet.has(normalize(leadingTone)) ? 16 : 38
      if(last.notes.includes(upperNeighbor)) scores[degree] += 10
      if(last.parsed.root === add(targetRoot, 7)) scores[degree] += 14
    }
  }

  for(let degree = 0; degree < scale.length; degree++) {
    scores[degree] -= (rootCounts.get(normalize(scale[degree])) || 0) * 3
  }

  return scores
}

function qualityWeight(type: Quality, complex: boolean) {
  if(type === "maj") return complex ? 8 : 12
  if(type === "m") return 8
  if(type === "7b5" || type === "7#5" || type === "7b9" || type === "7#9") return complex ? 12 : 3
  if(type === "11" || type === "13" || type === "m11") return complex ? 9 : -8
  if(type === "7" || type === "m7" || type === "maj7") return complex ? 8 : 5
  if(type === "7sus2" || type === "7sus4") return complex ? 10 : -20
  if(type === "sus2" || type === "sus4") return complex ? 7 : 4
  if(type === "aug") return complex ? 9 : -12
  if(type === "dim" || type === "dim7" || type === "m7b5") return complex ? 5 : -4
  return 0
}

function leadingTonePullScore(candidate: ProgressionSuggestionCandidate, scale: string[], scaleSet: Set<string>) {
  let score = 0
  const targetRoot = candidate.targetRoot
  const leadingTone = add(targetRoot, -1)
  const upperNeighbor = add(targetRoot, 1)

  if(candidate.notes.includes(leadingTone)) score += scaleSet.has(normalize(leadingTone)) ? 14 : 36
  if(candidate.notes.includes(upperNeighbor)) score += 10
  if(candidate.root === add(targetRoot, 7)) score += isDominantQuality(candidate.type) ? 24 : 20
  if(candidate.type === "aug") score += 10

  const targetDegree = scaleDegreeForRoot(targetRoot, scale)
  if(targetDegree >= 0) score += targetDegree === 0 ? 4 : 0

  return score
}

function progressionPatternScore(
  candidate: ProgressionSuggestionCandidate,
  progression: ReturnType<typeof parseProgressionSymbols>,
  scale: string[]
) {
  if(progression.length === 0) return 0

  const rootOffset = tonicOffsetForRoot(candidate.root, scale[0])
  if(rootOffset < 0) return 0

  const progressionOffsets = progression
    .map(item => tonicOffsetForRoot(item.parsed.root, scale[0]))
    .filter(offset => offset >= 0)

  if(progressionOffsets.length === 0) return 0

  let bestScore = 0

  for(const pattern of COMMON_PROGRESSION_PATTERNS) {
    const maxMatchLength = Math.min(progressionOffsets.length, pattern.offsets.length)

    for(let length = maxMatchLength; length >= 1; length--) {
      const recent = progressionOffsets.slice(-length)

      for(let start = 0; start < pattern.offsets.length; start++) {
        let mismatches = 0
        for(let i = 0; i < recent.length; i++) {
          if(recent[i] !== pattern.offsets[(start + i) % pattern.offsets.length]) {
            mismatches += 1
          }
        }

        const allowedMismatches = length >= 3 ? 1 : 0
        const expectedNextOffset = pattern.offsets[(start + length) % pattern.offsets.length]
        if(mismatches > allowedMismatches || rootOffset !== expectedNextOffset) continue

        const matchScore = length === 1
          ? Math.round(pattern.boost * 0.32)
          : pattern.boost + length * 14 + 42 - mismatches * 20

        bestScore = Math.max(bestScore, matchScore)
      }
    }
  }

  if(bestScore > 0 && candidate.type === "7") bestScore += 4
  if(bestScore > 0 && (candidate.type === "maj" || candidate.type === "m")) bestScore += 6

  return bestScore
}

function dominantSeventhFunctionScore(
  candidate: ProgressionSuggestionCandidate,
  progression: ReturnType<typeof parseProgressionSymbols>,
  scale: string[]
) {
  if(candidate.type !== "7") return 0

  const last = progression[progression.length - 1]
  const targetDegree = scaleDegreeForRoot(candidate.targetRoot, scale)
  const rootDegree = scaleDegreeForRoot(candidate.root, scale)
  const bluesRoots = [scale[0], scale[3], scale[4]]
  let score = 0

  if(candidate.root === add(candidate.targetRoot, 7)) {
    score += targetDegree === 0 ? 56 : 30
    if(targetDegree === 4) score += 18
  }

  if(rootDegree === 4 && candidate.targetRoot === scale[0]) score += 28

  if(last && last.parsed.root === scale[0] && candidate.root === scale[0]) {
    score += 24
  }

  if(last?.parsed.type === "7" && bluesRoots.includes(last.parsed.root) && bluesRoots.includes(candidate.root)) {
    score += 38
    if(last.parsed.root === scale[0] && candidate.root === scale[3]) score += 18
    if(last.parsed.root === scale[3] && candidate.root === scale[4]) score += 18
    if(last.parsed.root === scale[4] && candidate.root === scale[0]) score += 10
  }

  return score
}

function majorSeventhFunctionScore(
  candidate: ProgressionSuggestionCandidate,
  progression: ReturnType<typeof parseProgressionSymbols>,
  scale: string[]
) {
  if(candidate.type !== "maj7") return 0

  const last = progression[progression.length - 1]
  const borrowedColorRoots = [add(scale[0], 1), add(scale[0], 3), add(scale[0], 8), add(scale[0], 10)]
  let score = 0

  if(candidate.root === scale[0]) {
    score += 42
    if(!last || last.parsed.root !== scale[0]) score += 14
  }

  if(candidate.root === scale[3]) {
    score += candidate.targetRoot === scale[0] ? 32 : 18
    if(last && last.parsed.root === scale[0]) score += 14
  }

  if(!candidate.inKey && borrowedColorRoots.includes(candidate.root)) {
    score += candidate.root === add(scale[0], 8) ? 40 : 24
    if(candidate.targetRoot === scale[0]) score += 18
  }

  return score
}

function dominantFlatFiveFunctionScore(
  candidate: ProgressionSuggestionCandidate,
  progression: ReturnType<typeof parseProgressionSymbols>,
  scale: string[]
) {
  if(candidate.type !== "7b5") return 0

  const last = progression[progression.length - 1]
  const targetDegree = scaleDegreeForRoot(candidate.targetRoot, scale)
  let score = 0

  if(candidate.root === add(candidate.targetRoot, 7)) {
    score += targetDegree === 0 ? 60 : 34
    if(targetDegree === 4) score += 20
  }

  if(
    last &&
    last.parsed.root === scale[0] &&
    candidate.root === add(scale[1], 7) &&
    candidate.targetRoot === scale[1]
  ) {
    score += 68
  }

  return score
}

function diminishedFunctionScore(
  candidate: ProgressionSuggestionCandidate,
  progression: ReturnType<typeof parseProgressionSymbols>,
  scale: string[]
) {
  if(!isDiminishedQuality(candidate.type)) return 0

  const last = progression[progression.length - 1]
  const targetDegree = scaleDegreeForRoot(candidate.targetRoot, scale)
  const fullyDiminished = candidate.type === "dim7"
  let score = 0

  if(candidate.root === add(candidate.targetRoot, -1)) {
    score += targetDegree === 0
      ? fullyDiminished ? 74 : 58
      : fullyDiminished ? 46 : 34
    if(targetDegree === 4) score += fullyDiminished ? 24 : 16
  }

  if(
    last &&
    last.parsed.root === scale[0] &&
    candidate.root === add(scale[0], 1) &&
    candidate.targetRoot === scale[1]
  ) {
    score += fullyDiminished ? 84 : 66
  }

  return score
}

function augmentedFunctionScore(
  candidate: ProgressionSuggestionCandidate,
  progression: ReturnType<typeof parseProgressionSymbols>,
  scale: string[]
) {
  if(candidate.type !== "aug") return 0

  const last = progression[progression.length - 1]
  const targetDegree = scaleDegreeForRoot(candidate.targetRoot, scale)
  let score = 0

  if(candidate.root === add(candidate.targetRoot, 7)) {
    score += targetDegree === 0 ? 58 : 28
    if(targetDegree === 4) score += 18
  }

  if(
    last &&
    last.parsed.root === scale[0] &&
    candidate.root === scale[0] &&
    candidate.targetRoot === scale[3]
  ) {
    score += 66
  }

  return score
}

function resolutionIntentScore(candidate: ProgressionSuggestionCandidate, plan: ResolutionPlan, scale: string[]) {
  const degree = scaleDegreeForRoot(candidate.root, scale)
  const isResolutionRoot = candidate.root === plan.targetRoot
  const resolvesToTarget = candidate.targetRoot === plan.targetRoot
  const isTonicFamily =
    candidate.inKey &&
    (candidate.functionCategory === "tonic" || candidate.functionCategory === "tonicSubstitute" || candidate.functionCategory === "cadenceChord")
  const isCadentialTension =
    candidate.functionCategory === "dominant" ||
    candidate.functionCategory === "secondaryDominant" ||
    candidate.functionCategory === "leadingTone" ||
    candidate.functionCategory === "borrowedDominant"

  if(plan.resolutionDue) {
    let score = 0
    if(isResolutionRoot) score += 86
    else if(isTonicFamily) score += 34
    if(!candidate.inKey) score -= 42
    if(isCadentialTension && !isResolutionRoot) score -= 28
    return score
  }

  if(plan.slotsToResolution === 1) {
    let score = 0
    if(resolvesToTarget && candidate.functionCategory === "secondaryDominant") score += 46
    if(resolvesToTarget && candidate.functionCategory === "leadingTone") score += 42
    if(resolvesToTarget && candidate.functionCategory === "borrowedDominant") score += 26
    if(candidate.inKey && candidate.functionCategory === "dominant") score += 34
    if(candidate.inKey && candidate.functionCategory === "predominant") score += 14
    if(isResolutionRoot || isTonicFamily) score -= 18
    return score
  }

  if(plan.slotsToResolution === 2) {
    let score = 0
    if(resolvesToTarget && candidate.functionCategory === "secondaryDominant") score += 40
    if(resolvesToTarget && candidate.functionCategory === "leadingTone") score += 36
    if(resolvesToTarget && candidate.functionCategory === "borrowedDominant") score += 22
    if(candidate.inKey && candidate.functionCategory === "dominant") score += 28
    if(candidate.inKey && candidate.functionCategory === "predominant") score += 10
    if(isResolutionRoot) score -= 10
    return score
  }

  if(plan.slotsToResolution === 3) {
    let score = 0
    if(candidate.functionCategory === "predominant") score += 24
    if(candidate.functionCategory === "secondaryDominant" && resolvesToTarget) score += 14
    if(candidate.functionCategory === "chromaticColor") score += 8
    if(degree === 0) score -= 6
    return score
  }

  let score = 0
  if(candidate.functionCategory === "tonic") score += 12
  if(candidate.functionCategory === "tonicSubstitute") score += 10
  if(candidate.functionCategory === "predominant") score += 12
  if(candidate.functionCategory === "borrowedPredominant") score += 9
  if(candidate.functionCategory === "chromaticColor") score += 7
  if(resolvesToTarget && isCadentialTension) score -= 8
  return score
}

function phrasePositionScore(candidate: ProgressionSuggestionCandidate, plan: ResolutionPlan) {
  const earlyPhrase = plan.slotsToResolution >= Math.max(4, plan.resolveWithin - 1)
  const middlePhrase = plan.slotsToResolution > 2 && !earlyPhrase

  if(earlyPhrase) {
    if(candidate.functionCategory === "tonic" || candidate.functionCategory === "tonicSubstitute") return 10
    if(candidate.functionCategory === "predominant") return 8
    if(candidate.functionCategory === "borrowedPredominant") return 5
    if(candidate.functionCategory === "chromaticColor") return 4
    if(candidate.functionCategory === "secondaryDominant" || candidate.functionCategory === "leadingTone") return -4
  }

  if(middlePhrase) {
    if(candidate.functionCategory === "predominant") return 12
    if(candidate.functionCategory === "borrowedPredominant") return 10
    if(candidate.functionCategory === "chromaticColor") return 9
    if(candidate.functionCategory === "secondaryDominant") return 7
  }

  return 0
}

function bassMotionScore(
  candidate: ProgressionSuggestionCandidate,
  progression: ReturnType<typeof parseProgressionSymbols>,
  scaleSet: Set<string>,
  plan: ResolutionPlan
) {
  if(!candidate.bass) return 0

  const last = progression[progression.length - 1]
  let score = -20

  if(last) {
    const lastBass = bassNoteForParsed(last.parsed)
    const motion = semitoneDistance(lastBass, candidate.bass)

    if(motion === 1) score += 34
    else if(motion === 2) score += 28
    else if(motion === 3) score += 12
    else if(motion === 4 || motion === 5) score += 7
    else if(motion === 0) score -= 26
    else score -= 8

    if(last.parsed.bass && motion <= 2 && motion > 0) score += 8
  }

  if(candidate.bass === candidate.targetRoot) score += 12
  if(plan.resolutionDue && candidate.bass === plan.targetRoot) score += 18
  score += scaleSet.has(normalize(candidate.bass)) ? 6 : -8

  return score
}

function isResolutionQualityCompatible(candidate: Pick<ProgressionSuggestionCandidate, "type" | "inKey">, target: ResolutionOption) {
  const targetType = target.targetChordType
  if(!targetType) return true

  const compatible: Record<Quality, Quality[]> = {
    maj: ["maj", "maj7", "6", "add9", "6add9", "maj9", "sus2", "sus4"],
    m: ["m", "m7", "m6", "madd9", "m9", "sus2", "sus4"],
    "7": ["7", "7b5", "7#5", "7b9", "7#9", "9", "11", "13", "7sus2", "7sus4", "sus2", "sus4"],
    "7b5": ["7b5", "7"],
    "7#5": ["7#5", "7", "aug"],
    "7b9": ["7b9", "7", "9"],
    "7#9": ["7#9", "7", "9"],
    maj7: ["maj", "maj7", "6", "add9", "6add9", "maj9"],
    "6": ["maj", "6", "add9", "6add9"],
    m6: ["m", "m6", "madd9"],
    add9: ["maj", "add9", "6add9", "sus2"],
    madd9: ["m", "madd9", "m9", "sus2"],
    "6add9": ["maj", "6", "add9", "6add9"],
    maj9: ["maj", "maj7", "add9", "maj9"],
    m9: ["m", "m7", "madd9", "m9", "m11"],
    "9": ["7", "9", "11", "13", "7sus2", "7sus4"],
    "11": ["7", "9", "11", "13", "7sus4"],
    "13": ["7", "9", "11", "13"],
    m7: ["m", "m7", "m9", "m11", "madd9"],
    m11: ["m", "m7", "m9", "m11", "sus4"],
    m7b5: ["m7b5", "dim"],
    dim: ["dim", "dim7", "m7b5"],
    dim7: ["dim", "dim7"],
    sus2: ["sus2", "maj", "m"],
    sus4: ["sus4", "maj", "m"],
    "7sus2": ["7sus2", "7", "9", "11", "13"],
    "7sus4": ["7sus4", "7", "9", "11", "13"],
    aug: ["aug"]
  }

  if(compatible[targetType]?.includes(candidate.type)) return true

  return targetType === "maj" && candidate.type === "7" && candidate.inKey
}

function candidateMatchesResolutionTarget(candidate: ProgressionSuggestionCandidate, target: ResolutionTarget) {
  return samePitch(candidate.root, target.targetRoot) && isResolutionQualityCompatible(candidate, target)
}

function candidateMatchesResolutionOption(candidate: ProgressionSuggestionCandidate, target: ResolutionOption) {
  return samePitch(candidate.root, target.targetRoot) && isResolutionQualityCompatible(candidate, target)
}

function strongestResolutionMatchStrength(candidate: ProgressionSuggestionCandidate, target: ResolutionTarget) {
  const options = [target, ...target.secondaryTargets]
    .filter(option => candidateMatchesResolutionOption(candidate, option))

  return options.length ? Math.max(...options.map(option => option.strength)) : 0
}

function appliedDominantTargetsUnstableChord(candidate: ProgressionSuggestionCandidate) {
  return candidate.functionCategory === "secondaryDominant" &&
    (candidate.resolutionTarget.targetChordType === "dim" ||
      candidate.resolutionTarget.targetChordType === "dim7" ||
      candidate.resolutionTarget.targetChordType === "m7b5")
}

function isDeceptiveRelease(candidate: ProgressionSuggestionCandidate, current: AnalyzedProgressionChord | null) {
  return Boolean(
    current &&
    isTensionBearingRole(current.role) &&
    current.resolutionTarget.secondaryTargets.some(target => {
      return target.resolutionType === "deceptive" &&
        candidateMatchesResolutionOption(candidate, target) &&
        candidate.functionCategory === "tonicSubstitute"
    })
  )
}

function resolvesCurrentTension(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  const current = state.context.currentChord
  if(!current || !isTensionBearingRole(current.role)) return false
  return candidateMatchesResolutionTarget(candidate, current.resolutionTarget) || isDeceptiveRelease(candidate, current)
}

function musicalRejectionReasons(candidate: ProgressionSuggestionCandidate, state: ProgressionState, complex: boolean) {
  const reasons: string[] = []
  const current = state.context.currentChord
  const targetScaleDegree = candidate.resolutionTarget.targetScaleDegree
  const resolutionIsDue = state.context.resolutionDue || state.remainingSlotsToResolution === 0
  const activeTensionMustResolve =
    current &&
    isTensionBearingRole(current.role) &&
    (current.resolutionTarget.mandatorySoon || state.remainingSlotsToResolution <= 1)
  const usefulTonicRepeat =
    current &&
    candidate.symbol === current.symbol &&
    samePitch(candidate.root, state.tonicRoot) &&
    isStableRole(candidate.functionCategory) &&
    (state.context.resolutionDue || state.phrasePosition === "postCadentialRelease" || state.phrasePosition === "loopingVamp")

  if(targetScaleDegree === null && candidate.family !== "chromaticColor") {
    reasons.push("candidate has no explainable resolution target inside the fixed key")
  }

  if(candidate.functionCategory === "chromaticColor" && !complex) {
    reasons.push("chromatic color is reserved for the complex suggestion bucket")
  }

  if(
    current &&
    candidate.symbol === current.symbol &&
    !usefulTonicRepeat &&
    state.phrasePosition !== "loopingVamp" &&
    state.phrasePosition !== "postCadentialRelease"
  ) {
    reasons.push("immediate repetition would stall this phrase position")
  }

  if(appliedDominantTargetsUnstableChord(candidate)) {
    reasons.push("applied dominant points at an unstable leading-tone chord instead of a stable fixed-key target")
  }

  if((state.phrasePosition === "preCadential" || state.phrasePosition === "cadential") && candidate.functionCategory === "chromaticColor") {
    reasons.push("chromatic color would blur the cadence instead of supporting it")
  }

  if(resolutionIsDue && isTensionBearingRole(candidate.functionCategory) && !samePitch(candidate.root, state.targetChord.targetRoot)) {
    reasons.push("resolution is due, so adding another unresolved tension is not coherent")
  }

  if(activeTensionMustResolve && current && !resolvesCurrentTension(candidate, state)) {
    reasons.push(`current ${roleLabel(current.role)} tension needs ${targetDisplayName(current.resolutionTarget, state.key, state.mode)} or a clear deceptive release`)
  }

  if((resolutionIsDue || activeTensionMustResolve) && !candidateHasValidResolutionRoute(candidate, state)) {
    reasons.push("candidate cannot reach tonic through a clear route within the active resolution window")
  }

  if(
    activeTensionMustResolve &&
    current &&
    samePitch(candidate.root, current.resolutionTarget.targetRoot) &&
    !candidateMatchesResolutionTarget(candidate, current.resolutionTarget) &&
    !isDeceptiveRelease(candidate, current)
  ) {
    reasons.push("candidate has the resolution root but the wrong chord quality for the active target")
  }

  if(candidate.family === "approach" && state.remainingSlotsToResolution <= 1 && !resolvesCurrentTension(candidate, state)) {
    reasons.push("approach harmony needs more phrase space than remains")
  }

  if(candidate.family === "chromaticColor" && state.cadencePressure >= 65) {
    reasons.push("cadence pressure is too high for non-directed chromatic color")
  }

  return reasons
}

function familyPriorityScore(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  const familyScores: Record<CandidateFamily, number> = {
    diatonic: 38,
    appliedDominant: 22,
    leadingTone: 22,
    borrowed: 12,
    cadential: 20,
    prolongation: 18,
    chromaticColor: -8,
    approach: 8,
    passing: 6
  }
  let score = familyScores[candidate.family]

  if(state.phrasePosition === "startOfPhrase" && (candidate.family === "diatonic" || candidate.family === "prolongation")) score += 20
  if(state.phrasePosition === "midPhraseContinuation" && (candidate.family === "diatonic" || candidate.family === "appliedDominant" || candidate.family === "borrowed")) score += 10
  if(state.phrasePosition === "preCadential" && (candidate.family === "cadential" || candidate.family === "leadingTone" || candidate.family === "appliedDominant")) score += 28
  if(state.phrasePosition === "cadential" && candidate.family === "cadential") score += 36

  return score
}

function phraseFunctionScoreForState(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  if(state.phrasePosition === "startOfPhrase") {
    if(isStableRole(candidate.functionCategory)) return 38
    if(candidate.functionCategory === "predominant") return 14
    if(isTensionBearingRole(candidate.functionCategory)) return -18
  }

  if(state.phrasePosition === "midPhraseContinuation") {
    if(candidate.functionCategory === "predominant" || candidate.functionCategory === "tonicSubstitute") return 34
    if(candidate.functionCategory === "secondaryDominant" || candidate.functionCategory === "borrowedPredominant") return 22
    if(candidate.functionCategory === "dominant") return 12
  }

  if(state.phrasePosition === "preCadential") {
    if(candidate.functionCategory === "dominant" || candidate.functionCategory === "leadingTone" || candidate.functionCategory === "secondaryDominant") return 46
    if(candidate.functionCategory === "predominant" || candidate.functionCategory === "borrowedPredominant") return 16
    if(isStableRole(candidate.functionCategory)) return -14
  }

  if(state.phrasePosition === "cadential") {
    if(isStableRole(candidate.functionCategory) && samePitch(candidate.root, state.targetChord.targetRoot)) return 58
    if(candidate.functionCategory === "tonicSubstitute") return 18
    if(isTensionBearingRole(candidate.functionCategory)) return -44
  }

  if(state.phrasePosition === "postCadentialRelease") {
    if(candidate.functionCategory === "tonicSubstitute" || candidate.family === "prolongation") return 28
    if(isTensionBearingRole(candidate.functionCategory)) return -18
  }

  return 0
}

function resolutionRouteScoreForState(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  const current = state.context.currentChord
  let score = 0

  if(current && isTensionBearingRole(current.role)) {
    if(candidateMatchesResolutionTarget(candidate, current.resolutionTarget)) score += 86
    else if(isDeceptiveRelease(candidate, current)) score += 36
    else if(candidate.targetRoot === current.resolutionTarget.targetRoot && state.remainingSlotsToResolution > 1) score += 20
    else score -= state.remainingSlotsToResolution <= 1 ? 72 : 28
  }

  if(isTensionBearingRole(candidate.functionCategory)) {
    if(candidate.resolutionTarget.targetScaleDegree !== null) score += 26
    if(candidate.resolutionTarget.mandatorySoon && state.remainingSlotsToResolution <= 1) score -= 18
  }

  if(candidate.functionCategory === "predominant" || candidate.functionCategory === "borrowedPredominant") {
    score += state.remainingSlotsToResolution >= 2 ? 22 : -12
  }

  if(isStableRole(candidate.functionCategory) && samePitch(candidate.root, state.targetChord.targetRoot)) {
    score += state.cadencePressure >= 65 ? 46 : 18
  }

  return score
}

function tensionManagementScoreForState(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  const candidateTension = roleBaseTension(candidate.functionCategory)
  let score = 0

  if(state.tensionLevel >= 65) {
    score += isStableRole(candidate.functionCategory) ? 42 : -24
    if(resolvesCurrentTension(candidate, state)) score += 34
  } else if(state.tensionLevel <= 20) {
    if(candidate.functionCategory === "predominant" || candidate.functionCategory === "tonicSubstitute") score += 22
    if(isTensionBearingRole(candidate.functionCategory) && state.remainingSlotsToResolution >= 2) score += 12
  }

  if(state.remainingSlotsToResolution <= 1 && candidateTension >= 60) score -= 30
  if(state.remainingSlotsToResolution >= 3 && candidateTension >= 35 && candidateTension <= 75) score += 14

  return score
}

function cadenceBehaviorScoreForState(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  if(state.phrasePosition === "cadential" || state.context.resolutionDue) {
    if(samePitch(candidate.root, state.targetChord.targetRoot) && isStableRole(candidate.functionCategory)) return 88
    if(isDeceptiveRelease(candidate, state.context.currentChord)) return 42
    if(isTensionBearingRole(candidate.functionCategory)) return -72
    return -18
  }

  if(state.phrasePosition === "preCadential") {
    if(candidate.functionCategory === "dominant" || candidate.functionCategory === "leadingTone") return 56
    if(candidate.functionCategory === "secondaryDominant" && samePitch(candidate.targetRoot, state.targetChord.targetRoot)) return 48
    if(candidate.functionCategory === "predominant" || candidate.functionCategory === "borrowedPredominant") return 18
    if(isStableRole(candidate.functionCategory)) return -18
  }

  return 0
}

function sentenceCompletionScoreForState(
  candidate: ProgressionSuggestionCandidate,
  progression: ParsedProgressionChord[],
  state: ProgressionState
) {
  const current = state.context.currentChord
  let score = 0

  if(current && isTensionBearingRole(current.role)) {
    if(candidateMatchesResolutionTarget(candidate, current.resolutionTarget)) {
      score += current.resolutionTarget.strength
    } else if(isDeceptiveRelease(candidate, current)) {
      score += 34
    } else {
      score -= current.resolutionTarget.mandatorySoon ? 70 : 26
    }
  }

  if(current && (current.role === "predominant" || current.role === "borrowedPredominant")) {
    if(candidate.functionCategory === "dominant" && samePitch(candidate.root, current.resolutionTarget.targetRoot)) score += 76
    else if(candidate.functionCategory === "dominant") score += 52
    else if(isStableRole(candidate.functionCategory)) score -= 24
  }

  if(state.phrasePosition === "preCadential") {
    if(isTensionBearingRole(candidate.functionCategory)) score += 42
    if(candidate.functionCategory === "predominant" || candidate.functionCategory === "borrowedPredominant") score += 12
  }

  if(state.phrasePosition === "cadential" || state.context.resolutionDue) {
    if(samePitch(candidate.root, state.tonicRoot) && isStableRole(candidate.functionCategory)) score += 92
    else if(isDeceptiveRelease(candidate, current)) score += 28
    else score -= 54
  }

  const lookaheadDistance = estimatedTonicResolutionDistance(candidate, state)
  if(Number.isFinite(lookaheadDistance)) {
    score += Math.max(0, 44 - lookaheadDistance * 12)
  } else {
    score -= 36
  }

  return score
}

function functionalNeedScoreForState(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  const current = state.context.currentChord

  if(!current) {
    if(samePitch(candidate.root, state.tonicRoot) && isStableRole(candidate.functionCategory)) return 78
    if(candidate.functionCategory === "tonicSubstitute") return 48
    if(candidate.functionCategory === "predominant") return 20
    if(isTensionBearingRole(candidate.functionCategory)) return -34
    return 0
  }

  if(isTensionBearingRole(current.role)) {
    if(candidateMatchesResolutionTarget(candidate, current.resolutionTarget)) return 94
    if(isDeceptiveRelease(candidate, current)) return 42
    return current.resolutionTarget.mandatorySoon || state.remainingSlotsToResolution <= 1 ? -92 : -38
  }

  if(current.role === "predominant" || current.role === "borrowedPredominant") {
    if(samePitch(candidate.root, current.resolutionTarget.targetRoot) && candidate.functionCategory === "dominant") return 84
    if(candidate.functionCategory === "dominant") return 66
    if(candidate.functionCategory === "secondaryDominant" && samePitch(candidate.resolutionTarget.targetRoot, current.resolutionTarget.targetRoot)) return 42
    if(isStableRole(candidate.functionCategory)) return state.remainingSlotsToResolution <= 1 ? 26 : -18
    return -8
  }

  if(isStableRole(current.role)) {
    if(state.phrasePosition === "preCadential") {
      if(candidate.functionCategory === "dominant" || candidate.functionCategory === "leadingTone") return 62
      if(candidate.functionCategory === "predominant" || candidate.functionCategory === "borrowedPredominant") return 42
      if(isStableRole(candidate.functionCategory)) return -10
    }

    if(candidate.functionCategory === "predominant" || candidate.functionCategory === "borrowedPredominant") return 44
    if(candidate.functionCategory === "tonicSubstitute") return 26
    if(candidate.functionCategory === "dominant") return 10
    if(candidate.functionCategory === "secondaryDominant" || candidate.functionCategory === "leadingTone") return -16
  }

  if(current.role === "tonicSubstitute") {
    if(state.phrasePosition === "preCadential" && candidate.functionCategory === "dominant") return 58
    if(candidate.functionCategory === "predominant") return 42
    if(candidate.functionCategory === "dominant") return 28
    if(samePitch(candidate.root, state.tonicRoot)) return 18
  }

  if(current.role === "passingChord" || current.role === "chromaticColor") {
    if(candidateMatchesResolutionTarget(candidate, current.resolutionTarget)) return 58
    if(isStableRole(candidate.functionCategory)) return 22
    return -14
  }

  return 0
}

function tendencyResolutionScoreForState(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  const current = state.context.currentChord
  if(!current) return 0

  if(isTensionBearingRole(current.role)) {
    if(candidateMatchesResolutionTarget(candidate, current.resolutionTarget)) return 96
    if(isDeceptiveRelease(candidate, current)) return 42
    return current.resolutionTarget.mandatorySoon || state.remainingSlotsToResolution <= 1 ? -100 : -44
  }

  if(isTensionBearingRole(candidate.functionCategory)) {
    if(candidate.resolutionTarget.targetScaleDegree === null) return -76
    if(candidate.resolutionTarget.chordsUntilExpectedResolution <= state.remainingSlotsToResolution) return 28
    return -16
  }

  return 0
}

function fixedTonicRelationScoreForState(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  let score = candidate.inKey ? 34 : -18

  if(candidate.resolutionTarget.targetScaleDegree !== null) score += 24
  else score -= 70

  if(samePitch(candidate.resolutionTarget.targetRoot, state.tonicRoot)) score += 12
  if(candidate.family === "borrowed") score += 10
  if(candidate.family === "chromaticColor") score -= 20
  if(candidate.functionCategory === "chromaticColor") score -= 16
  if(!candidate.inKey && state.cadencePressure >= 60) score -= 26
  if(appliedDominantTargetsUnstableChord(candidate)) score -= 72

  return score
}

function commonToneConnectionScore(
  candidate: ProgressionSuggestionCandidate,
  progression: ParsedProgressionChord[],
  state?: ProgressionState
) {
  const last = progression[progression.length - 1]
  if(!last) return 0

  const common = commonPitches(last.notes, candidate.notes)
  const metrics = voiceLeadingMetrics(last.notes, candidate.notes)
  let score = common.length * 12 + metrics.stepwiseCount * 5 - metrics.largeLeapCount * 12

  if(common.length >= 2) score += 10
  if(state?.context.currentChord && isTensionBearingRole(state.context.currentChord.role) && !resolvesCurrentTension(candidate, state)) {
    score -= 24
  }

  return score
}

function estimatedTonicResolutionDistance(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  if(samePitch(candidate.root, state.tonicRoot) && isStableRole(candidate.functionCategory)) return 0
  if(samePitch(candidate.resolutionTarget.targetRoot, state.tonicRoot)) return Math.max(1, candidate.resolutionTarget.expectedDistance)

  const tonicSecondary = candidate.resolutionTarget.secondaryTargets.find(target => samePitch(target.targetRoot, state.tonicRoot))
  if(tonicSecondary) return Math.max(1, tonicSecondary.expectedDistance)

  if(candidate.functionCategory === "predominant" || candidate.functionCategory === "borrowedPredominant") return 2
  if(candidate.functionCategory === "dominant" || candidate.functionCategory === "borrowedDominant" || candidate.functionCategory === "leadingTone") return 1

  if(candidate.functionCategory === "secondaryDominant") {
    const targetDegree = candidate.resolutionTarget.targetScaleDegree
    if(targetDegree === 4) return 2
    if(targetDegree === 1 || targetDegree === 3) return 3
    if(targetDegree === 0) return 1
    return 4
  }

  if(candidate.functionCategory === "approachChord" || candidate.functionCategory === "passingChord") return 3
  if(candidate.functionCategory === "tonicSubstitute") return 2

  return Number.POSITIVE_INFINITY
}

function candidateHasValidResolutionRoute(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  const distance = estimatedTonicResolutionDistance(candidate, state)
  if(!Number.isFinite(distance)) return false
  if(state.phrasePosition === "loopingVamp") return distance <= state.phraseLength

  const availableSlots = Math.max(1, state.remainingSlotsToResolution)
  if(state.context.resolutionDue || state.remainingSlotsToResolution === 0) {
    return distance <= 1 || samePitch(candidate.root, state.tonicRoot)
  }

  return distance <= availableSlots + 1
}

function lookaheadResolutionScoreForState(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  const distance = estimatedTonicResolutionDistance(candidate, state)
  if(!Number.isFinite(distance)) return -90

  const availableSlots = Math.max(1, state.remainingSlotsToResolution)
  let score = 72 - distance * 14

  if(distance <= availableSlots) score += 30
  else score -= (distance - availableSlots) * 24

  const current = state.context.currentChord
  if(current && isTensionBearingRole(current.role)) {
    const strength = strongestResolutionMatchStrength(candidate, current.resolutionTarget)
    score += strength * 0.7
    if(!resolvesCurrentTension(candidate, state)) score -= current.resolutionTarget.mandatorySoon ? 72 : 36
  }

  if(state.context.resolutionDue || state.phrasePosition === "cadential") {
    if(samePitch(candidate.root, state.tonicRoot) && isStableRole(candidate.functionCategory)) score += 86
    else if(isDeceptiveRelease(candidate, current)) score += 18
    else score -= 64
  }

  if(state.phrasePosition === "loopingVamp") {
    score += distance <= state.phraseLength ? 22 : -18
    if(isTensionBearingRole(candidate.functionCategory)) score -= 20
  }

  return score
}

function harmonicNeedFitScoreForState(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  switch(state.harmonicNeed) {
    case "stability":
      if(isTonicSubstituteRole(candidate.functionCategory) || candidate.family === "prolongation") return 56
      if(isStableRole(candidate.functionCategory)) return 82
      if(isTensionBearingRole(candidate.functionCategory)) return -62
      return 10
    case "movement":
      if(candidate.functionCategory === "predominant" || isTonicSubstituteRole(candidate.functionCategory)) return 62
      if(candidate.functionCategory === "borrowedPredominant" || candidate.functionCategory === "color") return 34
      if(isTensionBearingRole(candidate.functionCategory)) return state.remainingSlotsToResolution >= 2 ? 14 : -34
      return 8
    case "preparation":
      if(candidate.functionCategory === "predominant" || candidate.functionCategory === "borrowedPredominant") return 74
      if(candidate.functionCategory === "dominant" || candidate.functionCategory === "secondaryDominant") return 42
      if(isStableRole(candidate.functionCategory)) return -18
      return 6
    case "tension":
      if(candidate.functionCategory === "dominant" || candidate.functionCategory === "leadingTone") return 86
      if(candidate.functionCategory === "secondaryDominant" && samePitch(candidate.resolutionTarget.targetRoot, state.targetChord.targetRoot)) return 70
      if(candidate.functionCategory === "secondaryDominant") return 38
      if(isStableRole(candidate.functionCategory)) return -46
      return 0
    case "resolution":
      if(resolvesCurrentTension(candidate, state)) return 96
      if(isDeceptiveRelease(candidate, state.context.currentChord)) return 44
      return isStableRole(candidate.functionCategory) ? 12 : -76
    case "cadenceCompletion":
      if(samePitch(candidate.root, state.tonicRoot) && isStableRole(candidate.functionCategory)) return 100
      if(isDeceptiveRelease(candidate, state.context.currentChord)) return 38
      return -82
    case "prolongation":
      if(samePitch(candidate.root, state.tonicRoot) && isStableRole(candidate.functionCategory)) return 78
      if(isTonicSubstituteRole(candidate.functionCategory) || candidate.family === "prolongation") return 58
      if(candidate.functionCategory === "predominant" && state.phrasePosition === "loopingVamp") return 28
      if(isTensionBearingRole(candidate.functionCategory)) return -56
      return 8
    case "deceptiveDelay":
      if(resolvesCurrentTension(candidate, state)) return 84
      if(isDeceptiveRelease(candidate, state.context.currentChord)) return 48
      if(isTonicSubstituteRole(candidate.functionCategory)) return 22
      return -34
  }
}

function candidateFitsHarmonicNeed(candidate: ProgressionSuggestionCandidate, state: ProgressionState, complex: boolean) {
  if(candidateMatchesResolutionTarget(candidate, state.targetChord) || isDeceptiveRelease(candidate, state.context.currentChord)) return true
  if(state.phrasePosition === "loopingVamp") {
    return !candidate.bass &&
      (isStableRole(candidate.functionCategory) ||
        isTonicSubstituteRole(candidate.functionCategory) ||
        candidate.functionCategory === "predominant" ||
        candidate.family === "prolongation")
  }

  switch(state.harmonicNeed) {
    case "stability":
      return isStableRole(candidate.functionCategory) ||
        isTonicSubstituteRole(candidate.functionCategory) ||
        candidate.family === "prolongation" ||
        (complex && candidate.inKey && candidate.functionCategory === "predominant")
    case "movement":
      return candidate.inKey ||
        candidate.functionCategory === "borrowedPredominant" ||
        (complex && candidate.functionCategory === "secondaryDominant" && candidateHasValidResolutionRoute(candidate, state))
    case "preparation":
      return candidate.functionCategory === "predominant" ||
        candidate.functionCategory === "borrowedPredominant" ||
        candidate.functionCategory === "dominant" ||
        (complex && candidate.functionCategory === "secondaryDominant")
    case "tension":
      return candidate.functionCategory === "dominant" ||
        candidate.functionCategory === "leadingTone" ||
        candidate.functionCategory === "secondaryDominant" ||
        candidate.family === "cadential"
    case "resolution":
    case "cadenceCompletion":
      return resolvesCurrentTension(candidate, state) ||
        (samePitch(candidate.root, state.tonicRoot) && isStableRole(candidate.functionCategory))
    case "prolongation":
      return isStableRole(candidate.functionCategory) ||
        isTonicSubstituteRole(candidate.functionCategory) ||
        candidate.family === "prolongation" ||
        candidate.functionCategory === "predominant"
    case "deceptiveDelay":
      return resolvesCurrentTension(candidate, state) ||
        isTonicSubstituteRole(candidate.functionCategory) ||
        (complex && candidateHasValidResolutionRoute(candidate, state))
  }
}

function filterCandidatesForHarmonicNeed(candidates: ProgressionSuggestionCandidate[], state: ProgressionState, complex: boolean) {
  const filtered = candidates
    .filter(candidate => candidateFitsHarmonicNeed(candidate, state, complex))
    .map(candidate => ({
      ...candidate,
      generatedBecause: [
        ...candidate.generatedBecause,
        `selected for current harmonic need: ${state.harmonicNeed}`
      ]
    }))

  return filtered.length >= 3 ? filtered : candidates
}

const progressionPlayabilityCache = new Map<string, { feasibility: number; balance: number }>()
const pitchFretOptionCache = new Map<string, Array<{ string: number; fret: number }>>()

function preferredStringCountsForCandidate(candidate: ProgressionSuggestionCandidate) {
  const uniqueCount = uniquePitches(candidate.notes).length

  if(uniqueCount >= 5) return [5, 6, 4]
  if(uniqueCount === 4) return [4, 5, 6, 3]
  return [4, 3, 5, 6]
}

function fretOptionsForPitch(note: string) {
  const pitch = normalize(note)
  const cached = pitchFretOptionCache.get(pitch)
  if(cached) return cached

  const options: Array<{ string: number; fret: number }> = []
  for(let string = 0; string < TUNING.length; string++) {
    for(const fret of fretsForNote(TUNING[string], pitch)) {
      options.push({ string, fret })
    }
  }

  pitchFretOptionCache.set(pitch, options)
  return options
}

function progressionPlayabilityForCandidate(candidate: ProgressionSuggestionCandidate) {
  const cacheKey = candidate.symbol
  const cached = progressionPlayabilityCache.get(cacheKey)
  if(cached) return cached

  const notes = uniquePitches(candidate.notes)
  const preferredCounts = preferredStringCountsForCandidate(candidate)
  const targetStringCount = preferredCounts[0] ?? Math.min(6, Math.max(3, notes.length))
  let bestCoverage = 0
  let bestAverageFret = 12
  let bestOpenCount = 0
  let bestStringSpread = 0

  for(const anchor of VOICING_WINDOW_ANCHORS) {
    const { start, end } = windowBounds(anchor)
    const selected: Array<{ string: number; fret: number }> = []

    for(const note of notes) {
      const options = fretOptionsForPitch(note)
        .filter(option => option.fret >= start && option.fret <= end)
        .sort((a, b) => {
          const aDistance = Math.abs(a.fret - anchor)
          const bDistance = Math.abs(b.fret - anchor)
          if(aDistance !== bDistance) return aDistance - bDistance
          return a.string - b.string
        })

      if(options[0]) selected.push(options[0])
    }

    if(selected.length === 0) continue

    const frets = selected.map(option => option.fret)
    const strings = selected.map(option => option.string)
    const coverage = selected.length / Math.max(1, notes.length)
    const averageFret = frets.reduce((sum, fret) => sum + fret, 0) / frets.length
    const openCount = frets.filter(fret => fret === 0).length
    const stringSpread = Math.max(...strings) - Math.min(...strings)

    if(
      coverage > bestCoverage ||
      (coverage === bestCoverage && averageFret < bestAverageFret) ||
      (coverage === bestCoverage && averageFret === bestAverageFret && stringSpread > bestStringSpread)
    ) {
      bestCoverage = coverage
      bestAverageFret = averageFret
      bestOpenCount = openCount
      bestStringSpread = stringSpread
    }
  }

  const bass = candidate.bass ?? candidate.root
  const lowBassAvailable = fretOptionsForPitch(bass).some(option => option.string <= 1 && option.fret <= 7)
  const noteLoadPenalty = Math.max(0, notes.length - targetStringCount) * 12
  const slashPenalty = candidate.bass && !lowBassAvailable ? 16 : 0
  const feasibility = bestCoverage * 86 - bestAverageFret * 1.8 - noteLoadPenalty - slashPenalty
  const balance = bestCoverage * 54 + Math.min(16, bestStringSpread * 3) + Math.min(12, bestOpenCount * 4) - Math.max(0, notes.length - 5) * 8
  const result = {
    feasibility: Math.max(-86, Math.min(86, feasibility)),
    balance: Math.max(-72, Math.min(72, balance))
  }

  progressionPlayabilityCache.set(cacheKey, result)
  return result
}

function addCandidate(
  candidates: ProgressionSuggestionCandidate[],
  seen: Set<string>,
  symbol: string,
  targetRoot: string,
  scale: string[],
  scaleSet: Set<string>,
  mode: string,
  plan: ResolutionPlan,
  phrasePosition: PhrasePosition,
  key: string,
  family: CandidateFamily,
  extraGeneratedReasons: string[] = [],
  extraFamilies: CandidateFamily[] = []
) {
  const parsed = parse(symbol)
  const cleanSymbol = parsed.symbol
  if(seen.has(cleanSymbol)) return

  const notes = chordNotesForSymbol(cleanSymbol)
  const inKey = isInKeyNotes(notes, scaleSet)
  const cleanTargetRoot = normalize(targetRoot)
  const functionCategory = classifyHarmonicFunction({
    root: parsed.root,
    type: parsed.type,
    inKey,
    targetRoot: cleanTargetRoot,
    scale,
    phrasePosition,
    scaleSet
  })
  const resolutionTarget = resolutionTargetForRole({
    role: functionCategory,
    root: parsed.root,
    targetRoot: cleanTargetRoot,
    scale,
    mode,
    plan
  })
  const functionalTargetRoot = resolutionTarget.targetRoot
  const candidateCore = {
    inKey,
    functionCategory,
    targetRoot: functionalTargetRoot,
    root: parsed.root,
    bass: parsed.bass
  }
  const families = Array.from(new Set([family, ...extraFamilies]))
  const theoryNote = candidateTheoryNote(
    cleanSymbol,
    family,
    functionCategory,
    parsed.root,
    resolutionTarget,
    key,
    mode,
    scale
  )
  const resolutionNote = candidateResolutionNote({
    functionCategory,
    resolutionTarget,
    targetRoot: cleanTargetRoot
  }, key, mode)

  candidates.push({
    symbol: cleanSymbol,
    root: parsed.root,
    type: parsed.type,
    bass: parsed.bass,
    notes,
    inKey,
    targetRoot: functionalTargetRoot,
    functionCategory,
    family,
    families,
    resolutionTarget,
    generatedBecause: [
      ...candidateGeneratedReasons(candidateCore, scale),
      ...extraGeneratedReasons
    ],
    validBecause: candidateValidReasons({
      symbol: cleanSymbol,
      type: parsed.type,
      inKey,
      resolutionTarget
    }),
    theoryNote,
    resolutionNote,
    rankNote: "",
    completionPath: [],
    rejectionReasons: [],
    score: 0
  })
  seen.add(cleanSymbol)
}

function buildSlashProgressionCandidates(
  baseCandidates: ProgressionSuggestionCandidate[],
  scale: string[],
  scaleSet: Set<string>,
  key: string,
  mode: string,
  plan: ResolutionPlan,
  phrasePosition: PhrasePosition
) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()

  for(const candidate of baseCandidates) {
    const bassOptions = [
      ...candidate.notes,
      candidate.targetRoot
    ].filter((note, index, arr) => {
      return note !== candidate.root && arr.indexOf(note) === index && (scaleSet.has(normalize(note)) || note === candidate.targetRoot)
    })

    for(const bass of bassOptions) {
      addCandidate(
        candidates,
        seen,
        symbolForQuality(candidate.root, candidate.type, bass, key, mode),
        candidate.targetRoot,
        scale,
        scaleSet,
        mode,
        plan,
        phrasePosition,
        key,
        candidate.family,
        ["slash bass keeps the same function while adding bass motion"],
        candidate.families
      )
    }
  }

  return candidates
}

function buildDiatonicProgressionCandidates(
  scale: string[],
  scaleSet: Set<string>,
  key: string,
  mode: string,
  complex: boolean,
  plan: ResolutionPlan,
  phrasePosition: PhrasePosition
) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()
  const diatonic = buildDiatonicChords(scale[0], mode)

  for(const symbol of diatonic) {
    const parsed = parse(symbol)
  const qualities: Quality[] = complex
      ? parsed.type === "maj"
        ? ["maj", "maj7", "6", "add9", "6add9", "maj9", "7", "9", "13", "sus2", "sus4"]
        : parsed.type === "m"
          ? ["m", "m7", "m6", "madd9", "m9", "m11", "sus2", "sus4"]
          : ["dim", "m7b5"]
      : parsed.type === "maj"
        ? ["maj", "7", "sus2", "sus4"]
        : parsed.type === "m"
          ? ["m", "sus2", "sus4"]
          : []

    for(const quality of qualities) {
      const nextSymbol = symbolForQuality(parsed.root, quality, undefined, key, mode)
      const notes = chordNotesForSymbol(nextSymbol)
      if(isInKeyNotes(notes, scaleSet)) {
        addCandidate(
          candidates,
          seen,
          nextSymbol,
          parsed.root,
          scale,
          scaleSet,
          mode,
          plan,
          phrasePosition,
          key,
          quality === parsed.type ? "diatonic" : "prolongation",
          quality === parsed.type
            ? ["built directly from the selected scale"]
            : ["diatonic color variant used for stable prolongation"],
          ["diatonic"]
        )
      }
    }

    if(complex) {
      for(const quality of ["sus2", "sus4"] as Quality[]) {
        const nextSymbol = symbolForQuality(parsed.root, quality, undefined, key, mode)
        const notes = chordNotesForSymbol(nextSymbol)
        if(isInKeyNotes(notes, scaleSet)) {
          addCandidate(
            candidates,
            seen,
            nextSymbol,
            parsed.root,
            scale,
            scaleSet,
            mode,
            plan,
            phrasePosition,
            key,
            "prolongation",
            ["suspended color keeps the harmony in the fixed scale"],
            ["diatonic"]
          )
        }
      }
    }
  }

  return candidates
}

function buildChromaticProgressionCandidates(
  scale: string[],
  scaleSet: Set<string>,
  key: string,
  mode: string,
  complex: boolean,
  plan: ResolutionPlan,
  phrasePosition: PhrasePosition
) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()

  for(const targetRoot of scale) {
    const dominantRoot = add(targetRoot, 7)
    const leadingRoot = add(targetRoot, -1)
    const lowerNeighborRoot = add(targetRoot, -2)

    const dominantQualities: Quality[] = complex
      ? ["maj", "7", "9", "11", "13", "7b5", "7#5", "7b9", "7#9", "maj7", "7sus2", "7sus4"]
      : ["maj", "7"]
    for(const quality of dominantQualities) {
      addCandidate(
        candidates,
        seen,
        symbolForQuality(dominantRoot, quality, undefined, key, mode),
        targetRoot,
        scale,
        scaleSet,
        mode,
        plan,
        phrasePosition,
        key,
        samePitch(targetRoot, scale[0]) ? "cadential" : "appliedDominant",
        samePitch(targetRoot, scale[0])
          ? ["dominant-family chord aimed at tonic cadence"]
          : ["V of a fixed-key diatonic target"],
        ["cadential"]
      )
    }

    if(complex) {
      for(const quality of ["dim", "dim7"] as Quality[]) {
        addCandidate(
          candidates,
          seen,
          symbolForQuality(leadingRoot, quality, undefined, key, mode),
          targetRoot,
          scale,
          scaleSet,
          mode,
          plan,
          phrasePosition,
          key,
          "leadingTone",
          ["diminished leading-tone sonority targets a scale chord"],
          ["cadential"]
        )
      }
      addCandidate(
        candidates,
        seen,
        symbolForQuality(dominantRoot, "aug", undefined, key, mode),
        targetRoot,
        scale,
        scaleSet,
        mode,
        plan,
        phrasePosition,
        key,
        "appliedDominant",
        ["augmented dominant color intensifies an applied resolution"],
        ["chromaticColor"]
      )
      addCandidate(
        candidates,
        seen,
        symbolForQuality(targetRoot, "aug", undefined, key, mode),
        targetRoot,
        scale,
        scaleSet,
        mode,
        plan,
        phrasePosition,
        key,
        "chromaticColor",
        ["same-root augmented color is kept only as a directed color option"]
      )
      if(targetRoot === scale[0]) {
        for(const root of [add(scale[0], 1), add(scale[0], 3), add(scale[0], 8), add(scale[0], 10)]) {
          addCandidate(
            candidates,
            seen,
            symbolForQuality(root, "maj7", undefined, key, mode),
            targetRoot,
            scale,
            scaleSet,
            mode,
            plan,
            phrasePosition,
            key,
            "borrowed",
            ["modal mixture color with a tonic-facing resolution route"]
          )
        }
      }
    }

    addCandidate(
      candidates,
      seen,
      symbolForQuality(lowerNeighborRoot, "maj", undefined, key, mode),
      targetRoot,
      scale,
      scaleSet,
      mode,
      plan,
      phrasePosition,
      key,
      "approach",
      ["whole-step lower approach to a fixed-key target"]
    )
  }

  for(const bluesRoot of [scale[0], scale[3], scale[4]]) {
    addCandidate(
      candidates,
      seen,
      symbolForQuality(bluesRoot, "7", undefined, key, mode),
      scale[0],
      scale,
      scaleSet,
      mode,
      plan,
      phrasePosition,
      key,
      "borrowed",
      ["dominant-color blues mixture still points back to tonic"]
    )
  }

  return candidates.filter(candidate => {
    return !candidate.inKey ||
      candidate.functionCategory === "leadingTone" ||
      candidate.root === add(candidate.targetRoot, 7)
  })
}

function buildBorrowedProgressionCandidates(
  scale: string[],
  scaleSet: Set<string>,
  key: string,
  mode: string,
  complex: boolean,
  plan: ResolutionPlan,
  phrasePosition: PhrasePosition
) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()
  const tonic = scale[0]
  const dominantTarget = scale[4] ?? add(tonic, 7)
  const isMinorMode = mode === "Aeolian" || mode === "Dorian" || mode === "Phrygian" || mode === "Locrian"
  const borrowed: Array<{ root: string; qualities: Quality[]; target: string; reason: string }> = isMinorMode
    ? [
        { root: add(tonic, 7), qualities: complex ? ["maj", "7"] : ["maj"], target: tonic, reason: "major V borrowed into minor gives a stronger dominant pull" },
        { root: add(tonic, 5), qualities: ["maj"], target: dominantTarget, reason: "major IV brightens the predominant side of the minor mode" },
        { root: add(tonic, 2), qualities: complex ? ["m7b5", "dim"] : ["dim"], target: dominantTarget, reason: "minor-key supertonic diminished harmony prepares the dominant" }
      ]
    : [
        { root: add(tonic, 5), qualities: complex ? ["m", "m7"] : ["m"], target: dominantTarget, reason: "iv from the parallel minor gives a strong predominant color" },
        { root: add(tonic, 10), qualities: complex ? ["maj", "7"] : ["maj"], target: tonic, reason: "bVII is a common modal mixture chord that returns naturally to I or IV" },
        { root: add(tonic, 8), qualities: complex ? ["maj", "maj7"] : ["maj"], target: tonic, reason: "bVI gives borrowed color while still aiming back toward tonic logic" },
        { root: add(tonic, 3), qualities: complex ? ["maj", "maj7"] : ["maj"], target: tonic, reason: "bIII is a modal color chord with a clear tonic-facing route" },
        { root: add(tonic, 1), qualities: ["maj"], target: dominantTarget, reason: "bII acts as a Neapolitan-style predominant toward V" }
      ]

  for(const item of borrowed) {
    for(const quality of item.qualities) {
      addCandidate(
        candidates,
        seen,
        symbolForQuality(item.root, quality, undefined, key, mode),
        item.target,
        scale,
        scaleSet,
        mode,
        plan,
        phrasePosition,
        key,
        "borrowed",
        [item.reason],
        ["chromaticColor"]
      )
    }
  }

  return candidates
}

function buildCadentialProgressionCandidates(
  scale: string[],
  scaleSet: Set<string>,
  key: string,
  mode: string,
  complex: boolean,
  plan: ResolutionPlan,
  phrasePosition: PhrasePosition,
  targetRoot: string
) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()
  const cleanTargetRoot = normalize(targetRoot)
  const targetType = targetChordTypeForRoot(cleanTargetRoot, scale, mode) ?? "maj"
  const dominantRoot = add(cleanTargetRoot, 7)
  const leadingRoot = add(cleanTargetRoot, -1)
  const predominantRoots = [
    add(cleanTargetRoot, 2),
    add(cleanTargetRoot, 5)
  ]

  addCandidate(
    candidates,
    seen,
    symbolForQuality(cleanTargetRoot, targetType, undefined, key, mode),
    cleanTargetRoot,
    scale,
    scaleSet,
    mode,
    plan,
    phrasePosition,
    key,
    "cadential",
    ["target chord can complete the current resolution route"]
  )

  for(const quality of complex ? ["7", "7sus4", "7b5"] as Quality[] : ["7"] as Quality[]) {
    addCandidate(
      candidates,
      seen,
      symbolForQuality(dominantRoot, quality, undefined, key, mode),
      cleanTargetRoot,
      scale,
      scaleSet,
      mode,
      plan,
      phrasePosition,
      key,
      "cadential",
      ["dominant sonority prepares a convincing cadence"],
      ["appliedDominant"]
    )
  }

  if(complex) {
    for(const quality of ["dim", "dim7", "m7b5"] as Quality[]) {
      addCandidate(
        candidates,
        seen,
        symbolForQuality(leadingRoot, quality, undefined, key, mode),
        cleanTargetRoot,
        scale,
        scaleSet,
        mode,
        plan,
        phrasePosition,
        key,
        "leadingTone",
        ["leading-tone sonority gives cadential pull"],
        ["cadential"]
      )
    }
  }

  for(const root of predominantRoots) {
    const degreeType = targetChordTypeForRoot(root, scale, mode)
    const qualities: Quality[] = degreeType
      ? complex && degreeType === "m" ? ["m", "m7"] : [degreeType]
      : ["m"]

    for(const quality of qualities) {
      addCandidate(
        candidates,
        seen,
        symbolForQuality(root, quality, undefined, key, mode),
        dominantRoot,
        scale,
        scaleSet,
        mode,
        plan,
        phrasePosition,
        key,
        "cadential",
        ["predominant-family chord prepares the dominant side of the cadence"],
        ["diatonic"]
      )
    }
  }

  return candidates
}

function buildProlongationProgressionCandidates(
  scale: string[],
  scaleSet: Set<string>,
  key: string,
  mode: string,
  complex: boolean,
  plan: ResolutionPlan,
  phrasePosition: PhrasePosition
) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()
  const tonic = scale[0]
  const tonicSubstitutes = [scale[5], scale[2]].filter(Boolean)
  const tonicQualities: Quality[] = complex ? ["maj", "maj7", "6", "add9"] : ["maj", "sus2", "sus4"]

  for(const quality of tonicQualities) {
    const symbol = symbolForQuality(tonic, quality, undefined, key, mode)
    const notes = chordNotesForSymbol(symbol)
    if(!isInKeyNotes(notes, scaleSet)) continue
    addCandidate(
      candidates,
      seen,
      symbol,
      tonic,
      scale,
      scaleSet,
      mode,
      plan,
      phrasePosition,
      key,
      "prolongation",
      ["tonic color keeps the phrase stable without implying a new key"],
      ["diatonic"]
    )
  }

  for(const root of tonicSubstitutes) {
    const quality = targetChordTypeForRoot(root, scale, mode) ?? "m"
    addCandidate(
      candidates,
      seen,
      symbolForQuality(root, quality, undefined, key, mode),
      tonic,
      scale,
      scaleSet,
      mode,
      plan,
      phrasePosition,
      key,
      "prolongation",
      ["tonic substitute supports rest while avoiding a literal I chord"],
      ["diatonic"]
    )
  }

  return candidates
}

function generateProgressionCandidates(state: ProgressionState, complex: boolean, applyNeedFilter = false) {
  const scaleSet = canonicalPitchSet(state.scale)
  const plan = buildResolutionPlan(state.chords.length, state.key, state.mode, state.phraseLength)
  const targetRoot = state.targetChord.targetRoot
  const cadentialCandidates = buildCadentialProgressionCandidates(
    state.scale,
    scaleSet,
    state.key,
    state.mode,
    complex,
    plan,
    state.phrasePosition,
    targetRoot
  )
  const baseCandidates = [
    ...(state.phrasePosition === "preCadential" || state.phrasePosition === "cadential" ? cadentialCandidates : []),
    ...buildDiatonicProgressionCandidates(
      state.scale,
      scaleSet,
      state.key,
      state.mode,
      complex,
      plan,
      state.phrasePosition
    ),
    ...buildProlongationProgressionCandidates(
      state.scale,
      scaleSet,
      state.key,
      state.mode,
      complex,
      plan,
      state.phrasePosition
    ),
    ...buildBorrowedProgressionCandidates(
      state.scale,
      scaleSet,
      state.key,
      state.mode,
      complex,
      plan,
      state.phrasePosition
    ),
    ...buildChromaticProgressionCandidates(
      state.scale,
      scaleSet,
      state.key,
      state.mode,
      complex,
      plan,
      state.phrasePosition
    ),
    ...(state.phrasePosition === "preCadential" || state.phrasePosition === "cadential" ? [] : cadentialCandidates)
  ]

  const candidates = !complex
    ? baseCandidates
    : [
      ...baseCandidates,
      ...buildSlashProgressionCandidates(
        baseCandidates,
        state.scale,
        scaleSet,
        state.key,
        state.mode,
        plan,
        state.phrasePosition
      )
    ]

  return applyNeedFilter
    ? filterCandidatesForHarmonicNeed(candidates, state, complex)
    : candidates
}

export function buildFunctionalChordUniverse({
  key = "C",
  mode = "Ionian",
  resolveWithin = 4,
  complex = true
}:{
  key?: string
  mode?: string
  resolveWithin?: number
  complex?: boolean
} = {}): FunctionalChordEntry[] {
  const state = analyzeProgressionState({
    progression: [],
    key,
    mode,
    resolveWithin
  })
  const seen = new Set<string>()

  return generateProgressionCandidates(state, complex)
    .filter(candidate => {
      if(seen.has(candidate.symbol)) return false
      seen.add(candidate.symbol)
      return true
    })
    .map(candidate => ({
      symbol: candidate.symbol,
      root: candidate.root,
      type: candidate.type,
      bass: candidate.bass,
      notes: candidate.notes,
      inKey: candidate.inKey,
      family: candidate.family,
      families: candidate.families,
      role: candidate.functionCategory,
      target: candidate.resolutionTarget,
      theoryNote: candidate.theoryNote,
      resolutionNote: candidate.resolutionNote
    }))
}

function scoreProgressionCandidates(
  candidates: ProgressionSuggestionCandidate[],
  progression: ReturnType<typeof parseProgressionSymbols>,
  key: string,
  mode: string,
  complex: boolean,
  resolutionPlan: ResolutionPlan,
  actualProgression: ReturnType<typeof parseProgressionSymbols> = progression,
  state?: ProgressionState
) {
  const scale = buildPitchScaleFromMode(key, mode)
  const hasActualProgression = actualProgression.length > 0
  const scoringProgression = hasActualProgression ? progression : actualProgression
  const targetScores = progressionTargetScores(scoringProgression, key, mode)
  const scaleSet = canonicalPitchSet(scale)
  const last = actualProgression[actualProgression.length - 1]
  const recentSymbols = actualProgression.slice(-3).map(item => item.symbol)
  const recentRoots = actualProgression.slice(-3).map(item => item.parsed.root)
  const allowedCandidates = state
    ? candidates
        .map(candidate => ({
          ...candidate,
          rejectionReasons: musicalRejectionReasons(candidate, state, complex)
        }))
        .filter(candidate => candidate.rejectionReasons.length === 0)
    : candidates

  const scored = allowedCandidates.map(candidate => {
    const config = SCORE_CONFIG.progression
    const breakdown = emptyScoreBreakdown(config.direction)
  const add = (
    key: keyof typeof config.components,
    raw: number,
      label: string = key
    ) => {
      const component = config.components[key]
      addScorePart(
        breakdown,
        config.tierWeights,
        component.tier,
        label,
        raw,
        component.weight,
        component.scale
      )
    }
    const targetDegree = scaleDegreeForRoot(candidate.targetRoot, scale)
    const rootDegree = scaleDegreeForRoot(candidate.root, scale)
    const playability = progressionPlayabilityForCandidate(candidate)
    const leadingMetrics = last ? voiceLeadingMetrics(last.notes, candidate.notes) : null
    const functionalRaw =
      dominantSeventhFunctionScore(candidate, actualProgression, scale) +
      majorSeventhFunctionScore(candidate, actualProgression, scale) +
      dominantFlatFiveFunctionScore(candidate, actualProgression, scale) +
      diminishedFunctionScore(candidate, actualProgression, scale) +
      augmentedFunctionScore(candidate, actualProgression, scale)

    add("generatedCandidate", 1, "candidate passed generation constraints")
    add("musicalRejection", 1, "candidate passed musical rejection rules")
    add("guitarVoicingFeasibility", playability.feasibility, "guitar voicing feasibility")
    add("guitarVoicingBalance", playability.balance, "guitar voicing balance")
    add("targetMotion", targetDegree >= 0 ? targetScores[targetDegree] : 12, "expected target motion")
    add("qualityFit", qualityWeight(candidate.type, complex), "quality fit for suggestion bucket")
    add("voiceLeading", leadingMetrics ? leadingMetrics.score : 0, "voice leading: common notes and stepwise motion")

    if(candidate.inKey && rootDegree >= 0) add("inKeyAffinity", targetScores[rootDegree], "in-key root affinity")
    if(!candidate.inKey) add("chromaticPull", leadingTonePullScore(candidate, scale, scaleSet), "chromatic pull")
    if(state) {
      add("tendencyResolution", tendencyResolutionScoreForState(candidate, state), "tendency-tone resolution")
      add("fixedTonicRelation", fixedTonicRelationScoreForState(candidate, state), "fixed tonic relationship")
      add("functionalNeed", functionalNeedScoreForState(candidate, state), "current functional need")
    }
    add("functionalRole", functionalRaw, "functional role fit")
    add("resolutionIntent", resolutionIntentScore(candidate, resolutionPlan, scale), "resolution timing")
    if(state) {
      add("resolutionRoute", resolutionRouteScoreForState(candidate, state), "believable resolution route")
      add("lookaheadResolution", lookaheadResolutionScoreForState(candidate, state), "short lookahead resolution path")
      add("harmonicNeedFit", harmonicNeedFitScoreForState(candidate, state), "current harmonic need fit")
      add("phraseFunction", phraseFunctionScoreForState(candidate, state), "phrase-aware harmonic function")
      add("tensionManagement", tensionManagementScoreForState(candidate, state), "tension management")
      add("cadenceBehavior", cadenceBehaviorScoreForState(candidate, state), "cadential behavior")
    }
    add("commonToneConnection", commonToneConnectionScore(candidate, actualProgression, state), "common-note connection")
    add("patternMatch", progressionPatternScore(candidate, actualProgression, scale), "common progression match")
    add("phrasePosition", phrasePositionScore(candidate, resolutionPlan), "phrase position")
    if(state) {
      add("familyPriority", familyPriorityScore(candidate, state), "functional family priority")
      add("sentenceCompletion", sentenceCompletionScoreForState(candidate, actualProgression, state), "musical sentence completion")
    }
    add("bassMotion", bassMotionScore(candidate, actualProgression, scaleSet, resolutionPlan), "bass motion")

    if(last && candidate.root === last.parsed.root && candidate.type !== last.parsed.type) {
      add("sameRootColor", candidate.inKey ? 4 : 18, "same-root color change")
    }

    if(recentSymbols.includes(candidate.symbol)) add("recentSymbolPenalty", -34, "avoid recently used symbol")
    if(recentRoots.includes(candidate.root)) add("recentRootPenalty", candidate.inKey ? -6 : -3, "avoid recently used root")
    if(last && candidate.symbol === last.symbol) add("recentSymbolPenalty", -60, "avoid immediate repeat")

    return {
      ...candidate,
      completionPath: state ? buildCandidateCompletionPath(candidate, key, mode, state) : [candidate.symbol],
      rankNote: state ? rankNoteForCandidate(candidate, state, breakdown, actualProgression) : candidate.rankNote,
      score: breakdown.total,
      scoreBreakdown: breakdown
    }
  }).sort((a, b) => {
    if(b.score !== a.score) return b.score - a.score
    if(a.targetRoot !== b.targetRoot) return idx(a.targetRoot) - idx(b.targetRoot)
    if(Boolean(a.bass) !== Boolean(b.bass)) return a.bass ? 1 : -1
    return a.symbol.localeCompare(b.symbol)
  })

  const seen = new Set<string>()
  return scored.filter(candidate => {
    if(seen.has(candidate.symbol)) return false
    seen.add(candidate.symbol)
    return true
  })
}

function rankProgressionCandidates(
  candidates: ProgressionSuggestionCandidate[],
  state: ProgressionState,
  complex: boolean,
  fallbackProgression: ParsedProgressionChord[]
) {
  const plan = buildResolutionPlan(state.chords.length, state.key, state.mode, state.phraseLength)
  return scoreProgressionCandidates(
    candidates,
    fallbackProgression,
    state.key,
    state.mode,
    complex,
    plan,
    parseProgressionSymbols(state.chordSequence),
    state
  )
}

function pickByKeyStatus(candidates: ProgressionSuggestionCandidate[], inKey: boolean, count: number, used: Set<string>) {
  const picked: string[] = []
  const usedRoots = new Set<string>()
  const usedFunctions = new Set<HarmonicFunction>()
  let usedSlashChord = false

  for(const candidate of candidates) {
    if(
      candidate.inKey !== inKey ||
      used.has(candidate.symbol) ||
      usedRoots.has(candidate.root) ||
      usedFunctions.has(candidate.functionCategory) ||
      (candidate.bass && usedSlashChord)
    ) continue
    picked.push(candidate.symbol)
    used.add(candidate.symbol)
    usedRoots.add(candidate.root)
    usedFunctions.add(candidate.functionCategory)
    if(candidate.bass) usedSlashChord = true
    if(picked.length === count) return picked
  }

  for(const candidate of candidates) {
    if(candidate.inKey !== inKey || used.has(candidate.symbol)) continue
    if(usedRoots.has(candidate.root)) continue
    if(candidate.bass && usedSlashChord) continue
    picked.push(candidate.symbol)
    used.add(candidate.symbol)
    usedRoots.add(candidate.root)
    usedFunctions.add(candidate.functionCategory)
    if(candidate.bass) usedSlashChord = true
    if(picked.length === count) return picked
  }

  for(const candidate of candidates) {
    if(candidate.inKey !== inKey || used.has(candidate.symbol)) continue
    if(candidate.bass && usedSlashChord) continue
    picked.push(candidate.symbol)
    used.add(candidate.symbol)
    usedFunctions.add(candidate.functionCategory)
    if(candidate.bass) usedSlashChord = true
    if(picked.length === count) return picked
  }

  return picked
}

function pickTopScoredCandidate(candidates: ProgressionSuggestionCandidate[], used: Set<string>) {
  return candidates.find(candidate => !used.has(candidate.symbol))
}

function pickScoredSuggestionCategory(
  candidates: ProgressionSuggestionCandidate[],
  count: number,
  used: Set<string>,
  fillOrder: { inKey: boolean; count: number }[]
) {
  const picked: string[] = []
  const groups = fillOrder.map(group => ({ ...group }))
  const top = pickTopScoredCandidate(candidates, used)

  if(top) {
    picked.push(top.symbol)
    used.add(top.symbol)
    const matchingGroup = groups.find(group => group.inKey === top.inKey)
    if(matchingGroup) matchingGroup.count = Math.max(0, matchingGroup.count - 1)
  }

  for(const group of groups) {
    if(picked.length >= count || group.count <= 0) continue
    picked.push(...pickByKeyStatus(candidates, group.inKey, Math.min(group.count, count - picked.length), used))
  }

  if(picked.length < count) {
    for(const candidate of candidates) {
      if(used.has(candidate.symbol)) continue
      picked.push(candidate.symbol)
      used.add(candidate.symbol)
      if(picked.length >= count) break
    }
  }

  return picked
}

function pickFilteredSuggestions(
  candidates: ProgressionSuggestionCandidate[],
  count: number,
  used: Set<string>,
  predicate: (candidate: ProgressionSuggestionCandidate) => boolean
) {
  const picked: string[] = []

  for(const candidate of candidates) {
    if(!predicate(candidate) || used.has(candidate.symbol)) continue
    picked.push(candidate.symbol)
    used.add(candidate.symbol)
    if(picked.length >= count) break
  }

  return picked
}

function pickSimpleSuggestions(candidates: ProgressionSuggestionCandidate[], count: number) {
  const used = new Set<string>()
  const picked = [
    ...pickFilteredSuggestions(candidates, 3, used, candidate => candidate.inKey && isPlainTriadSuggestion(candidate)),
    ...pickFilteredSuggestions(candidates, 2, used, candidate => candidate.inKey && isSimpleColorSuggestion(candidate))
  ]

  if(picked.length < 3) {
    picked.push(...pickFilteredSuggestions(
      candidates,
      3 - picked.length,
      used,
      isPlainTriadSuggestion
    ))
  }

  if(picked.length < count) {
    picked.push(...pickFilteredSuggestions(
      candidates,
      count - picked.length,
      used,
      isSimpleColorSuggestion
    ))
  }

  if(picked.length < count) {
    picked.push(...pickFilteredSuggestions(
      candidates,
      count - picked.length,
      used,
      isSimpleSuggestionCandidate
    ))
  }

  return picked
}

function isExtendedOrAlteredQuality(type: Quality) {
  return type === "maj7" ||
    type === "m7" ||
    type === "m7b5" ||
    type === "dim7" ||
    type === "6" ||
    type === "m6" ||
    type === "add9" ||
    type === "madd9" ||
    type === "6add9" ||
    type === "maj9" ||
    type === "m9" ||
    type === "m11" ||
    type === "9" ||
    type === "11" ||
    type === "13" ||
    type === "7b5" ||
    type === "7#5" ||
    type === "7b9" ||
    type === "7#9" ||
    type === "7sus2" ||
    type === "7sus4"
}

function isTonicVariantCandidate(candidate: ProgressionSuggestionCandidate, state: ProgressionState) {
  return samePitch(candidate.root, state.tonicRoot) &&
    (candidate.functionCategory === "tonic" ||
      candidate.functionCategory === "cadenceChord" ||
      candidate.family === "prolongation")
}

function pickComplexSuggestions(candidates: ProgressionSuggestionCandidate[], count: number, state: ProgressionState) {
  const picked: string[] = []
  const used = new Set<string>()
  const nearResolution = state.remainingSlotsToResolution <= 2 ||
    state.phrasePosition === "preCadential" ||
    state.phrasePosition === "cadential" ||
    state.context.resolutionDue
  const tonicLimit = nearResolution ? Math.ceil(count * 0.65) : count
  let tonicCount = 0
  const rootCounts = new Map<string, number>()
  const rootLimit = 2

  const canAdd = (candidate: ProgressionSuggestionCandidate, enforceTonicLimit = true) => {
    if(used.has(candidate.symbol)) return false
    if(enforceTonicLimit && isTonicVariantCandidate(candidate, state) && tonicCount >= tonicLimit) return false
    if(enforceTonicLimit && (rootCounts.get(candidate.root) ?? 0) >= rootLimit) return false
    return true
  }
  const addCandidate = (candidate: ProgressionSuggestionCandidate | undefined, enforceTonicLimit = true) => {
    if(!candidate || !canAdd(candidate, enforceTonicLimit)) return false
    picked.push(candidate.symbol)
    used.add(candidate.symbol)
    if(isTonicVariantCandidate(candidate, state)) tonicCount += 1
    rootCounts.set(candidate.root, (rootCounts.get(candidate.root) ?? 0) + 1)
    return true
  }
  const addFirstMatching = (predicate: (candidate: ProgressionSuggestionCandidate) => boolean) => {
    for(const candidate of candidates) {
      if(predicate(candidate) && addCandidate(candidate)) return true
    }
    return false
  }

  addCandidate(candidates[0])

  if(state.phrasePosition !== "startOfPhrase") {
    addFirstMatching(candidate => !candidate.inKey && isExtendedOrAlteredQuality(candidate.type))
  }

  addFirstMatching(candidate => isExtendedOrAlteredQuality(candidate.type))

  if(nearResolution) {
    addFirstMatching(candidate => !isTonicVariantCandidate(candidate, state) && isTonicSubstituteRole(candidate.functionCategory))
    addFirstMatching(candidate => !isTonicVariantCandidate(candidate, state) && candidate.functionCategory === "dominant")
    addFirstMatching(candidate => !isTonicVariantCandidate(candidate, state) && candidate.functionCategory === "passingChord")
  }

  for(const candidate of candidates) {
    if(picked.length >= count) break
    addCandidate(candidate)
  }

  for(const candidate of candidates) {
    if(picked.length >= count) break
    addCandidate(candidate, false)
  }

  return picked.slice(0, count)
}

function tonicResolutionSymbol(key: string, mode: string) {
  return buildDiatonicChords(key, mode)[0] || symbolForQuality(normalize(key), "maj")
}

function tonicResolutionOverlap(candidate: ProgressionSuggestionCandidate, tonicNotes: string[]) {
  return candidate.notes.filter(note => tonicNotes.includes(note)).length
}

function pickTonicResolutionVariations(
  candidates: ProgressionSuggestionCandidate[],
  tonicSymbol: string,
  count: number,
  used: Set<string>
) {
  const tonicNotes = chordNotesForSymbol(tonicSymbol)
  const tonicRoot = parse(tonicSymbol).root
  const seen = new Set<string>()

  return candidates
    .filter(candidate => {
      if(used.has(candidate.symbol) || candidate.symbol === tonicSymbol) return false
      if(seen.has(candidate.symbol)) return false
      seen.add(candidate.symbol)
      if(candidate.root === tonicRoot) return true
      return tonicResolutionOverlap(candidate, tonicNotes) >= 2
    })
    .sort((a, b) => {
      const bOverlap = tonicResolutionOverlap(b, tonicNotes)
      const aOverlap = tonicResolutionOverlap(a, tonicNotes)
      if(bOverlap !== aOverlap) return bOverlap - aOverlap
      if(a.root === tonicRoot && b.root !== tonicRoot) return -1
      if(b.root === tonicRoot && a.root !== tonicRoot) return 1
      if(b.score !== a.score) return b.score - a.score
      return a.symbol.localeCompare(b.symbol)
    })
    .slice(0, count)
    .map(candidate => candidate.symbol)
}

function appendUniqueSymbols(target: string[], symbols: string[], used: Set<string>, limit: number) {
  for(const symbol of symbols) {
    if(used.has(symbol) || target.length >= limit) continue
    target.push(symbol)
    used.add(symbol)
  }
}

function debugForSymbols(
  symbols: string[],
  candidates: ProgressionSuggestionCandidate[],
  state: ProgressionState
): ProgressionSuggestionDebug[] {
  const context = debugContextFor(state)

  return symbols
    .map(symbol => {
      const candidate = candidates.find(item => item.symbol === symbol)
      if(!candidate?.scoreBreakdown) return null
      return {
        symbol,
        score: candidate.score,
        breakdown: candidate.scoreBreakdown,
        role: candidate.functionCategory,
        family: candidate.family,
        generatedBecause: candidate.generatedBecause,
        validBecause: candidate.validBecause,
        resolvesTo: candidate.resolutionTarget,
        context,
        theoryNote: candidate.theoryNote,
        resolutionNote: candidate.resolutionNote,
        rankNote: candidate.rankNote,
        completionPath: candidate.completionPath
      }
    })
    .filter((item): item is ProgressionSuggestionDebug => Boolean(item))
}

function uniqueProgressionCandidates(candidates: ProgressionSuggestionCandidate[]) {
  const seen = new Set<string>()

  return candidates.filter(candidate => {
    if(seen.has(candidate.symbol)) return false
    seen.add(candidate.symbol)
    return true
  })
}

function buildKeyChordBestCandidates(state: ProgressionState, plan: ResolutionPlan) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()
  const scaleSet = canonicalPitchSet(state.scale)

  for(const symbol of buildDiatonicChords(state.key, state.mode)) {
    const parsed = parse(symbol)
    addCandidate(
      candidates,
      seen,
      symbol,
      parsed.root,
      state.scale,
      scaleSet,
      state.mode,
      plan,
      state.phrasePosition,
      state.key,
      "diatonic",
      ["included from the chords-of-the-key grid for best overall evaluation"],
      ["diatonic"]
    )
  }

  return candidates
}

function bestOverallProgressionDebug({
  state,
  generatedCandidates,
  fallback
}:{
  state: ProgressionState
  generatedCandidates: ProgressionSuggestionCandidate[]
  fallback: ParsedProgressionChord[]
}) {
  const plan = buildResolutionPlan(state.chords.length, state.key, state.mode, state.phraseLength)
  const bestPool = uniqueProgressionCandidates([
    ...generatedCandidates,
    ...buildKeyChordBestCandidates(state, plan)
  ])
  const ranked = rankProgressionCandidates(bestPool, state, true, fallback)
  const best = ranked[0]

  return best ? debugForSymbols([best.symbol], ranked, state)[0] : undefined
}

function bestDebugFromTopDisplayedSuggestions({
  simple,
  complex,
  rankedCandidates,
  state
}:{
  simple: string[]
  complex: string[]
  rankedCandidates: ProgressionSuggestionCandidate[]
  state: ProgressionState
}) {
  const topSymbols = Array.from(new Set([...simple, ...complex])).slice(0, 3)
  const debugs = debugForSymbols(topSymbols, rankedCandidates, state)

  return debugs.sort((a, b) => b.score - a.score)[0]
}

export function buildProgressionSuggestions({
  progression,
  key = "C",
  mode = "Ionian",
  resolveWithin = 4
}:{
  progression: string[]
  key?: string
  mode?: string
  resolveWithin?: number
}): ProgressionSuggestionSet {
  const progressionState = analyzeProgressionState({
    progression,
    key,
    mode,
    resolveWithin
  })
  const parsedProgression = parseProgressionSymbols(progression)
  const fallback = parsedProgression.length > 0
    ? parsedProgression
    : parseProgressionSymbols([tonicResolutionSymbol(key, mode)])
  const resolutionPlan = buildResolutionPlan(progressionState.chords.length, key, mode, progressionState.phraseLength)
  const simpleBaseCandidates = generateProgressionCandidates(progressionState, false, true)
  const complexBaseCandidates = generateProgressionCandidates(progressionState, true, true)

  const simpleCandidates = rankProgressionCandidates(
    simpleBaseCandidates,
    progressionState,
    false,
    fallback
  ).filter(isSimpleSuggestionCandidate)

  const complexCandidates = rankProgressionCandidates(
    complexBaseCandidates,
    progressionState,
    true,
    fallback
  )
  const complexPickCandidates = progressionState.phrasePosition === "startOfPhrase"
    ? complexCandidates.filter(candidate => candidate.inKey && !isTensionBearingRole(candidate.functionCategory))
    : complexCandidates
  const nearResolution = progressionState.remainingSlotsToResolution <= 2 ||
    progressionState.phrasePosition === "preCadential" ||
    progressionState.phrasePosition === "cadential" ||
    progressionState.context.resolutionDue
  const complexDisplayCandidates = nearResolution
    ? uniqueProgressionCandidates([...complexPickCandidates, ...simpleCandidates])
    : complexPickCandidates
  const debugCandidatePool = uniqueProgressionCandidates([...complexCandidates, ...simpleCandidates])

  if(resolutionPlan.resolutionDue) {
    const simple = pickSimpleSuggestions(simpleCandidates, 5)
    const complex = pickComplexSuggestions(complexDisplayCandidates, 5, progressionState)
    const best = bestDebugFromTopDisplayedSuggestions({
      simple,
      complex,
      rankedCandidates: debugCandidatePool,
      state: progressionState
    })

    return {
      simple,
      complex,
      best,
      debug: {
        simple: debugForSymbols(simple, simpleCandidates, progressionState),
        complex: debugForSymbols(complex, debugCandidatePool, progressionState)
      }
    }
  }

  const simple = pickSimpleSuggestions(simpleCandidates, 5)

  const complex = pickComplexSuggestions(complexDisplayCandidates, 5, progressionState)
  const best = bestDebugFromTopDisplayedSuggestions({
    simple,
    complex,
    rankedCandidates: debugCandidatePool,
    state: progressionState
  })

  return {
    simple,
    complex,
    best,
    debug: {
      simple: debugForSymbols(simple, simpleCandidates, progressionState),
      complex: debugForSymbols(complex, debugCandidatePool, progressionState)
    }
  }
}

function completionCandidateFromSuggestions(suggestions: ProgressionSuggestionSet) {
  return suggestions.simple[0] ?? suggestions.complex[0] ?? null
}

function tonicBehaviorForCompletion(state: ProgressionState): ProgressionCompletion["finalTonicBehavior"] {
  const current = state.context.currentChord
  if(current && samePitch(current.root, state.tonicRoot) && isStableRole(current.role)) {
    return state.phrasePosition === "postCadentialRelease" ? "tonicProlongation" : "resolvedToTonic"
  }
  if(state.phrasePosition === "loopingVamp") return "loopingOpen"
  return "unresolved"
}

function completionExplanation({
  suggestedContinuation,
  initialState,
  finalState,
  key,
  mode
}:{
  suggestedContinuation: string[]
  initialState: ProgressionState
  finalState: ProgressionState
  key: string
  mode: string
}) {
  const targetName = targetDisplayName(initialState.targetChord, key, mode)
  const finalBehavior = tonicBehaviorForCompletion(finalState)
  const pathText = suggestedContinuation.length ? suggestedContinuation.join(" -> ") : "no added chord"

  if(finalBehavior === "loopingOpen") {
    return `The fixed input stays intact; ${pathText} preserves the vamp while keeping a route back to ${targetName}.`
  }

  if(finalBehavior === "resolvedToTonic" || finalBehavior === "tonicProlongation") {
    return `The fixed input stays intact; ${pathText} follows the active ${initialState.harmonicNeed} need and lands on the fixed tonic.`
  }

  return `The fixed input stays intact; ${pathText} is the clearest available continuation, but the phrase remains unresolved.`
}

export function buildProgressionCompletion({
  progression,
  key = "C",
  mode = "Ionian",
  resolveWithin = 4,
  maxAdditionalChords
}:{
  progression: string[]
  key?: string
  mode?: string
  resolveWithin?: number
  maxAdditionalChords?: number
}): ProgressionCompletion {
  const fixedInput = progression.slice()
  const initialState = analyzeProgressionState({ progression: fixedInput, key, mode, resolveWithin })
  const continuation: string[] = []
  const debug: ProgressionSuggestionDebug[] = []
  const working = fixedInput.slice()
  const maxSteps = Math.max(1, Math.min(resolveWithin, maxAdditionalChords ?? resolveWithin))

  for(let step = 0; step < maxSteps; step++) {
    const suggestions = buildProgressionSuggestions({ progression: working, key, mode, resolveWithin })
    const next = completionCandidateFromSuggestions(suggestions)
    if(!next) break

    const debugItem = [...(suggestions.debug?.simple ?? []), ...(suggestions.debug?.complex ?? [])]
      .find(item => item.symbol === next)
    if(debugItem) debug.push(debugItem)

    continuation.push(next)
    working.push(next)

    const nextState = analyzeProgressionState({ progression: working, key, mode, resolveWithin })
    const current = nextState.context.currentChord
    const resolvedToTonic = Boolean(current && samePitch(current.root, nextState.tonicRoot) && isStableRole(current.role))

    if(resolvedToTonic) {
      break
    }

    if(nextState.phrasePosition === "loopingVamp" && continuation.length >= 1) {
      break
    }
  }

  const finalState = analyzeProgressionState({ progression: working, key, mode, resolveWithin })
  const finalBehavior = tonicBehaviorForCompletion(finalState)

  return {
    fixedInput,
    suggestedContinuation: continuation,
    phrasePosition: initialState.phrasePosition,
    resolutionPath: continuation.slice(),
    finalResolvesToTonic: finalBehavior === "resolvedToTonic" || finalBehavior === "tonicProlongation",
    finalTonicBehavior: finalBehavior,
    explanation: completionExplanation({
      suggestedContinuation: continuation,
      initialState,
      finalState,
      key,
      mode
    }),
    debug
  }
}

function getDegree(symbol: string, key: string) {
  const parsed = parse(symbol)
  const rootIdx = idx(parsed.root)
  const keyIdx = idx(key)

  if (rootIdx < 0 || keyIdx < 0) return null
  const rootDegree = DEGREE_LABELS[(rootIdx - keyIdx + 12) % 12] || null
  if(!rootDegree) return null
  if(!parsed.bass || parsed.bass === parsed.root) return rootDegree

  const bassIdx = idx(parsed.bass)
  if(bassIdx < 0) return rootDegree
  const bassDegree = DEGREE_LABELS[(bassIdx - keyIdx + 12) % 12] || parsed.bass
  return `${rootDegree}/${bassDegree}`
}

function voicingLimitForStringCount(stringCount: number) {
  if (stringCount === 3) return 12
  if (stringCount === 4) return 7
  if (stringCount === 5) return 8
  if (stringCount === 6) return 4
  return 6
}

function mergeCanonicalVoicings(generic: CandidateEntry[][], canonical: CandidateEntry[][], limit: number, stringCount: number, root: string) {
  if(stringCount >= 5 && canonical.length > 0) {
    const openPosition = generic.filter(voicing => {
      return isOpenPositionVoicing(voicing) &&
        commonOpenVoicingScore(voicing, root, stringCount) >= 1.3
    })
    const lowFretCanonical = canonical.filter(isLowFretFirstPositionVoicing)

    return dedupe([
      ...openPosition,
      ...lowFretCanonical,
      ...canonical,
      ...generic
    ]).slice(0, limit)
  }

  const firstPosition = generic.filter((voicing) => {
    const frets = voicing.map(entry => entry.fret)
    return Math.min(...frets) <= 3
  })

  return dedupe([
    ...generic,
    ...firstPosition,
    ...canonical
  ]).slice(0, limit)
}

type ScoredVoicingCandidate = {
  v: CandidateEntry[]
  pos: ReturnType<typeof positionMetric>
  score: number
  breakdown: ScoreBreakdown
  gap: VoicingGapMetadata
}

function selectableVoicingCandidates(scored: ScoredVoicingCandidate[]) {
  const preferred = scored.filter(candidate => {
    return !candidate.gap.hasGap || candidate.gap.isMeaningfulGap
  })

  return preferred.length > 0 ? preferred : scored
}

function pickVisibleVoicings(scored: ScoredVoicingCandidate[], stringCount: number, limit: number) {
  const selectable = selectableVoicingCandidates(scored)
  const zones = new Map<number, typeof selectable>()

  for(const item of selectable){
    const z=getZone(item.pos.min)
    if(!zones.has(z)) zones.set(z,[])
    zones.get(z)!.push(item)
  }

  for(const arr of zones.values()){
    arr.sort((a,b)=>a.score-b.score)
  }

  const result:CandidateEntry[][] = []
  const seen = new Set<string>()
  const addCandidate = (candidate: ScoredVoicingCandidate | undefined) => {
    if(!candidate) return false
    const key = candidate.v.map(entry => `${entry.string}-${entry.fret}`).join("|")
    if(seen.has(key)) return false
    seen.add(key)
    result.push(candidate.v)
    return true
  }

  addCandidate(selectable[0])

  for(const z of [0, 1, 2, 3, 4]) {
    if(result.length >= Math.min(limit, Math.max(2, zones.size))) break
    addCandidate((zones.get(z) || [])[0])
  }

  const secondPool = (zones.get(0)||[]).concat(zones.get(1)||[])
  for(const item of secondPool){
    if(result.length>=Math.min(limit, 3)) break
    addCandidate(item)
  }

  const zoneOrder = [1,2,3,4,0]
  const zonePointers: Record<number, number> = {0:0,1:0,2:0,3:0,4:0}

  while(result.length < limit){
    let added = false

    for(const z of zoneOrder){
      const arr = zones.get(z) || []
      let i = zonePointers[z]

      while(i < arr.length){
        const candidate = arr[i]
        zonePointers[z] = i + 1
        i++

        if(stringCount < 5 && hasOpen(candidate.v)) continue
        if(stringCount >= 5 && hasSplitPositionCluster(candidate.v)) continue

        addCandidate(candidate)
        added = true
        break
      }

      if(result.length >= limit) break
    }

    if(!added) break
  }

  if(result.length < limit) {
    for(const candidate of selectable) {
      if(result.length >= limit) break
      addCandidate(candidate)
    }
  }

  return dedupe(result).slice(0, limit)
}

export function analyzeChord({
  symbol,
  stringCount=4,
  key="C",
  mode="Ionian"
}:{
  symbol:string
  stringCount?:number
  key?:string
  mode?:string
}):ChordAnalysisResult{

  const parsed=parse(symbol)
  const chord=buildChordWithBass(parsed)

  const raw=generate(chord,stringCount, parsed.bass)
  const requiresThird = chordRequiresThird(chord)
  const playableRaw = raw.filter(voicing => {
    return isRealisticVoicingCandidate(voicing, stringCount, chord, requiresThird)
  })

  const scored=playableRaw.map(v=>{
    const breakdown = scoreVoicingBreakdown(v, stringCount, parsed.root, requiresThird, parsed.bass, chord)
    return {
      v,
      pos:positionMetric(v),
      score:breakdown.total,
      breakdown,
      gap: voicingGapMetadata(v, chord)
    }
  })
  .sort((a,b)=>{
    if(stringCount === 3 || stringCount === 4) {
      if(a.score!==b.score) return a.score-b.score
      return a.pos.min-b.pos.min
    }
    if(a.pos.min!==b.pos.min) return a.pos.min-b.pos.min
    return a.score-b.score
  })

  const voicingLimit = voicingLimitForStringCount(stringCount)
  const result = pickVisibleVoicings(scored, stringCount, voicingLimit)

  const voicings = mergeCanonicalVoicings(
    dedupe(result),
    parsed.bass ? [] : canonicalBarreVoicings(chord, parsed.root, parsed.type, stringCount),
    voicingLimit,
    stringCount,
    parsed.root
  )

  return {
    chord_name:symbol,
    voicings,
    voicing_scores: voicings.map(voicing => scoreVoicingBreakdown(voicing, stringCount, parsed.root, requiresThird, parsed.bass, chord)),
    suggestions:getModeAwareSuggestions(symbol,key,mode),
    key_context:key,
    scale_notes:buildScaleFromMode(key, mode),
    diatonic_chords:buildDiatonicChords(key, mode),
    degree:getDegree(symbol, key),
    parsed
  }
}

function voicingAverageMidi(voicing: CandidateEntry[] | undefined) {
  if(!voicing || voicing.length === 0) return null

  const midis = voicing.map(entry => TUNING_MIDI[entry.string] + entry.fret)
  return midis.reduce((sum, midi) => sum + midi, 0) / midis.length
}

function previousVoicingAverageForChord(
  previousChord: string | undefined,
  previousStringCount: number | undefined,
  key: string,
  mode: string
) {
  if(!previousChord || !previousStringCount || !parseChordSymbol(previousChord)) return null

  const analysis = analyzeChord({
    symbol: previousChord,
    stringCount: previousStringCount,
    key,
    mode
  })

  return voicingAverageMidi(analysis.voicings[0])
}

function stringCountContinuityScore(stringCount: number, previousStringCount: number | undefined) {
  if(previousStringCount === undefined) return 0

  const jump = Math.abs(stringCount - previousStringCount)
  let score = jump === 0 ? 4 : jump === 1 ? 2 : 0

  score -= jump * 2
  if(jump > 2) score -= (jump - 2) * 18
  if(previousStringCount <= 4 && stringCount >= 6) score -= 10
  if(previousStringCount >= 5 && stringCount <= 3) score -= 10

  return score
}

function registerContinuityScore(voicing: CandidateEntry[] | undefined, previousAverageMidi: number | null) {
  if(previousAverageMidi === null) return 0

  const averageMidi = voicingAverageMidi(voicing)
  if(averageMidi === null) return 0

  const distance = Math.abs(averageMidi - previousAverageMidi)
  if(distance <= 4) return 3
  if(distance <= 7) return 1

  return -(distance - 7) * 1.4
}

function averageFretForVoicing(voicing: CandidateEntry[]) {
  return voicing.reduce((sum, entry) => sum + entry.fret, 0) / voicing.length
}

function smartCommonShapeScore(voicings: CandidateEntry[][], root: string, stringCount: number) {
  if(voicings.length === 0) return 0

  return Math.max(...voicings.map(voicing => {
    const commonScore = commonGuitarVoicingScore(voicing, root, stringCount)
    if(commonScore <= 0) return 0

    return Math.max(0, commonScore - averageFretForVoicing(voicing) * 0.06)
  }))
}

export function smartStringCountForChord({
  symbol,
  key = "C",
  mode = "Ionian",
  previousStringCount,
  previousChord,
  previousVoicing,
  previousVoicingAverageMidi
}:{
  symbol:string
  key?:string
  mode?:string
  previousStringCount?: number
  previousChord?: string
  previousVoicing?: CandidateEntry[]
  previousVoicingAverageMidi?: number
}) {
  const parsed = parseChordSymbol(symbol)
  if(!parsed) return 4

  const chord = buildChordWithBass(parsed)
  const uniqueToneCount = uniqueChordPitchCount(chord)
  const hasSlashBass = Boolean(parsed.bass && parsed.bass !== parsed.root)
  const counts = [3, 4, 5, 6]
  const previousAverageMidi = previousVoicingAverageMidi ??
    voicingAverageMidi(previousVoicing) ??
    previousVoicingAverageForChord(previousChord, previousStringCount, key, mode)

  const ranked = counts.map(stringCount => {
    const analysis = analyzeChord({ symbol, stringCount, key, mode })
    const bestScore = Math.min(...(analysis.voicing_scores ?? []).map(score => score.total))
    const hasVoicings = analysis.voicings.length > 0
    const bestCommonShapeScore = hasVoicings
      ? smartCommonShapeScore(analysis.voicings, parsed.root, stringCount)
      : 0
    const usefulCountTarget = stringCount === 3 ? 9 : stringCount === 4 ? 7 : stringCount === 5 ? 5 : 3
    const availability = Math.min(analysis.voicings.length, usefulCountTarget) / usefulCountTarget
    const countFit =
      stringCount === 3
        ? uniqueToneCount <= 3 && !hasSlashBass ? 3 : uniqueToneCount === 4 && !hasSlashBass ? 2 : -12
        : stringCount === 4
          ? uniqueToneCount >= 4 || hasSlashBass ? 18 : 10
          : stringCount === 5
            ? uniqueToneCount >= 5 || hasSlashBass ? 10 : uniqueToneCount <= 3 ? 8 : -4
            : uniqueToneCount <= 3 && !hasSlashBass ? 12 : -10
    const continuityScore = stringCountContinuityScore(stringCount, previousStringCount)
    const registerScore = registerContinuityScore(analysis.voicings[0], previousAverageMidi)
    const commonShapeFit = bestCommonShapeScore * 30
    const score = hasVoicings
      ? -bestScore + availability * 14 + countFit + commonShapeFit + continuityScore + registerScore
      : Number.NEGATIVE_INFINITY

    return {
      stringCount,
      score
    }
  }).sort((a, b) => {
    if(b.score !== a.score) return b.score - a.score
    return a.stringCount - b.stringCount
  })

  return ranked[0]?.stringCount ?? 4
}
