export type Fret = number | "x"

export type Quality =
  | "maj"
  | "m"
  | "7"
  | "maj7"
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

type ParsedChord = {
  root: string
  type: Quality
  bass?: string
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

function normalize(note: string): string {
  const clean = note.trim()
  const canonical = clean.charAt(0).toUpperCase() + clean.slice(1)
  const map: Record<string,string> = {
    Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#"
  }
  return map[canonical] || canonical
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

function parseCore(symbol: string): ParsedChord | null {
  const m = symbol.trim().match(/^([A-G](?:#|b)?)(.*)$/i)
  if(!m) return null

  const root = normalize(m[1])
  const tail = (m[2] || "").toLowerCase()

  if (tail.includes("m7b5")) return { root, type:"m7b5" }
  if (tail.includes("dim7")) return { root, type:"dim7" }
  if (tail.includes("dim")) return { root, type:"dim" }
  if (tail.includes("7sus2")) return { root, type:"7sus2" }
  if (tail.includes("7sus4")) return { root, type:"7sus4" }
  if (tail.includes("sus2")) return { root, type:"sus2" }
  if (tail.includes("sus4")) return { root, type:"sus4" }
  if (tail.includes("aug") || tail.includes("+")) return { root, type:"aug" }

  if (tail.includes("maj7")) return { root, type:"maj7" }
  if (tail.includes("m7")) return { root, type:"m7" }
  if (tail.includes("7")) return { root, type:"7" }

  if (tail.includes("m")) return { root, type:"m" }

  return { root, type:"maj" }
}

function hasQualityTail(symbol: string) {
  const m = symbol.trim().match(/^([A-G](?:#|b)?)(.*)$/i)
  return Boolean(m && m[2].trim().length > 0)
}

function parse(symbol: string): ParsedChord {
  const clean = symbol.trim().replace(/\s+/g, "")
  const slashParts = clean.split("/")

  if(slashParts.length === 2) {
    const left = parseCore(slashParts[0])
    const right = parseCore(slashParts[1])

    if(left && right) {
      const rightHasChordQuality = hasQualityTail(slashParts[1])
      const leftHasChordQuality = hasQualityTail(slashParts[0])

      if(rightHasChordQuality && !leftHasChordQuality) {
        return {
          ...right,
          bass: left.root
        }
      }

      return {
        ...left,
        bass: right.root
      }
    }
  }

  return parseCore(clean) || { root: "C", type: "maj" }
}

export function normalizeNote(note: string) {
  return normalize(note)
}

export function parseChordSymbol(symbol: string): ParsedChord | null {
  const clean = symbol.trim().replace(/\s+/g, "")
  if(!clean.match(/^([A-G](?:#|b)?)(.*)$/i)) return null
  if(clean.includes("/") && !clean.split("/").every(part => parseCore(part))) return null
  return parse(symbol)
}

export function normalizeChordSymbol(symbol: string) {
  const parsed = parseChordSymbol(symbol)
  if(!parsed) return symbol.trim()
  return symbolForQuality(parsed.root, parsed.type, parsed.bass)
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

function buildChord(root: string, type: Quality): ChordShape {
  if (type==="maj") return { notes:[root,add(root,4),add(root,7)], roles:["1","3","5"] }
  if (type==="m") return { notes:[root,add(root,3),add(root,7)], roles:["1","b3","5"] }

  if (type==="7") return { notes:[root,add(root,4),add(root,7),add(root,10)], roles:["1","3","5","b7"] }
  if (type==="maj7") return { notes:[root,add(root,4),add(root,7),add(root,11)], roles:["1","3","5","7"] }

  if (type==="m7") return { notes:[root,add(root,3),add(root,7),add(root,10)], roles:["1","b3","5","b7"] }

  if (type==="m7b5") return { notes:[root,add(root,3),add(root,6),add(root,10)], roles:["1","b3","b5","b7"] }
  if (type==="dim") return { notes:[root,add(root,3),add(root,6)], roles:["1","b3","b5"] }
  if (type==="dim7") return { notes:[root,add(root,3),add(root,6),add(root,9)], roles:["1","b3","b5","bb7"] }
  if (type==="sus2") return { notes:[root,add(root,2),add(root,7)], roles:["1","2","5"] }
  if (type==="sus4") return { notes:[root,add(root,5),add(root,7)], roles:["1","4","5"] }
  if (type==="7sus2") return { notes:[root,add(root,2),add(root,7),add(root,10)], roles:["1","2","5","b7"] }
  if (type==="7sus4") return { notes:[root,add(root,5),add(root,7),add(root,10)], roles:["1","4","5","b7"] }
  if (type==="aug") return { notes:[root,add(root,4),add(root,8)], roles:["1","3","#5"] }

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

export function getChordDisplayNotes(symbol: string) {
  const parsed = parse(symbol)
  const chord = buildChord(parsed.root, parsed.type)
  const chordTones = chord.notes.map((note, index) => ({
    note,
    role: chord.roles[index]
  }))

  return parsed.bass && parsed.bass !== parsed.root
    ? [
      {
        note: parsed.bass,
        role: chord.roles[chord.notes.indexOf(parsed.bass)] || roleForBassNote(parsed.root, parsed.bass)
      },
      ...chordTones
    ]
    : chordTones
}

function groups(size:number){
  const all = [
    [0,1,2],[1,2,3],[2,3,4],[3,4,5],
    [0,1,2,3],[1,2,3,4],[2,3,4,5],
    [0,1,2,3,4],[1,2,3,4,5],
    [0,1,2,3,4,5]
  ]
  return all.filter(g=>g.length===size)
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

function scoreVoicing(v:CandidateEntry[], stringCount:number, root:string, requiresThird = true, bass?: string){
  const frets=v.map(x=>x.fret)
  const fretted = frets.filter(fret => fret > 0)
  let score = 0

  score += (Math.max(...frets)-Math.min(...frets))*1.7
  if(stringCount === 3 || stringCount === 4) {
    score += (frets.reduce((sum, fret) => sum + fret, 0) / frets.length) * 1.2
  }
  if(fretted.length > 1) {
    score += (Math.max(...fretted)-Math.min(...fretted))*2.4
  }
  score += positionCoherencePenalty(v, stringCount)

  const lowest = lowestPlayedString(v)
  if(bass) {
    score += lowest.note === bass ? -18 : 90
    if(lowest.note === bass && lowest.string <= 1) score -= 5
  }

  const isFirstPosition = Math.min(...frets) <= 3 && Math.max(...frets) <= 4
  if(stringCount >= 5 && isOpenPositionVoicing(v)) {
    const openStringCount = frets.filter(fret => fret === 0).length
    score -= 8 + openStringCount * 1.5
  }
  if(isFirstPosition && lowest.note === root) {
    score -= lowest.fret === 0 ? 14 : 7
  }

  const hasThird = v.some(x=>x.role==="3"||x.role==="b3")
  if(requiresThird && !hasThird) score += 100

  const counts: Record<string, number> = {}
  for (const n of v) {
    counts[n.note] = (counts[n.note] || 0) + 1
  }
  for (const c of Object.values(counts)) {
    if (c > 1) score += (c - 1) * 2
  }

  score += stringGroupPreferenceScore(v, stringCount)

  return score
}

function generate(chord:ChordShape,size:number,bass?: string){
  const res:CandidateEntry[][]=[]

  for(const g of groups(size)){
    const options=g.map(s=>{
      const arr:CandidateEntry[]=[]
      for(let f=0;f<=15;f++){
        const n=fretNote(TUNING[s],f)
        const i=chord.notes.indexOf(n)
        if(i>=0){
          arr.push({string:s,fret:f,note:n,role:chord.roles[i]})
        }
      }
      return arr
    })

    function build(i:number,curr:CandidateEntry[]){
      if(i===options.length){
        const hasRequiredBass = !bass || lowestPlayedString(curr).note === bass
        if(hasRequiredBass && containsDefiningTone(curr, chord) && isPlayableStretch(curr) && !(size >= 5 && hasSplitPositionCluster(curr))) res.push(curr)
        return
      }
      for(const o of options[i]){
        build(i+1,[...curr,o])
      }
    }

    build(0,[])
  }

  return res
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

const DEGREE_LABELS = ["I","bII","II","bIII","III","IV","#IV","V","bVI","VI","bVII","VII"]

export function buildScaleFromMode(key:string, mode:string){
  const intervals = MODES[mode] || MODES["Ionian"]
  return intervals.map(i => add(key, i))
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

  return buildDiatonicChords(key, mode).filter(ch => !ch.startsWith(root))
}

const QUALITY_SUFFIX: Record<Quality, string> = {
  maj: "",
  m: "m",
  "7": "7",
  maj7: "maj7",
  m7: "m7",
  m7b5: "m7b5",
  dim: "dim",
  dim7: "dim7",
  sus2: "sus2",
  sus4: "sus4",
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
}

function symbolForQuality(root: string, type: Quality, bass?: string) {
  const cleanBass = bass ? normalize(bass) : undefined
  const suffix = QUALITY_SUFFIX[type]
  return cleanBass && cleanBass !== normalize(root)
    ? `${root}${suffix}/${cleanBass}`
    : `${root}${suffix}`
}

function parseProgressionSymbols(symbols: string[]) {
  return symbols
    .map(symbol => {
      const clean = symbol.trim()
      if(!clean) return null
      const parsed = parse(clean)
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
  return notes.every(note => scaleSet.has(note))
}

function isDominantQuality(type: Quality) {
  return type === "7" || type === "7sus2" || type === "7sus4" || type === "maj" || type === "maj7" || type === "aug"
}

function isDiminishedQuality(type: Quality) {
  return type === "dim" || type === "dim7" || type === "m7b5"
}

function scaleDegreeForRoot(root: string, scale: string[]) {
  return scale.indexOf(normalize(root))
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
  if(!inKey && root === add(targetRoot, 7) && isDominantQuality(type)) return "secondaryDominant"
  if(!inKey && root === add(targetRoot, -1) && isDiminishedQuality(type)) return "leadingTone"
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
  const scale = buildScaleFromMode(key, mode)
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
  const scale = buildScaleFromMode(key, mode)
  const scaleSet = new Set(scale)
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

      if(last.notes.includes(leadingTone)) scores[degree] += scaleSet.has(leadingTone) ? 16 : 38
      if(last.notes.includes(upperNeighbor)) scores[degree] += 10
      if(last.parsed.root === add(targetRoot, 7)) scores[degree] += 14
    }
  }

  for(let degree = 0; degree < scale.length; degree++) {
    scores[degree] -= (rootCounts.get(scale[degree]) || 0) * 3
  }

  return scores
}

function qualityWeight(type: Quality, complex: boolean) {
  if(type === "maj") return complex ? 8 : 12
  if(type === "m") return 8
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

  if(candidate.notes.includes(leadingTone)) score += scaleSet.has(leadingTone) ? 14 : 36
  if(candidate.notes.includes(upperNeighbor)) score += 10
  if(candidate.root === add(targetRoot, 7)) score += candidate.type === "7" || candidate.type === "7sus2" || candidate.type === "7sus4" ? 24 : 20
  if(candidate.type === "aug") score += 10

  const targetDegree = scaleDegreeForRoot(targetRoot, scale)
  if(targetDegree >= 0) score += targetDegree === 0 ? 4 : 0

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
  score += scaleSet.has(candidate.bass) ? 6 : -8

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
  const cleanSymbol = symbolForQuality(parsed.root, parsed.type, parsed.bass)
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
  scaleSet: Set<string>
) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()

  for(const candidate of baseCandidates) {
    const bassOptions = [
      ...candidate.notes,
      candidate.targetRoot
    ].filter((note, index, arr) => {
      return note !== candidate.root && arr.indexOf(note) === index && (scaleSet.has(note) || note === candidate.targetRoot)
    })

    for(const bass of bassOptions) {
      addCandidate(
        candidates,
        seen,
        symbolForQuality(candidate.root, candidate.type, bass),
        candidate.targetRoot,
        scale,
        scaleSet
      )
    }
  }

  return candidates
}

function buildDiatonicProgressionCandidates(scale: string[], scaleSet: Set<string>, mode: string, complex: boolean) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()
  const diatonic = buildDiatonicChords(scale[0], mode)

  for(const symbol of diatonic) {
    const parsed = parse(symbol)
    const qualities: Quality[] = parsed.type === "maj"
      ? ["maj", "maj7", "7", "sus2", "sus4"]
      : parsed.type === "m"
        ? ["m", "m7", "sus2", "sus4"]
        : ["dim", "m7b5"]

    for(const quality of qualities) {
      const nextSymbol = symbolForQuality(parsed.root, quality)
      const notes = chordNotesForSymbol(nextSymbol)
      if(isInKeyNotes(notes, scaleSet)) {
        addCandidate(candidates, seen, nextSymbol, parsed.root, scale, scaleSet)
      }
    }

    if(complex) {
      for(const quality of ["sus2", "sus4"] as Quality[]) {
        const nextSymbol = symbolForQuality(parsed.root, quality)
        const notes = chordNotesForSymbol(nextSymbol)
        if(isInKeyNotes(notes, scaleSet)) {
          addCandidate(candidates, seen, nextSymbol, parsed.root, scale, scaleSet)
        }
      }
    }
  }

  return candidates
}

function buildChromaticProgressionCandidates(scale: string[], scaleSet: Set<string>, complex: boolean) {
  const candidates: ProgressionSuggestionCandidate[] = []
  const seen = new Set<string>()

  for(const targetRoot of scale) {
    const dominantRoot = add(targetRoot, 7)
    const leadingRoot = add(targetRoot, -1)
    const lowerNeighborRoot = add(targetRoot, -2)

    const dominantQualities: Quality[] = complex ? ["maj", "7", "maj7", "7sus2", "7sus4"] : ["maj", "7"]
    for(const quality of dominantQualities) {
      addCandidate(candidates, seen, symbolForQuality(dominantRoot, quality), targetRoot, scale, scaleSet)
    }

    if(complex) {
      for(const quality of ["dim", "dim7"] as Quality[]) {
        addCandidate(candidates, seen, symbolForQuality(leadingRoot, quality), targetRoot, scale, scaleSet)
      }
      addCandidate(candidates, seen, symbolForQuality(dominantRoot, "aug"), targetRoot, scale, scaleSet)
      addCandidate(candidates, seen, symbolForQuality(targetRoot, "aug"), targetRoot, scale, scaleSet)
    }

    addCandidate(candidates, seen, symbolForQuality(lowerNeighborRoot, "maj"), targetRoot, scale, scaleSet)
  }

  return candidates.filter(candidate => !candidate.inKey)
}

function scoreProgressionCandidates(
  candidates: ProgressionSuggestionCandidate[],
  progression: ReturnType<typeof parseProgressionSymbols>,
  key: string,
  mode: string,
  complex: boolean,
  resolutionPlan: ResolutionPlan
) {
  const scale = buildScaleFromMode(key, mode)
  const targetScores = progressionTargetScores(progression, key, mode)
  const scaleSet = new Set(scale)
  const last = progression[progression.length - 1]
  const recentSymbols = progression.slice(-3).map(item => item.symbol)
  const recentRoots = progression.slice(-3).map(item => item.parsed.root)

  return candidates.map(candidate => {
    const targetDegree = scaleDegreeForRoot(candidate.targetRoot, scale)
    const rootDegree = scaleDegreeForRoot(candidate.root, scale)
    let score = targetDegree >= 0 ? targetScores[targetDegree] : 12

    score += qualityWeight(candidate.type, complex)
    score += last ? voiceLeadingScore(last.notes, candidate.notes) : 0

    if(candidate.inKey && rootDegree >= 0) score += targetScores[rootDegree] * 0.45
    if(!candidate.inKey) score += leadingTonePullScore(candidate, scale, new Set(scale))
    score += resolutionIntentScore(candidate, resolutionPlan, scale)
    score += phrasePositionScore(candidate, resolutionPlan)
    score += bassMotionScore(candidate, progression, scaleSet, resolutionPlan)

    if(last && candidate.root === last.parsed.root && candidate.type !== last.parsed.type) {
      score += candidate.inKey ? 4 : 18
    }

    if(recentSymbols.includes(candidate.symbol)) score -= 34
    if(recentRoots.includes(candidate.root)) score -= candidate.inKey ? 6 : 3
    if(last && candidate.symbol === last.symbol) score -= 60

    return {
      ...candidate,
      score
    }
  }).sort((a, b) => {
    if(b.score !== a.score) return b.score - a.score
    if(a.targetRoot !== b.targetRoot) return idx(a.targetRoot) - idx(b.targetRoot)
    if(Boolean(a.bass) !== Boolean(b.bass)) return a.bass ? 1 : -1
    return a.symbol.localeCompare(b.symbol)
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

  return candidates
    .filter(candidate => {
      if(used.has(candidate.symbol) || candidate.symbol === tonicSymbol) return false
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
  const scaleSet = new Set(scale)
  const resolutionPlan = buildResolutionPlan(parsedProgression.length, key, mode, resolveWithin)
  const simpleBaseCandidates = [
    ...buildDiatonicProgressionCandidates(scale, scaleSet, mode, false),
    ...buildChromaticProgressionCandidates(scale, scaleSet, false)
  ]
  const complexBaseCandidates = [
    ...buildDiatonicProgressionCandidates(scale, scaleSet, mode, true),
    ...buildChromaticProgressionCandidates(scale, scaleSet, true)
  ]

  const simpleCandidates = scoreProgressionCandidates(
    simpleBaseCandidates,
    fallback,
    key,
    mode,
    false,
    resolutionPlan
  )

  const complexCandidates = scoreProgressionCandidates(
    [
      ...complexBaseCandidates,
      ...buildSlashProgressionCandidates(complexBaseCandidates, scale, scaleSet)
    ],
    fallback,
    key,
    mode,
    true,
    resolutionPlan
  )

  if(resolutionPlan.resolutionDue) {
    const tonicSymbol = tonicResolutionSymbol(key, mode)
    const simpleUsed = new Set<string>([tonicSymbol])
    const simple = [tonicSymbol]

    simple.push(...pickByKeyStatus(simpleCandidates, true, 2, simpleUsed).slice(0, Math.max(0, 5 - simple.length)))
    simple.push(...pickByKeyStatus(simpleCandidates, false, 3, simpleUsed).slice(0, Math.max(0, 5 - simple.length)))

    const complexUsed = new Set(simple)
    const complex = pickTonicResolutionVariations(complexCandidates, tonicSymbol, 5, complexUsed)
    for(const symbol of complex) complexUsed.add(symbol)
    complex.push(...pickByKeyStatus(complexCandidates, true, 3, complexUsed).slice(0, Math.max(0, 5 - complex.length)))
    complex.push(...pickByKeyStatus(complexCandidates, false, 3, complexUsed).slice(0, Math.max(0, 5 - complex.length)))

    return {
      simple,
      complex
    }
  }

  const simpleUsed = new Set<string>()
  const simple = [
    ...pickByKeyStatus(simpleCandidates, true, 2, simpleUsed),
    ...pickByKeyStatus(simpleCandidates, false, 3, simpleUsed)
  ]

  const complexUsed = new Set(simple)
  const complex = [
    ...pickByKeyStatus(complexCandidates, false, 3, complexUsed),
    ...pickByKeyStatus(complexCandidates, true, 2, complexUsed)
  ]

  return {
    simple,
    complex
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

  const scored=raw.map(v=>({
    v,
    pos:positionMetric(v),
    score:scoreVoicing(v, stringCount, parsed.root, chordRequiresThird(chord), parsed.bass)
  }))
  .sort((a,b)=>{
    if(stringCount === 3 || stringCount === 4) {
      if(a.score!==b.score) return a.score-b.score
      return a.pos.min-b.pos.min
    }
    if(a.pos.min!==b.pos.min) return a.pos.min-b.pos.min
    return a.score-b.score
  })

  const zones = new Map<number, typeof scored>()

  for(const item of scored){
    const z=getZone(item.pos.min)
    if(!zones.has(z)) zones.set(z,[])
    zones.get(z)!.push(item)
  }

  for(const arr of zones.values()){
    arr.sort((a,b)=>a.score-b.score)
  }

  const result:CandidateEntry[][] = []

  if(scored.length) result.push(scored[0].v)

  const secondPool = (zones.get(0)||[]).concat(zones.get(1)||[])
  for(const item of secondPool){
    if(result.length>=2) break
    result.push(item.v)
  }

  const zoneOrder = [1,2,3,4]
  const zonePointers: Record<number, number> = {1:0,2:0,3:0,4:0}

  const voicingLimit = voicingLimitForStringCount(stringCount)

  while(result.length < voicingLimit){
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

        result.push(candidate.v)
        added = true
        break
      }

      if(result.length >= voicingLimit) break
    }

    if(!added) break
  }

  const voicings = mergeCanonicalVoicings(
    dedupe(result),
    parsed.bass ? [] : canonicalBarreVoicings(chord, parsed.root, parsed.type, stringCount),
    voicingLimit,
    stringCount
  )

  return {
    chord_name:symbol,
    voicings,
    suggestions:getModeAwareSuggestions(symbol,key,mode),
    key_context:key,
    scale_notes:buildScaleFromMode(key, mode),
    diatonic_chords:buildDiatonicChords(key, mode),
    degree:getDegree(symbol, key),
    parsed
  }
}
