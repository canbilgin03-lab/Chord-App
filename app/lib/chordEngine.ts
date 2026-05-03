export type Fret = number | "x"

export type Quality =
  | "maj"
  | "m"
  | "7"
  | "7b5"
  | "maj7"
  | "6"
  | "m6"
  | "add9"
  | "madd9"
  | "6add9"
  | "maj9"
  | "m9"
  | "9"
  | "m7"
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
  debug?: {
    simple: ProgressionSuggestionDebug[]
    complex: ProgressionSuggestionDebug[]
  }
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
}

type HarmonicFunction =
  | "tonic"
  | "predominant"
  | "dominant"
  | "secondaryDominant"
  | "leadingTone"
  | "chromaticColor"
  | "color"

type ResolutionPlan = {
  resolveWithin: number
  slotsToResolution: number
  resolutionDue: boolean
  targetRoot: string
}

export const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
const NOTES = NOTE_ORDER
const TUNING = ["E","A","D","G","B","E"]
const FRETBOARD_MAX_FRET = 18
const VOICING_WINDOW_ANCHORS = [0, 2, 4, 6, 8, 10, 12, 14]
const voicingGenerationCache = new Map<string, CandidateEntry[][]>()

const SCORE_CONFIG = {
  progression: {
    direction: "higher" as const,
    tierWeights: {
      hardConstraints: 1,
      playability: 0,
      harmonicCorrectness: 1,
      preference: 1
    },
    components: {
      generatedCandidate: { tier: "hardConstraints" as const, weight: 0, scale: 1 },
      targetMotion: { tier: "harmonicCorrectness" as const, weight: 18, scale: 60 },
      qualityFit: { tier: "harmonicCorrectness" as const, weight: 12, scale: 12 },
      voiceLeading: { tier: "harmonicCorrectness" as const, weight: 10, scale: 40 },
      inKeyAffinity: { tier: "harmonicCorrectness" as const, weight: 9, scale: 32 },
      chromaticPull: { tier: "harmonicCorrectness" as const, weight: 12, scale: 80 },
      functionalRole: { tier: "harmonicCorrectness" as const, weight: 22, scale: 140 },
      resolutionIntent: { tier: "harmonicCorrectness" as const, weight: 18, scale: 90 },
      patternMatch: { tier: "preference" as const, weight: 24, scale: 140 },
      phrasePosition: { tier: "preference" as const, weight: 8, scale: 28 },
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
      requiredBass: { tier: "harmonicCorrectness" as const, weight: 26, scale: 1 },
      definingTone: { tier: "harmonicCorrectness" as const, weight: 22, scale: 1 },
      rootBassPreference: { tier: "preference" as const, weight: 10, scale: 1 },
      openPositionPreference: { tier: "preference" as const, weight: 10, scale: 1 },
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

const CHORD_INFERENCE_PATTERNS: ChordInferencePattern[] = [
  { type: "6add9", intervals: [0, 2, 4, 7, 9] },
  { type: "maj9", intervals: [0, 2, 4, 7, 11] },
  { type: "m9", intervals: [0, 2, 3, 7, 10] },
  { type: "9", intervals: [0, 2, 4, 7, 10] },
  { type: "add9", intervals: [0, 2, 4, 7] },
  { type: "madd9", intervals: [0, 2, 3, 7] },
  { type: "maj7", intervals: [0, 4, 7, 11] },
  { type: "m7", intervals: [0, 3, 7, 10] },
  { type: "m7b5", intervals: [0, 3, 6, 10] },
  { type: "7b5", intervals: [0, 4, 6, 10] },
  { type: "7", intervals: [0, 4, 7, 10] },
  { type: "dim7", intervals: [0, 3, 6, 9] },
  { type: "6", intervals: [0, 4, 7, 9] },
  { type: "m6", intervals: [0, 3, 7, 9] },
  { type: "7sus2", intervals: [0, 2, 7, 10] },
  { type: "7sus4", intervals: [0, 5, 7, 10] },
  { type: "dim", intervals: [0, 3, 6] },
  { type: "aug", intervals: [0, 4, 8] },
  { type: "sus2", intervals: [0, 2, 7] },
  { type: "sus4", intervals: [0, 5, 7] },
  { type: "m", intervals: [0, 3, 7] },
  { type: "maj", intervals: [0, 4, 7] }
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

export function inferChordSymbol(notes: string[], key = "C", mode = "Ionian") {
  if(!Array.isArray(notes)) return null

  const pitchSet = new Set(notes.map(normalize))
  const uniquePitches = [...pitchSet]
  if (uniquePitches.length === 0) return null

  for (const root of uniquePitches) {
    const intervals = new Set<number>(
      uniquePitches.map(note => (idx(note) - idx(root) + 12) % 12)
    )

    if (!intervals.has(0)) continue

    if (intervals.size === 1) {
      return symbolForQuality(root, "maj", undefined, key, mode)
    }

    if (uniquePitches.length === 2) {
      const match = TWO_NOTE_INFERENCE_PATTERNS.find(pattern => intervalSetMatches(intervals, pattern.intervals))
      if(match) return symbolForQuality(root, match.type, undefined, key, mode)
      continue
    }

    const match = CHORD_INFERENCE_PATTERNS.find(pattern => intervalSetMatches(intervals, pattern.intervals))
    if(match) return symbolForQuality(root, match.type, undefined, key, mode)
  }

  return null
}

/**
 * Validates whether a set of notes can be named as a valid chord.
 * Returns true if the notes can form a recognizable chord, false otherwise.
 * This is used to validate whether moving a note to a fret position results in a namable chord.
 */
export function canNameChord(notes: string[], key = "C", mode = "Ionian"): boolean {
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
    role === "9"
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

  const hasThird = v.some(x=>x.role==="3"||x.role==="b3")
  if(requiresThird) add("definingTone", hasThird ? -0.25 : 1, "contains defining third")

  const counts: Record<string, number> = {}
  for (const n of v) {
    counts[n.note] = (counts[n.note] || 0) + 1
  }
  let duplicateCount = 0
  for (const c of Object.values(counts)) {
    if (c > 1) duplicateCount += c - 1
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
        !(group.length >= 5 && hasSplitPositionCluster(curr)) &&
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
      if(group.length >= 5 && next.length >= 4 && hasSplitPositionCluster(next)) continue

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

  for(const group of groups(size)) {
    const preferredAnchors = VOICING_WINDOW_ANCHORS
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

function parseProgressionSymbols(symbols: string[]) {
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
    .filter((item): item is { symbol: string; parsed: ParsedChord; notes: string[] } => Boolean(item))
}

function chordNotesForSymbol(symbol: string) {
  const parsed = parse(symbol)
  return buildChordWithBass(parsed).notes
}

function isInKeyNotes(notes: string[], scaleSet: Set<string>) {
  return notes.every(note => scaleSet.has(normalize(note)))
}

function isDominantQuality(type: Quality) {
  return type === "7" || type === "7b5" || type === "7sus2" || type === "7sus4" || type === "maj" || type === "aug"
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

function classifyHarmonicFunction({
  root,
  type,
  inKey,
  targetRoot,
  scale
}:{
  root: string
  type: Quality
  inKey: boolean
  targetRoot: string
  scale: string[]
}): HarmonicFunction {
  if(root === add(targetRoot, -1) && isDiminishedQuality(type)) return "leadingTone"
  if(!inKey && root === add(targetRoot, 7) && isDominantQuality(type)) return "secondaryDominant"
  if(!inKey) return "chromaticColor"

  const degree = scaleDegreeForRoot(root, scale)
  if(degree === 0 || degree === 2 || degree === 5) return "tonic"
  if(degree === 1 || degree === 3) return "predominant"
  if(degree === 4 || degree === 6) return "dominant"

  return "color"
}

function semitoneDistance(a: string, b: string) {
  const diff = Math.abs(idx(a) - idx(b))
  return Math.min(diff, 12 - diff)
}

function tonicOffsetForRoot(root: string, tonic: string) {
  const rootIdx = idx(root)
  const tonicIdx = idx(tonic)
  if(rootIdx < 0 || tonicIdx < 0) return -1
  return (rootIdx - tonicIdx + 12) % 12
}

function voiceLeadingScore(fromNotes: string[], toNotes: string[]) {
  if(fromNotes.length === 0 || toNotes.length === 0) return 0

  let score = 0
  for(const from of fromNotes) {
    const nearest = Math.min(...toNotes.map(to => semitoneDistance(from, to)))
    if(nearest === 0) score += 4
    else if(nearest === 1) score += 9
    else if(nearest === 2) score += 4
    else score -= nearest * 0.4
  }

  return score
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

function progressionTargetScores(progression: ReturnType<typeof parseProgressionSymbols>, key: string, mode: string) {
  const scale = buildPitchScaleFromMode(key, mode)
  const scaleSet = canonicalPitchSet(scale)
  const last = progression[progression.length - 1]
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
  if(type === "7b5") return complex ? 10 : 3
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
  if(candidate.root === add(targetRoot, 7)) score += candidate.type === "7" || candidate.type === "7b5" || candidate.type === "7sus2" || candidate.type === "7sus4" ? 24 : 20
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
  const isTonicFamily = candidate.inKey && candidate.functionCategory === "tonic"
  const isCadentialTension =
    candidate.functionCategory === "dominant" ||
    candidate.functionCategory === "secondaryDominant" ||
    candidate.functionCategory === "leadingTone"

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
    if(candidate.inKey && candidate.functionCategory === "dominant") score += 34
    if(candidate.inKey && candidate.functionCategory === "predominant") score += 14
    if(isResolutionRoot || isTonicFamily) score -= 18
    return score
  }

  if(plan.slotsToResolution === 2) {
    let score = 0
    if(resolvesToTarget && candidate.functionCategory === "secondaryDominant") score += 40
    if(resolvesToTarget && candidate.functionCategory === "leadingTone") score += 36
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
  if(candidate.functionCategory === "predominant") score += 12
  if(candidate.functionCategory === "chromaticColor") score += 7
  if(resolvesToTarget && isCadentialTension) score -= 8
  return score
}

function phrasePositionScore(candidate: ProgressionSuggestionCandidate, plan: ResolutionPlan) {
  const earlyPhrase = plan.slotsToResolution >= Math.max(4, plan.resolveWithin - 1)
  const middlePhrase = plan.slotsToResolution > 2 && !earlyPhrase

  if(earlyPhrase) {
    if(candidate.functionCategory === "tonic") return 10
    if(candidate.functionCategory === "predominant") return 8
    if(candidate.functionCategory === "chromaticColor") return 4
    if(candidate.functionCategory === "secondaryDominant" || candidate.functionCategory === "leadingTone") return -4
  }

  if(middlePhrase) {
    if(candidate.functionCategory === "predominant") return 12
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

function addCandidate(
  candidates: ProgressionSuggestionCandidate[],
  seen: Set<string>,
  symbol: string,
  targetRoot: string,
  scale: string[],
  scaleSet: Set<string>
) {
  const parsed = parse(symbol)
  const cleanSymbol = parsed.symbol
  if(seen.has(cleanSymbol)) return

  const notes = chordNotesForSymbol(cleanSymbol)
  const inKey = isInKeyNotes(notes, scaleSet)
  candidates.push({
    symbol: cleanSymbol,
    root: parsed.root,
    type: parsed.type,
    bass: parsed.bass,
    notes,
    inKey,
    targetRoot: normalize(targetRoot),
    functionCategory: classifyHarmonicFunction({
      root: parsed.root,
      type: parsed.type,
      inKey,
      targetRoot: normalize(targetRoot),
      scale
    }),
    score: 0
  })
  seen.add(cleanSymbol)
}

function buildSlashProgressionCandidates(
  baseCandidates: ProgressionSuggestionCandidate[],
  scale: string[],
  scaleSet: Set<string>,
  key: string,
  mode: string
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
        scaleSet
      )
    }
  }

  return candidates
}

function buildDiatonicProgressionCandidates(scale: string[], scaleSet: Set<string>, key: string, mode: string, complex: boolean) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()
  const diatonic = buildDiatonicChords(scale[0], mode)

  for(const symbol of diatonic) {
    const parsed = parse(symbol)
    const qualities: Quality[] = complex
      ? parsed.type === "maj"
        ? ["maj", "maj7", "7", "sus2", "sus4"]
        : parsed.type === "m"
          ? ["m", "m7", "sus2", "sus4"]
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
        addCandidate(candidates, seen, nextSymbol, parsed.root, scale, scaleSet)
      }
    }

    if(complex) {
      for(const quality of ["sus2", "sus4"] as Quality[]) {
        const nextSymbol = symbolForQuality(parsed.root, quality, undefined, key, mode)
        const notes = chordNotesForSymbol(nextSymbol)
        if(isInKeyNotes(notes, scaleSet)) {
          addCandidate(candidates, seen, nextSymbol, parsed.root, scale, scaleSet)
        }
      }
    }
  }

  return candidates
}

function buildChromaticProgressionCandidates(scale: string[], scaleSet: Set<string>, key: string, mode: string, complex: boolean) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()

  for(const targetRoot of scale) {
    const dominantRoot = add(targetRoot, 7)
    const leadingRoot = add(targetRoot, -1)
    const lowerNeighborRoot = add(targetRoot, -2)

    const dominantQualities: Quality[] = complex ? ["maj", "7", "7b5", "maj7", "7sus2", "7sus4"] : ["maj", "7"]
    for(const quality of dominantQualities) {
      addCandidate(candidates, seen, symbolForQuality(dominantRoot, quality, undefined, key, mode), targetRoot, scale, scaleSet)
    }

    if(complex) {
      for(const quality of ["dim", "dim7"] as Quality[]) {
        addCandidate(candidates, seen, symbolForQuality(leadingRoot, quality, undefined, key, mode), targetRoot, scale, scaleSet)
      }
      addCandidate(candidates, seen, symbolForQuality(dominantRoot, "aug", undefined, key, mode), targetRoot, scale, scaleSet)
      addCandidate(candidates, seen, symbolForQuality(targetRoot, "aug", undefined, key, mode), targetRoot, scale, scaleSet)
      if(targetRoot === scale[0]) {
        for(const root of [add(scale[0], 1), add(scale[0], 3), add(scale[0], 8), add(scale[0], 10)]) {
          addCandidate(candidates, seen, symbolForQuality(root, "maj7", undefined, key, mode), targetRoot, scale, scaleSet)
        }
      }
    }

    addCandidate(candidates, seen, symbolForQuality(lowerNeighborRoot, "maj", undefined, key, mode), targetRoot, scale, scaleSet)
  }

  for(const bluesRoot of [scale[0], scale[3], scale[4]]) {
    addCandidate(candidates, seen, symbolForQuality(bluesRoot, "7", undefined, key, mode), scale[0], scale, scaleSet)
  }

  return candidates.filter(candidate => {
    return !candidate.inKey ||
      candidate.functionCategory === "leadingTone" ||
      candidate.root === add(candidate.targetRoot, 7)
  })
}

function scoreProgressionCandidates(
  candidates: ProgressionSuggestionCandidate[],
  progression: ReturnType<typeof parseProgressionSymbols>,
  key: string,
  mode: string,
  complex: boolean,
  resolutionPlan: ResolutionPlan,
  actualProgression: ReturnType<typeof parseProgressionSymbols> = progression
) {
  const scale = buildPitchScaleFromMode(key, mode)
  const targetScores = progressionTargetScores(progression, key, mode)
  const scaleSet = canonicalPitchSet(scale)
  const last = progression[progression.length - 1]
  const recentSymbols = progression.slice(-3).map(item => item.symbol)
  const recentRoots = progression.slice(-3).map(item => item.parsed.root)

  const scored = candidates.map(candidate => {
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
    const functionalRaw =
      dominantSeventhFunctionScore(candidate, actualProgression, scale) +
      majorSeventhFunctionScore(candidate, actualProgression, scale) +
      dominantFlatFiveFunctionScore(candidate, actualProgression, scale) +
      diminishedFunctionScore(candidate, actualProgression, scale) +
      augmentedFunctionScore(candidate, actualProgression, scale)

    add("generatedCandidate", 1, "candidate passed generation constraints")
    add("targetMotion", targetDegree >= 0 ? targetScores[targetDegree] : 12, "expected target motion")
    add("qualityFit", qualityWeight(candidate.type, complex), "quality fit for suggestion bucket")
    add("voiceLeading", last ? voiceLeadingScore(last.notes, candidate.notes) : 0, "nearest-note voice leading")

    if(candidate.inKey && rootDegree >= 0) add("inKeyAffinity", targetScores[rootDegree], "in-key root affinity")
    if(!candidate.inKey) add("chromaticPull", leadingTonePullScore(candidate, scale, new Set(scale)), "chromatic pull")
    add("functionalRole", functionalRaw, "functional role fit")
    add("resolutionIntent", resolutionIntentScore(candidate, resolutionPlan, scale), "resolution timing")
    add("patternMatch", progressionPatternScore(candidate, actualProgression, scale), "common progression match")
    add("phrasePosition", phrasePositionScore(candidate, resolutionPlan), "phrase position")
    add("bassMotion", bassMotionScore(candidate, progression, scaleSet, resolutionPlan), "bass motion")

    if(last && candidate.root === last.parsed.root && candidate.type !== last.parsed.type) {
      add("sameRootColor", candidate.inKey ? 4 : 18, "same-root color change")
    }

    if(recentSymbols.includes(candidate.symbol)) add("recentSymbolPenalty", -34, "avoid recently used symbol")
    if(recentRoots.includes(candidate.root)) add("recentRootPenalty", candidate.inKey ? -6 : -3, "avoid recently used root")
    if(last && candidate.symbol === last.symbol) add("recentSymbolPenalty", -60, "avoid immediate repeat")

    return {
      ...candidate,
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

function debugForSymbols(symbols: string[], candidates: ProgressionSuggestionCandidate[]): ProgressionSuggestionDebug[] {
  return symbols
    .map(symbol => {
      const candidate = candidates.find(item => item.symbol === symbol)
      if(!candidate?.scoreBreakdown) return null
      return {
        symbol,
        score: candidate.score,
        breakdown: candidate.scoreBreakdown
      }
    })
    .filter((item): item is ProgressionSuggestionDebug => Boolean(item))
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
  const parsedProgression = parseProgressionSymbols(progression)
  const fallback = parsedProgression.length > 0
    ? parsedProgression
    : parseProgressionSymbols([key])
  const scale = buildScaleFromMode(key, mode)
  const scaleSet = canonicalPitchSet(scale)
  const resolutionPlan = buildResolutionPlan(parsedProgression.length, key, mode, resolveWithin)
  const simpleBaseCandidates = [
    ...buildDiatonicProgressionCandidates(scale, scaleSet, key, mode, false),
    ...buildChromaticProgressionCandidates(scale, scaleSet, key, mode, false)
  ]
  const complexBaseCandidates = [
    ...buildDiatonicProgressionCandidates(scale, scaleSet, key, mode, true),
    ...buildChromaticProgressionCandidates(scale, scaleSet, key, mode, true)
  ]

  const simpleCandidates = scoreProgressionCandidates(
    simpleBaseCandidates,
    fallback,
    key,
    mode,
    false,
    resolutionPlan,
    parsedProgression
  ).filter(isSimpleSuggestionCandidate)

  const complexCandidates = scoreProgressionCandidates(
    [
      ...complexBaseCandidates,
      ...buildSlashProgressionCandidates(complexBaseCandidates, scale, scaleSet, key, mode)
    ],
    fallback,
    key,
    mode,
    true,
    resolutionPlan,
    parsedProgression
  )

  if(resolutionPlan.resolutionDue) {
    const tonicSymbol = tonicResolutionSymbol(key, mode)
    const simple = pickSimpleSuggestions(simpleCandidates, 5)

    const complexUsed = new Set<string>()
    const complex = pickScoredSuggestionCategory(complexCandidates, 1, complexUsed, [
      { inKey: false, count: 1 },
      { inKey: true, count: 1 }
    ])
    appendUniqueSymbols(complex, pickTonicResolutionVariations(complexCandidates, tonicSymbol, 5 - complex.length, complexUsed), complexUsed, 5)
    appendUniqueSymbols(complex, pickByKeyStatus(complexCandidates, true, 3, complexUsed), complexUsed, 5)
    appendUniqueSymbols(complex, pickByKeyStatus(complexCandidates, false, 3, complexUsed), complexUsed, 5)

    return {
      simple,
      complex,
      debug: {
        simple: debugForSymbols(simple, simpleCandidates),
        complex: debugForSymbols(complex, complexCandidates)
      }
    }
  }

  const simple = pickSimpleSuggestions(simpleCandidates, 5)

  const complexUsed = new Set<string>()
  const complex = pickScoredSuggestionCategory(complexCandidates, 5, complexUsed, [
    { inKey: false, count: 3 },
    { inKey: true, count: 2 }
  ])

  return {
    simple,
    complex,
    debug: {
      simple: debugForSymbols(simple, simpleCandidates),
      complex: debugForSymbols(complex, complexCandidates)
    }
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
  if (stringCount === 3) return 8
  if (stringCount === 4) return 8
  if (stringCount === 5 || stringCount === 6) return 4
  return 6
}

function mergeCanonicalVoicings(generic: CandidateEntry[][], canonical: CandidateEntry[][], limit: number, stringCount: number) {
  if(stringCount >= 5 && canonical.length > 0) {
    const openPosition = generic.filter(isOpenPositionVoicing)
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
    ...firstPosition,
    ...canonical,
    ...generic
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
  const addCandidate = (candidate: ScoredVoicingCandidate | undefined) => {
    if(!candidate) return false
    result.push(candidate.v)
    return true
  }

  addCandidate(selectable[0])

  const secondPool = (zones.get(0)||[]).concat(zones.get(1)||[])
  for(const item of secondPool){
    if(result.length>=2) break
    addCandidate(item)
  }

  const zoneOrder = [1,2,3,4]
  const zonePointers: Record<number, number> = {1:0,2:0,3:0,4:0}

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

  const scored=raw.map(v=>{
    const breakdown = scoreVoicingBreakdown(v, stringCount, parsed.root, chordRequiresThird(chord), parsed.bass, chord)
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
    stringCount
  )

  return {
    chord_name:symbol,
    voicings,
    voicing_scores: voicings.map(voicing => scoreVoicingBreakdown(voicing, stringCount, parsed.root, chordRequiresThird(chord), parsed.bass, chord)),
    suggestions:getModeAwareSuggestions(symbol,key,mode),
    key_context:key,
    scale_notes:buildScaleFromMode(key, mode),
    diatonic_chords:buildDiatonicChords(key, mode),
    degree:getDegree(symbol, key),
    parsed
  }
}
