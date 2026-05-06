'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import {
  analyzeChord,
  buildDiatonicChords,
  buildProgressionSuggestions,
  buildScaleFromMode,
  canNameChord,
  getChordRoot,
  getChordDisplayNotes,
  getFretNote,
  getNoteIndex,
  inferChordSymbol,
  normalizeNote,
  normalizeChordSymbol,
  parseChordSymbol,
  smartStringCountForChord,
  spellNoteForKey,
  type Fret,
  type Quality
} from '@/app/lib/chordEngine'
import {
  pickGlobalStar,
  presentSuggestionCategory,
  type SuggestionDebugItem
} from '@/app/lib/suggestionPresentation'
import {
  buildPatternTimeline,
  getChordEndDelay,
  getStringSpan,
  AUDIO_STRUM_PATTERN_OPTIONS,
  AUDIO_STRUM_PATTERN_SPEEDS,
  AUDIO_STRUM_PATTERNS,
  type AudioDirection,
  type AudioSpeed,
  type AudioStrumPattern,
  type AudioPlaybackMode,
  type ScheduledAudioEvent
} from '@/app/lib/strumTimeline'

const STRINGS: string[] = ["E", "A", "D", "G", "B", "E"]
const STRING_NO: number[] = [6, 5, 4, 3, 2, 1]
const STRING_COUNTS = [3, 4, 5, 6]
const RESOLVE_WITHIN_OPTIONS = [2, 3, 4, 5, 6, 7, 8]
const KEY_OPTIONS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const MODE_OPTIONS = [
  { value: "Ionian", label: "Ionian (Major)" },
  { value: "Aeolian", label: "Aeolian (Minor)" },
  { value: "Dorian", label: "Dorian" },
  { value: "Phrygian", label: "Phrygian" },
  { value: "Lydian", label: "Lydian" },
  { value: "Mixolydian", label: "Mixolydian" },
  { value: "Locrian", label: "Locrian" }
]
const MODE_DETAILS: Record<string, { title: string; lines: string[] }> = {
  Ionian: {
    title: "Ionian (Major)",
    lines: ["Intervals: 1 2 3 4 5 6 7", "Sound: stable major tonic.", "Common use: bright keys and resolved cadences."]
  },
  Aeolian: {
    title: "Aeolian (Minor)",
    lines: ["Intervals: 1 2 b3 4 5 b6 b7", "Sound: natural minor.", "Common use: minor-key progressions."]
  },
  Dorian: {
    title: "Dorian",
    lines: ["Intervals: 1 2 b3 4 5 6 b7", "Sound: minor with a lifted 6.", "Common use: modal grooves and ii-color."]
  },
  Phrygian: {
    title: "Phrygian",
    lines: ["Intervals: 1 b2 b3 4 5 b6 b7", "Sound: dark minor with b2 pull.", "Common use: tense modal movement."]
  },
  Lydian: {
    title: "Lydian",
    lines: ["Intervals: 1 2 3 #4 5 6 7", "Sound: major with floating #4.", "Common use: bright tonic color."]
  },
  Mixolydian: {
    title: "Mixolydian",
    lines: ["Intervals: 1 2 3 4 5 6 b7", "Sound: major with dominant color.", "Common use: V and blues-rock movement."]
  },
  Locrian: {
    title: "Locrian",
    lines: ["Intervals: 1 b2 b3 4 b5 b6 b7", "Sound: unstable diminished tonic.", "Common use: half-diminished tension."]
  }
}
const DISPLAY_FRETS = 19
const FRET_RANGE = Array.from({ length: DISPLAY_FRETS }, (_, fret) => fret)
const FRETBOARD_GRID = `80px 48px repeat(${DISPLAY_FRETS - 1}, minmax(42px, 1fr))`
const FRETBOARD_HEADER_HEIGHT = 33
const FRETBOARD_NUMBER_BAR_HEIGHT = 20
const FRETBOARD_ADD_BUTTON_HEIGHT = FRETBOARD_NUMBER_BAR_HEIGHT
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]
const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const AUDIO_SPEED_OPTIONS = ["quick", "tight", "easy", "slow"] as const
const AUDIO_NOTE_LENGTH_SECONDS: Record<AudioSpeed, number> = {
  quick: 0.92,
  tight: 1.05,
  easy: 1.18,
  slow: 1.34
}
const AUDIO_MIN_CHORD_DELAY_MS: Record<AudioSpeed, number> = {
  quick: 250,
  tight: 330,
  easy: 430,
  slow: 560
}
const AUDIO_CHORD_MODE_DURATION_MS: Record<AudioSpeed, number> = {
  quick: 760,
  tight: 960,
  easy: 1180,
  slow: 1460
}
const AUDIO_SAFETY_OFFSET_SECONDS = 0.012
const AUDIO_REPEAT_OPTIONS = [1, 2, 3, 4]
const GUITAR_SAMPLE_BASE_URL = "/audio/guitar-acoustic/"
const GUITAR_SAMPLE_URLS = {
  E2: "E2.mp3",
  G2: "G2.mp3",
  A2: "A2.mp3",
  B2: "B2.mp3",
  D3: "D3.mp3",
  E3: "E3.mp3",
  G3: "G3.mp3",
  A3: "A3.mp3",
  B3: "B3.mp3",
  D4: "D4.mp3",
  E4: "E4.mp3",
  G4: "G4.mp3",
  A4: "A4.mp3",
  B4: "B4.mp3",
  D5: "D5.mp3"
}

type ProgressionItem = {
  chord: string
  strings: number
  voicingIndex: number
  customVoicing?: VoicingItem[]
  customVoicingIndex?: number
}

type VoicingItem = {
  string: number
  fret: Fret
  note: string
  role: string
}

type AudioNote = {
  label: string
  note: string
  stringNo: number
  stringIndex: number
  fret: number
  id: string
}

type ChordToneBubble = {
  note: string
  role: string
  id: string
  isFlashing: boolean
}

type DetailTooltip = {
  x: number
  y: number
  title: string
  lines: string[]
}

type ToneEngine = {
  Tone: typeof import("tone")
  sampler: import("tone").Sampler
  gain: import("tone").Gain
  filter: import("tone").Filter
  delay: import("tone").FeedbackDelay
  reverb: import("tone").Reverb
}

function romanForQuality(roman: string, quality: Quality) {
  if(quality === "m" || quality === "m7" || quality === "m9" || quality === "m11" || quality === "m7b5") {
    return roman.toLowerCase()
  }

  if(quality === "dim" || quality === "dim7") {
    return roman.toLowerCase()
  }

  return roman
}

function qualityDegreeSuffix(quality: Quality) {
  const suffixes: Record<Quality, string> = {
    maj: "",
    m: "",
    "7": "7",
    "7b5": "7\u266d5",
    "7#5": "7#5",
    "7b9": "7\u266d9",
    "7#9": "7#9",
    maj7: "\u03947",
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
    m7: "7",
    m7b5: "\u00f87",
    dim: "\u00b0",
    dim7: "\u00b07",
    sus2: "sus2",
    sus4: "sus4",
    "7sus2": "7sus2",
    "7sus4": "7sus4",
    aug: "+"
  }

  return suffixes[quality]
}

function getDegree(chord:string, key:string){
  const parsed = parseChordSymbol(chord)
  if(!parsed) return null

  const rootIdx = getNoteIndex(parsed.root)
  const keyIdx = getNoteIndex(key)
  if(rootIdx < 0 || keyIdx < 0) return null

  const diff = (rootIdx - keyIdx + 12) % 12

  const MAP: Record<number, string> = {
    0:"I",
    1:"\u266dII",
    2:"II",
    3:"\u266dIII",
    4:"III",
    5:"IV",
    6:"\u266fIV",
    7:"V",
    8:"\u266dVI",
    9:"VI",
    10:"\u266dVII",
    11:"VII"
  }

  const roman = romanForQuality(MAP[diff], parsed.type)
  const bassIdx = parsed.bass ? getNoteIndex(parsed.bass) : -1
  const bassDegree = bassIdx >= 0 && parsed.bass !== parsed.root
    ? `/${MAP[(bassIdx - keyIdx + 12) % 12]}`
    : ""

  return `${roman}${qualityDegreeSuffix(parsed.type)}${bassDegree}`
}

const COLORS = [
  "bg-[#c95e50]",
  "bg-[#c87c45]",
  "bg-[#c99443]",
  "bg-[#b9a852]",
  "bg-[#98ad5b]",
  "bg-[#70aa65]",
  "bg-[#519d78]",
  "bg-[#459596]",
  "bg-[#5685a8]",
  "bg-[#6b73aa]",
  "bg-[#8e6fa0]",
  "bg-[#b76888]"
]

function chordColor(chord:string, key:string){
  const root = getChordRoot(chord)
  if(!root) return COLORS[0]

  const rootIdx = getNoteIndex(root)
  const keyIdx = getNoteIndex(key)
  if(rootIdx < 0 || keyIdx < 0) return COLORS[0]

  const diff = (rootIdx - keyIdx + 12) % 12

  return COLORS[diff]
}

function chordDisplayName(chord: string) {
  return normalizeChordSymbol(chord)
}

function contextVoicingForSmartSelection(item: ProgressionItem | null | undefined, key = "C", mode = "Ionian") {
  if(!item) return undefined

  const numericCustom = item.customVoicing
    ?.map(entry => typeof entry.fret === "number"
      ? {
        string: entry.string,
        fret: entry.fret,
        note: entry.note,
        role: entry.role
      }
      : null
    )
    .filter((entry): entry is { string: number; fret: number; note: string; role: string } => Boolean(entry))

  if(numericCustom?.length) return numericCustom

  const analysis = analyzeChord({
    symbol: item.chord,
    stringCount: item.strings,
    key,
    mode
  })
  const safeIndex = analysis.voicings.length > 0
    ? Math.min(item.voicingIndex ?? 0, analysis.voicings.length - 1)
    : 0

  return analysis.voicings[safeIndex]
}

function defaultStringCountForChord(
  chord: string,
  key = "C",
  mode = "Ionian",
  previousItem?: ProgressionItem | null
) {
  if(!parseChordSymbol(chord)) return 4

  return smartStringCountForChord({
    symbol: chord,
    key,
    mode,
    previousStringCount: previousItem?.strings,
    previousChord: previousItem?.chord,
    previousVoicing: contextVoicingForSmartSelection(previousItem, key, mode)
  })
}

function noteColor(note:string, key:string){
  const idx = getNoteIndex(note)
  const keyIdx = getNoteIndex(key)
  if(idx < 0 || keyIdx < 0) return COLORS[0]

  const diff = (idx - keyIdx + 12) % 12
  return COLORS[diff]
}

function noteDisplayName(note: string, key: string, mode: string) {
  return spellNoteForKey(note, key, mode)
}

function stringThickness(stringIndex: number) {
  return `${7 - stringIndex}px`
}

function midiToToneNote(midi: number) {
  const name = MIDI_NOTE_NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

function audioNoteId(stringIndex: number, fret: number) {
  return `${stringIndex}:${fret}`
}

function voicingAudioNotes(voicing: VoicingItem[] | undefined, direction: AudioDirection): AudioNote[] {
  if(!voicing) return []

  return [...voicing]
    .filter((entry) => typeof entry.fret === "number")
    .sort((a, b) => direction === "down" ? a.string - b.string : b.string - a.string)
    .map((entry) => {
      const fret = typeof entry.fret === "number" ? entry.fret : 0
      return {
        label: entry.note,
        note: midiToToneNote(OPEN_STRING_MIDI[entry.string] + fret),
        stringNo: STRING_NO[entry.string],
        stringIndex: entry.string,
        fret,
        id: audioNoteId(entry.string, fret)
      }
    })
}

function chordPlaybackVelocity(index: number) {
  const firstStringAccent = index === 0 ? 0.07 : 0
  return Math.max(0.48, Math.min(0.86, 0.76 + firstStringAccent - index * 0.035))
}

function stableStringHash(input: string) {
  let hash = 2166136261
  for(let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number) {
  let value = seed || 1
  return function nextRandom() {
    value ^= value << 13
    value ^= value >>> 17
    value ^= value << 5
    return ((value >>> 0) % 1000000) / 1000000
  }
}

function strumPatternLabel(pattern: AudioStrumPattern) {
  return pattern
}

function strumPatternTitle(pattern: AudioStrumPattern) {
  const titles: Record<AudioStrumPattern, string> = {
    P1: "Single downstroke",
    P2: "Down then up",
    P3: "Two downstrokes",
    P4: "Bass then chord"
  }

  return titles[pattern]
}

function PlayMark({ paused = false, large = false }: { paused?: boolean; large?: boolean }) {
  const wrapperSize = large ? "h-9 w-9" : "h-5 w-5"

  if(paused) {
    return (
      <span className={`flex ${wrapperSize} items-center justify-center gap-1.5`} aria-hidden="true">
        <span className={`${large ? "h-9 w-3" : "h-5 w-2"} rounded-full bg-current`} />
        <span className={`${large ? "h-9 w-3" : "h-5 w-2"} rounded-full bg-current`} />
      </span>
    )
  }

  return (
    <span className={`relative ${wrapperSize}`} aria-hidden="true">
      <span className={`${large ? "left-1 top-0 h-9 w-8" : "left-1 top-0 h-5 w-4"} absolute rounded-r-full bg-current [clip-path:polygon(0_0,100%_50%,0_100%)]`} />
    </span>
  )
}

export default function Home() {
  const [key, setKey] = useState("C")
  const [mode, setMode] = useState("Ionian")
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const [progression, setProgression] = useState<ProgressionItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const [voicings, setVoicings] = useState<VoicingItem[][]>([])
  const [voicingIndex, setVoicingIndex] = useState(0)
  const [draftVoicing, setDraftVoicing] = useState<VoicingItem[]>([])
  const [draggedNote, setDraggedNote] = useState<VoicingItem | null>(null)
  const [draggedMutedString, setDraggedMutedString] = useState<number | null>(null)
  const [detailTooltip, setDetailTooltip] = useState<DetailTooltip | null>(null)

  const [inputChord, setInputChord] = useState("")
  const [inputStrings, setInputStrings] = useState(4)
  const [resolveWithin, setResolveWithin] = useState(4)
  const [showAllNotes, setShowAllNotes] = useState(false)
  const [highlightScale, setHighlightScale] = useState(false)
  const [highlightChordNotes, setHighlightChordNotes] = useState(false)
  const audioDirection: AudioDirection = "down"
  const [audioSpeed, setAudioSpeed] = useState<AudioSpeed>("tight")
  const [audioRepeats, setAudioRepeats] = useState(1)
  const [audioStrumPattern, setAudioStrumPattern] = useState<AudioStrumPattern>("P1")
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [isProgressionPlaying, setIsProgressionPlaying] = useState(false)
  const [isProgressionLooping, setIsProgressionLooping] = useState(true)
  const [progressionPlayIndex, setProgressionPlayIndex] = useState<number | null>(null)
  const [flashingNoteIds, setFlashingNoteIds] = useState<Set<string>>(() => new Set())
  const audioSpeedRef = useRef<AudioSpeed>("tight")
  const audioRepeatsRef = useRef(1)
  const audioStrumPatternRef = useRef<AudioStrumPattern>("P1")
  const progressionRef = useRef<ProgressionItem[]>([])
  const audioEngineRef = useRef<ToneEngine | null>(null)
  const audioEnginePromiseRef = useRef<Promise<ToneEngine> | null>(null)
  const audioWarmPromiseRef = useRef<Promise<ToneEngine | null> | null>(null)
  const audioReadyRef = useRef(false)
  const audioPlaybackRequestRef = useRef(0)
  const audioWarmEngineRef = useRef<(() => Promise<ToneEngine | null>) | null>(null)
  const activePlaybackNotesRef = useRef<string[]>([])
  const activePlaybackUntilRef = useRef(0)
  const activePlaybackClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteFlashTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const flashingNoteCountsRef = useRef<Map<string, number>>(new Map())
  const progressionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressionPlayingRef = useRef(false)
  const progressionLoopingRef = useRef(true)

  function sortVoicingByString(voicing: VoicingItem[]) {
    return [...voicing].sort((a, b) => a.string - b.string)
  }

  function voicingPositionKey(voicing: VoicingItem[]) {
    return JSON.stringify(sortVoicingByString(voicing).map(entry => [entry.string, entry.fret]))
  }

  function getPinnedCustomVoicing(item: ProgressionItem | null | undefined) {
    if(!item?.customVoicing || item.customVoicing.length !== item.strings) return undefined
    return item.customVoicing
  }

  function progressionVoicingsForItem(item: ProgressionItem) {
    const res = analyzeChord({
      symbol: item.chord,
      stringCount: item.strings,
      key,
      mode
    })

    let nextVoicings = (res.voicings || []) as VoicingItem[][]
    const customVoicing = getPinnedCustomVoicing(item)

    if (customVoicing) {
      const customVoicingKey = voicingPositionKey(customVoicing)
      nextVoicings = nextVoicings.filter(voicing =>
        voicingPositionKey(voicing) !== customVoicingKey
      )

      const insertionIndex = Math.max(
        0,
        Math.min(item.customVoicingIndex ?? item.voicingIndex ?? 0, nextVoicings.length)
      )
      nextVoicings.splice(insertionIndex, 0, customVoicing)
    }

    return nextVoicings
  }

  function safeVoicingIndexForItem(item: ProgressionItem, itemVoicings: VoicingItem[][]) {
    return itemVoicings.length > 0
      ? Math.min(item.voicingIndex ?? 0, itemVoicings.length - 1)
      : 0
  }

  function roleMapForChord(chord: string) {
    const roles = new Map<string, string>()

    for(const tone of getChordDisplayNotes(chord)) {
      const note = normalizeNote(tone.note)
      if(!roles.has(note) || roles.get(note) === "8") {
        roles.set(note, tone.role === "8" ? "1" : tone.role)
      }
    }

    return roles
  }

  function applyChordRoles(voicing: VoicingItem[], chord: string) {
    const roles = roleMapForChord(chord)
    return sortVoicingByString(voicing).map(entry => ({
      ...entry,
      role: roles.get(normalizeNote(entry.note)) ?? entry.role
    }))
  }

  function dragPreviewClass(preview: "allowed" | "forbidden", placement: "fret" | "string") {
    return `drag-preview drag-preview-${placement} drag-preview-${preview}`
  }

  function computeVoicings(item: ProgressionItem) {
    const nextVoicings = progressionVoicingsForItem(item)
    setVoicings(nextVoicings)
    setVoicingIndex(safeVoicingIndexForItem(item, nextVoicings))
  }

  function getCurrentVoicing(item: ProgressionItem) {
    return voicings[voicingIndex] ?? getPinnedCustomVoicing(item)
  }

  function inferChordFromVoicing(newVoicing: VoicingItem[]) {
    return inferChordSymbol(newVoicing.map(entry => entry.note), key, mode)
  }

  function distinctChordToneCount(newVoicing: VoicingItem[]) {
    return new Set(newVoicing.map(entry => normalizeNote(entry.note))).size
  }

  /**
   * Validates that a voicing:
   * 1. Has at least 3 note markers
   * 2. Includes at least 3 distinct chord tones
   * 3. Can be named as a valid chord
   */
  function canApplyVoicing(newVoicing: VoicingItem[]) {
    if (newVoicing.length < 3) return false
    if (distinctChordToneCount(newVoicing) < 3) return false
    return canNameChord(newVoicing.map(entry => entry.note), key, mode)
  }

  function namedChordFromVoicing(newVoicing: VoicingItem[]) {
    if(!canApplyVoicing(newVoicing)) return null
    return inferChordFromVoicing(newVoicing)
  }

  function isDraftFretboardActive() {
    return selectedIndex === null
  }

  function currentEditableVoicing() {
    if(isDraftFretboardActive()) return draftVoicing
    if(!current) return []
    return getCurrentVoicing(current) ?? []
  }

  function updateDraftVoicing(newVoicing: VoicingItem[]) {
    setDraftVoicing(sortVoicingByString(newVoicing))
  }

  function updateCustomVoicing(newVoicing: VoicingItem[]) {
    if (selectedIndex === null) return
    const inferredChord = inferChordFromVoicing(newVoicing)
    if (!inferredChord) return

    const normalizedVoicing = applyChordRoles(newVoicing, inferredChord)
    const nextStringCount = normalizedVoicing.length
    const next = [...progression]
    const currentItem = next[selectedIndex]
    const originalIndex = Math.max(0, currentItem.customVoicingIndex ?? currentItem.voicingIndex)

    next[selectedIndex] = {
      ...currentItem,
      chord: inferredChord,
      strings: nextStringCount,
      customVoicing: normalizedVoicing,
      customVoicingIndex: originalIndex,
      voicingIndex: originalIndex
    }

    progressionRef.current = next
    setProgression(next)
    setInputChord(inferredChord)
    setInputStrings(nextStringCount)
    computeVoicings(next[selectedIndex])
  }

  function getFretPreviewState(targetString: number, targetFret: number) {
    const currentVoicing = currentEditableVoicing()

    if (draggedNote) {
      if (draggedNote.string === targetString && draggedNote.fret === targetFret) return
      const targetHasNote = draggedNote.string !== targetString && currentVoicing.some(entry => entry.string === targetString)
      if (targetHasNote) return "forbidden"

      const targetNote = getFretNote(STRINGS[targetString], targetFret)
      const updatedVoicing = currentVoicing.filter(entry => entry.string !== draggedNote.string)
      updatedVoicing.push({
        string: targetString,
        fret: targetFret,
        note: targetNote,
        role: draggedNote.role
      })

      if(isDraftFretboardActive()) return "allowed"

      if (updatedVoicing.length < 3) return "forbidden"

      return canApplyVoicing(updatedVoicing) ? "allowed" : "forbidden"
    }

    if (draggedMutedString !== null) {
      if (draggedMutedString !== targetString) return "forbidden"
      const targetHasNote = currentVoicing.some(entry => entry.string === targetString)
      if (targetHasNote) return "forbidden"

      const targetNote = getFretNote(STRINGS[targetString], targetFret)
      const updatedVoicing = [...currentVoicing]
      updatedVoicing.push({
        string: targetString,
        fret: targetFret,
        note: targetNote,
        role: "1"
      })

      if(isDraftFretboardActive()) return "allowed"

      if (updatedVoicing.length < 3) return "forbidden"

      return canApplyVoicing(updatedVoicing) ? "allowed" : "forbidden"
    }
  }

  function getStringPreviewState(targetString: number) {
    if (!draggedNote) return
    if (draggedNote.string !== targetString) return
    const currentVoicing = currentEditableVoicing()

    const updatedVoicing = currentVoicing.filter(entry => entry.string !== draggedNote.string)
    if(isDraftFretboardActive()) return "allowed"
    if (updatedVoicing.length < 3 || distinctChordToneCount(updatedVoicing) < 3) return "forbidden"
    return canApplyVoicing(updatedVoicing) ? "allowed" : "forbidden"
  }

  function handleDragStartNote(note: VoicingItem, event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("application/json", JSON.stringify(note))
    // Create a custom drag image to prevent the default semi-transparent look
    const dragImage = event.target as HTMLElement
    event.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2)
    setDraggedNote(note)
  }

  function handleDragStartMuted(stringIndex: number, event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("application/json", JSON.stringify({ type: "muted", string: stringIndex }))
    // Create a custom drag image to prevent the default semi-transparent look
    const dragImage = event.target as HTMLElement
    event.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2)
    setDraggedMutedString(stringIndex)
  }

  function handleDragEndNote() {
    setDraggedNote(null)
  }

  function handleDragEndMuted() {
    setDraggedMutedString(null)
  }

  function handleDropOnFret(targetString: number, targetFret: number) {
    if (!draggedNote) return
    const currentVoicing = currentEditableVoicing()
    if (draggedNote.string === targetString && draggedNote.fret === targetFret) {
      setDraggedNote(null)
      return
    }

    // Check if target string already has a note (only if it's a different string)
    const targetHasNote = draggedNote.string !== targetString && currentVoicing.some(entry => entry.string === targetString)
    if (targetHasNote) {
      setDraggedNote(null)
      return
    }

    const targetNote = getFretNote(STRINGS[targetString], targetFret)
    const updatedVoicing = currentVoicing
      .filter(entry => entry.string !== draggedNote.string)

    updatedVoicing.push({
      string: targetString,
      fret: targetFret,
      note: targetNote,
      role: draggedNote.role
    })

    updatedVoicing.sort((a, b) => a.string - b.string)
    if (isDraftFretboardActive()) {
      updateDraftVoicing(updatedVoicing)
    } else if (canApplyVoicing(updatedVoicing)) {
      updateCustomVoicing(updatedVoicing)
    }
    setDraggedNote(null)
  }

  function handleDropOnString(targetString: number) {
    if (!draggedNote) return
    if (draggedNote.string !== targetString) {
      setDraggedNote(null)
      return
    }

    const currentVoicing = currentEditableVoicing()

    const updatedVoicing = currentVoicing.filter(entry => entry.string !== draggedNote.string)
    if (!isDraftFretboardActive() && (updatedVoicing.length < 3 || distinctChordToneCount(updatedVoicing) < 3)) {
      setDraggedNote(null)
      return
    }

    updatedVoicing.sort((a, b) => a.string - b.string)
    if (isDraftFretboardActive()) {
      updateDraftVoicing(updatedVoicing)
    } else if (canApplyVoicing(updatedVoicing)) {
      updateCustomVoicing(updatedVoicing)
    }
    setDraggedNote(null)
  }

  function handleDropMutedOnFret(targetString: number, targetFret: number) {
    if (draggedMutedString === null) return
    const currentVoicing = currentEditableVoicing()

    if (draggedMutedString !== targetString) {
      setDraggedMutedString(null)
      return
    }

    const targetHasNote = currentVoicing.some(entry => entry.string === targetString)
    if (targetHasNote) {
      setDraggedMutedString(null)
      return
    }

    const targetNote = getFretNote(STRINGS[targetString], targetFret)
    const updatedVoicing = [...currentVoicing]

    updatedVoicing.push({
      string: targetString,
      fret: targetFret,
      note: targetNote,
      role: "1"
    })

    updatedVoicing.sort((a, b) => a.string - b.string)
    if (isDraftFretboardActive()) {
      updateDraftVoicing(updatedVoicing)
    } else if (canApplyVoicing(updatedVoicing)) {
      updateCustomVoicing(updatedVoicing)
    }
    setDraggedMutedString(null)
  }

  function showProgressionItem(index: number, item: ProgressionItem) {
    setDraftVoicing([])
    setSelectedIndex(index)
    setInputChord(item.chord)
    setInputStrings(item.strings)
    setVoicingIndex(item.voicingIndex ?? 0)
    computeVoicings(item)
  }

  const keyChords = useMemo(() => {
    return buildDiatonicChords(key, mode)
  }, [key, mode])

  const progressionSuggestions = useMemo(() => {
    return buildProgressionSuggestions({
      progression: progression.map(item => item.chord),
      key,
      mode,
      resolveWithin
    })
  }, [progression, key, mode, resolveWithin])
  const suggestionPresentation = useMemo(() => {
    const suggestionSeed = stableStringHash(JSON.stringify({
      key,
      mode,
      resolveWithin,
      progression: progression.map(item => item.chord),
      simple: progressionSuggestions.simple,
      complex: progressionSuggestions.complex,
      keyChords
    }))
    const rng = seededRandom(suggestionSeed)
    const debugItems = [
      ...(progressionSuggestions.debug?.simple ?? []),
      ...(progressionSuggestions.debug?.complex ?? [])
    ] as SuggestionDebugItem[]
    const context = debugItems[0]?.context ?? null
    const keyCategory = presentSuggestionCategory({
      symbols: keyChords,
      debugItems,
      context,
      rng
    })
    const simpleCategory = presentSuggestionCategory({
      symbols: progressionSuggestions.simple,
      debugItems: progressionSuggestions.debug?.simple ?? [],
      context,
      rng
    })
    const complexCategory = presentSuggestionCategory({
      symbols: progressionSuggestions.complex,
      debugItems: progressionSuggestions.debug?.complex ?? [],
      context,
      rng
    })
    const star = pickGlobalStar({
      simpleSymbol: simpleCategory.highlightedSymbol,
      complexSymbol: complexCategory.highlightedSymbol,
      debugItems,
      context,
      rng
    })

    return {
      debugItems,
      keyCategory,
      simpleCategory,
      complexCategory,
      star
    }
  }, [key, mode, progression, resolveWithin, keyChords, progressionSuggestions])

  function shouldShowSuggestionStar(category: "simple" | "complex", symbol: string, index: number) {
    return suggestionPresentation.star.category === category &&
      suggestionPresentation.star.symbol === symbol &&
      index === 0
  }

  function suggestionTitle(symbol: string) {
    return `Add ${chordDisplayName(symbol)}`
  }

  function openDetailTooltip(event: MouseEvent<HTMLElement>, detail: Omit<DetailTooltip, "x" | "y">) {
    event.preventDefault()
    const x = Math.max(12, Math.min(event.clientX + 10, window.innerWidth - 332))
    const y = Math.max(12, Math.min(event.clientY + 10, window.innerHeight - 220))
    setDetailTooltip({
      ...detail,
      x,
      y
    })
  }

  function openModeDetail(event: MouseEvent<HTMLButtonElement>, modeValue: string) {
    const detail = MODE_DETAILS[modeValue]
    if(!detail) return
    openDetailTooltip(event, detail)
  }

  function suggestionDetail(symbol: string, category: "key" | "simple" | "complex") {
    const display = chordDisplayName(symbol)
    const degree = getDegree(symbol, key)
    const notes = getChordDisplayNotes(symbol, key, mode).map(item => item.note).join(" ")
    const debug = suggestionPresentation.debugItems.find((item) => item.symbol === symbol) as
      | (SuggestionDebugItem & {
        role?: string
        family?: string
        resolvesTo?: { targetRoot?: string }
      })
      | undefined
    const lines = [
      degree ? `Degree: ${degree}` : null,
      notes ? `Notes: ${notes}` : null,
      debug?.role ? `Function: ${debug.role}` : category === "key" ? `In-key chord for ${key} ${mode}` : null,
      debug?.family ? `Source: ${debug.family}` : null,
      debug?.resolvesTo?.targetRoot ? `Resolution target: ${spellNoteForKey(debug.resolvesTo.targetRoot, key, mode)}` : null,
      debug ? `Score: ${debug.score.toFixed(1)}` : null
    ].filter((line): line is string => Boolean(line))

    return {
      title: display,
      lines
    }
  }

  function openSuggestionDetail(
    event: MouseEvent<HTMLButtonElement>,
    symbol: string,
    category: "key" | "simple" | "complex"
  ) {
    openDetailTooltip(event, suggestionDetail(symbol, category))
  }

  function selectChord(idx: number) {
    const item = progression[idx]
    if (!item) return

    if (selectedIndex === idx) {
      setSelectedIndex(null)
      setInputChord("")
      setVoicings([])
      setVoicingIndex(0)
      setDraftVoicing([])
      return
    }

    showProgressionItem(idx, item)
  }

  function updateChord(val: string) {
    setInputChord(val)
    if (selectedIndex === null) return
    if(!parseChordSymbol(val.trim())) return

    const previousItem = selectedIndex > 0 ? progression[selectedIndex - 1] : null
    const defaultStrings = defaultStringCountForChord(val, key, mode, previousItem)
    const next = [...progression]
    next[selectedIndex] = {
      ...next[selectedIndex],
      chord: val,
      strings: defaultStrings,
      voicingIndex: 0,
      customVoicing: undefined,
      customVoicingIndex: undefined
    }
    progressionRef.current = next
    setProgression(next)
    setInputStrings(defaultStrings)
    computeVoicings(next[selectedIndex])
  }

  function normalizeCurrentInputChord() {
    const clean = inputChord.trim()
    if(!clean) return

    const chord = normalizeChordSymbol(clean)
    if(chord === inputChord) return

    setInputChord(chord)
    if(selectedIndex === null) return

    const previousItem = selectedIndex > 0 ? progression[selectedIndex - 1] : null
    const defaultStrings = defaultStringCountForChord(chord, key, mode, previousItem)
    const next = [...progression]
    next[selectedIndex] = {
      ...next[selectedIndex],
      chord,
      strings: defaultStrings,
      voicingIndex: 0,
      customVoicing: undefined,
      customVoicingIndex: undefined
    }
    progressionRef.current = next
    setProgression(next)
    setInputStrings(defaultStrings)
    computeVoicings(next[selectedIndex])
  }

  function updateStrings(val: number) {
    setInputStrings(val)
    if (selectedIndex === null) return

    const next = [...progression]
    next[selectedIndex] = {
      ...next[selectedIndex],
      strings: val,
      voicingIndex: 0,
      customVoicing: undefined,
      customVoicingIndex: undefined
    }
    progressionRef.current = next
    setProgression(next)
    computeVoicings(next[selectedIndex])
  }

  function stepStrings(direction: -1 | 1) {
    const currentIndex = STRING_COUNTS.indexOf(inputStrings)
    const safeIndex = currentIndex >= 0 ? currentIndex : 1
    const nextIndex = Math.max(0, Math.min(STRING_COUNTS.length - 1, safeIndex + direction))
    updateStrings(STRING_COUNTS[nextIndex])
  }

  function stepResolveWithin(direction: -1 | 1) {
    const currentIndex = RESOLVE_WITHIN_OPTIONS.indexOf(resolveWithin)
    const safeIndex = currentIndex >= 0 ? currentIndex : 2
    const nextIndex = Math.max(0, Math.min(RESOLVE_WITHIN_OPTIONS.length - 1, safeIndex + direction))
    setResolveWithin(RESOLVE_WITHIN_OPTIONS[nextIndex])
  }

  function stepAudioRepeats(direction: -1 | 1) {
    const currentIndex = AUDIO_REPEAT_OPTIONS.indexOf(audioRepeats)
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = Math.max(0, Math.min(AUDIO_REPEAT_OPTIONS.length - 1, safeIndex + direction))
    setAudioRepeats(AUDIO_REPEAT_OPTIONS[nextIndex])
  }

  function stepAudioStrumPattern(direction: -1 | 1) {
    const currentIndex = AUDIO_STRUM_PATTERN_OPTIONS.indexOf(audioStrumPattern)
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = Math.max(0, Math.min(AUDIO_STRUM_PATTERN_OPTIONS.length - 1, safeIndex + direction))
    setAudioStrumPattern(AUDIO_STRUM_PATTERN_OPTIONS[nextIndex])
  }

  function cycleAudioSpeed() {
    setAudioSpeed((current) => {
      const currentIndex = AUDIO_SPEED_OPTIONS.indexOf(current)
      return AUDIO_SPEED_OPTIONS[(currentIndex + 1) % AUDIO_SPEED_OPTIONS.length]
    })
  }

  function addChord() {
    const clean = inputChord.trim()
    if (!clean) return
    if(!parseChordSymbol(clean)) return
    const chord = normalizeChordSymbol(clean)
    const previousItem = progression[progression.length - 1] ?? null
    const defaultStrings = defaultStringCountForChord(chord, key, mode, previousItem)

    const next = [...progression, { chord, strings: defaultStrings, voicingIndex: 0 }]
    progressionRef.current = next
    setProgression(next)

    const i = next.length - 1
    setSelectedIndex(i)
    setDraftVoicing([])
    setInputChord(chord)
    setInputStrings(defaultStrings)
    setVoicingIndex(0)
    computeVoicings(next[i])
    if(progressionPlayingRef.current && progressionPlayIndex === null) {
      setProgressionPlayIndex(i)
    }
  }

  function addSuggestion(chord: string) {
    const previousItem = progression[progression.length - 1] ?? null
    const defaultStrings = defaultStringCountForChord(chord, key, mode, previousItem)
    const next = [...progression, { chord, strings: defaultStrings, voicingIndex: 0 }]
    progressionRef.current = next
    setProgression(next)

    const i = next.length - 1
    setSelectedIndex(i)
    setDraftVoicing([])
    setInputChord(chord)
    setInputStrings(defaultStrings)
    setVoicingIndex(0)
    computeVoicings(next[i])
  }

  function addFretboardChord() {
    if(current) {
      const nextItem: ProgressionItem = {
        chord: current.chord,
        strings: current.strings,
        voicingIndex
      }
      const next = [...progression, nextItem]
      progressionRef.current = next
      setProgression(next)

      const i = next.length - 1
      setSelectedIndex(i)
      setDraftVoicing([])
      setInputChord(nextItem.chord)
      setInputStrings(nextItem.strings)
      setVoicingIndex(nextItem.voicingIndex)
      computeVoicings(next[i])
      return
    }

    const inferredChord = namedChordFromVoicing(draftVoicing)
    if(!inferredChord) return

    const normalizedVoicing = applyChordRoles(draftVoicing, inferredChord)
    const nextItem: ProgressionItem = {
      chord: inferredChord,
      strings: normalizedVoicing.length,
      voicingIndex: 0,
      customVoicing: normalizedVoicing,
      customVoicingIndex: 0
    }
    const next = [...progression, nextItem]
    progressionRef.current = next
    setProgression(next)

    const i = next.length - 1
    setSelectedIndex(i)
    setDraftVoicing([])
    setInputChord(inferredChord)
    setInputStrings(nextItem.strings)
    setVoicingIndex(0)
    computeVoicings(next[i])
  }

  function removeChord(index: number) {
    const next = [...progression]
    next.splice(index, 1)
    progressionRef.current = next
    setProgression(next)
    if(next.length === 0) stopProgressionAudio()

    if(selectedIndex === index) {
      setSelectedIndex(null)
      setInputChord("")
      setVoicings([])
      setVoicingIndex(0)
      setDraftVoicing([])
    } else if(selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  function moveChord(index: number, direction: -1 | 1) {
    const target = index + direction
    if(target < 0 || target >= progression.length) return

    const next = [...progression]
    ;[next[target], next[index]] = [next[index], next[target]]
    progressionRef.current = next
    setProgression(next)
    setSelectedIndex(target)
    setDraftVoicing([])
    setInputChord(next[target].chord)
    setInputStrings(next[target].strings)
    computeVoicings(next[target])
  }

  function updateVoicingIndex(nextIndex: number) {
    if(voicings.length === 0) return

    const safeIndex = Math.max(0, Math.min(voicings.length - 1, nextIndex))
    setVoicingIndex(safeIndex)

    if (selectedIndex !== null && progression[selectedIndex]) {
      const next = [...progression]
      next[selectedIndex] = {
        ...next[selectedIndex],
        voicingIndex: safeIndex
      }
      progressionRef.current = next
      setProgression(next)
    }
  }

  async function ensureAudioEngine() {
    if(audioEngineRef.current?.sampler.loaded) return audioEngineRef.current
    if(audioEnginePromiseRef.current) return audioEnginePromiseRef.current

    audioEnginePromiseRef.current = (async () => {
      const Tone = await import("tone")

      const gain = new Tone.Gain(0.64).toDestination()
      const reverb = new Tone.Reverb(1.25).connect(gain)
      reverb.wet.value = 0.09

      const delay = new Tone.FeedbackDelay(0.045, 0.08).connect(reverb)
      delay.wet.value = 0.055

      const filter = new Tone.Filter(3450, "lowpass")
      filter.connect(gain)
      filter.connect(delay)
      const sampler = new Tone.Sampler({
        urls: GUITAR_SAMPLE_URLS,
        baseUrl: GUITAR_SAMPLE_BASE_URL,
        attack: 0.002,
        release: 0.42,
        curve: "exponential",
        onerror: (error) => {
          console.error("Guitar sample load failed", error)
        }
      }).connect(filter)

      const engine: ToneEngine = {
        Tone,
        sampler,
        gain,
        filter,
        delay,
        reverb
      }

      try {
        await Tone.loaded()
      } catch(error) {
        sampler.dispose()
        filter.dispose()
        delay.dispose()
        reverb.dispose()
        gain.dispose()
        audioEngineRef.current = null
        audioReadyRef.current = false
        throw error
      }

      audioEngineRef.current = engine
      audioEnginePromiseRef.current = null
      return engine
    })()

    return audioEnginePromiseRef.current
  }

  function applyAudioTone(engine: ToneEngine) {
    engine.filter.frequency.value = 3450
    engine.gain.gain.value = 0.64
  }

  async function prepareAudioEngine() {
    const readyEngine = audioEngineRef.current
    if(audioReadyRef.current && readyEngine?.sampler.loaded) {
      applyAudioTone(readyEngine)
      return readyEngine
    }

    const engine = await ensureAudioEngine().catch((error) => {
      console.error("Audio engine failed to start", error)
      audioEnginePromiseRef.current = null
      audioWarmPromiseRef.current = null
      audioReadyRef.current = false
      return null
    })
    if(!engine?.sampler.loaded) return null

    await engine.Tone.start()
    applyAudioTone(engine)
    audioReadyRef.current = true
    return engine
  }

  function warmAudioEngine() {
    const readyEngine = audioEngineRef.current
    if(audioReadyRef.current && readyEngine?.sampler.loaded) return Promise.resolve(readyEngine)
    if(audioWarmPromiseRef.current) return audioWarmPromiseRef.current

    audioWarmPromiseRef.current = prepareAudioEngine().catch((error) => {
      console.error("Audio engine warmup failed", error)
      audioWarmPromiseRef.current = null
      audioReadyRef.current = false
      return null
    })
    return audioWarmPromiseRef.current
  }

  function buildChordPlaybackEvents(notes: AudioNote[], speed: AudioSpeed): ScheduledAudioEvent<AudioNote>[] {
    const noteLength = AUDIO_NOTE_LENGTH_SECONDS[speed]

    return notes.map((note, index) => ({
      note,
      duration: noteLength,
      timeOffset: 0,
      velocity: chordPlaybackVelocity(index)
    }))
  }

  function buildStrumPlaybackEvents(
    notes: AudioNote[],
    speed: AudioSpeed,
    pattern: AudioStrumPattern
  ) {
    const orderedNotes = [...notes].sort((a, b) => a.stringIndex - b.stringIndex)
    const span = getStringSpan(orderedNotes)

    return buildPatternTimeline<AudioNote>(AUDIO_STRUM_PATTERNS[pattern], orderedNotes, speed, span, {
      patternTempo: AUDIO_STRUM_PATTERN_SPEEDS[pattern]
    })
  }

  function buildPlaybackEvents(
    notes: AudioNote[],
    mode: AudioPlaybackMode,
    speed: AudioSpeed
  ) {
    if(mode === "chord") {
      return {
        events: buildChordPlaybackEvents(notes, speed),
        durationMs: AUDIO_CHORD_MODE_DURATION_MS[speed]
      }
    }

    const timeline = buildStrumPlaybackEvents(notes, speed, audioStrumPatternRef.current)

    return {
      events: timeline.events,
      durationMs: getChordEndDelay(timeline.patternEndMs, AUDIO_MIN_CHORD_DELAY_MS[speed])
    }
  }

  function clearNoteFlashes() {
    noteFlashTimeoutsRef.current.forEach(clearTimeout)
    noteFlashTimeoutsRef.current = []
    flashingNoteCountsRef.current.clear()
    setFlashingNoteIds(new Set())
  }

  function flashAudioNotes(events: ScheduledAudioEvent<AudioNote>[]) {
    const flashDuration = 210
    events.forEach((event) => {
      const delay = AUDIO_SAFETY_OFFSET_SECONDS * 1000 + event.timeOffset * 1000
      const startTimeout = setTimeout(() => {
        const counts = flashingNoteCountsRef.current
        counts.set(event.note.id, (counts.get(event.note.id) ?? 0) + 1)
        setFlashingNoteIds((current) => {
          const next = new Set(current)
          next.add(event.note.id)
          return next
        })

        const endTimeout = setTimeout(() => {
          const counts = flashingNoteCountsRef.current
          const nextCount = Math.max(0, (counts.get(event.note.id) ?? 1) - 1)
          if(nextCount === 0) {
            counts.delete(event.note.id)
          } else {
            counts.set(event.note.id, nextCount)
          }

          setFlashingNoteIds((current) => {
            if(nextCount > 0) return current
            const next = new Set(current)
            next.delete(event.note.id)
            return next
          })
        }, flashDuration)
        noteFlashTimeoutsRef.current.push(endTimeout)
      }, delay)

      noteFlashTimeoutsRef.current.push(startTimeout)
    })
  }

  function finishAudioAfter(ms: number) {
    if(audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current)
    setIsAudioPlaying(true)
    audioTimeoutRef.current = setTimeout(() => setIsAudioPlaying(false), ms)
  }

  function clearActivePlaybackTracking() {
    activePlaybackNotesRef.current = []
    activePlaybackUntilRef.current = 0
    if(activePlaybackClearTimeoutRef.current) clearTimeout(activePlaybackClearTimeoutRef.current)
    activePlaybackClearTimeoutRef.current = null
  }

  function releaseActivePlaybackIfNeeded(engine: ToneEngine, audioNow: number) {
    const activeNotes = [...new Set(activePlaybackNotesRef.current)]
    if(activeNotes.length === 0 || audioNow >= activePlaybackUntilRef.current) {
      clearActivePlaybackTracking()
      return
    }

    engine.sampler.triggerRelease(activeNotes, audioNow)
    clearActivePlaybackTracking()
  }

  function trackActivePlayback(engine: ToneEngine, events: ScheduledAudioEvent<AudioNote>[], startTime: number) {
    const latestEventEnd = events.reduce(
      (latest, event) => Math.max(latest, startTime + event.timeOffset + event.duration),
      startTime
    )
    activePlaybackNotesRef.current = [...new Set(events.map((event) => event.note.note))]
    activePlaybackUntilRef.current = latestEventEnd
    if(activePlaybackClearTimeoutRef.current) clearTimeout(activePlaybackClearTimeoutRef.current)
    activePlaybackClearTimeoutRef.current = setTimeout(() => {
      if(engine.Tone.now() >= activePlaybackUntilRef.current) {
        clearActivePlaybackTracking()
      }
    }, Math.max(0, (activePlaybackUntilRef.current - engine.Tone.now()) * 1000 + 50))
  }

  async function playAudioNotes(notes: AudioNote[], mode: "strum" | "chord") {
    if(notes.length === 0) return 0
    const playbackRequest = ++audioPlaybackRequestRef.current
    const engine = await warmAudioEngine()
    if(!engine) return 0
    if(playbackRequest !== audioPlaybackRequestRef.current) return 0

    const speed = audioSpeedRef.current
    const playback = buildPlaybackEvents(notes, mode, speed)
    if(playback.events.length === 0) return 0
    const audioNow = engine.Tone.now()
    const stableAudioTime = audioNow + AUDIO_SAFETY_OFFSET_SECONDS
    releaseActivePlaybackIfNeeded(engine, audioNow)
    clearNoteFlashes()
    flashAudioNotes(playback.events)

    playback.events.forEach((event) => {
      engine.sampler.triggerAttackRelease(
        event.note.note,
        event.duration,
        stableAudioTime + event.timeOffset,
        event.velocity
      )
    })
    trackActivePlayback(engine, playback.events, stableAudioTime)

    return playback.durationMs + AUDIO_SAFETY_OFFSET_SECONDS * 1000
  }

  async function playVoicingAudio(mode: "strum" | "chord") {
    if(audioNotes.length === 0) return
    setIsAudioPlaying(true)
    const duration = await playAudioNotes(audioNotes, mode)
    if(duration > 0) {
      finishAudioAfter(duration)
      return
    }
    setIsAudioPlaying(false)
  }

  function audioNotesForProgressionItem(item: ProgressionItem) {
    const itemVoicings = progressionVoicingsForItem(item)
    const safeIndex = safeVoicingIndexForItem(item, itemVoicings)

    return voicingAudioNotes(itemVoicings[safeIndex], audioDirection)
  }

  function stopProgressionAudio() {
    audioPlaybackRequestRef.current += 1
    progressionPlayingRef.current = false
    if(progressionTimeoutRef.current) clearTimeout(progressionTimeoutRef.current)
    progressionTimeoutRef.current = null
    audioEngineRef.current?.sampler.releaseAll()
    clearActivePlaybackTracking()
    clearNoteFlashes()
    setIsProgressionPlaying(false)
    setProgressionPlayIndex(null)
  }

  async function playProgressionFrom(startIndex = 0) {
    if(progressionRef.current.length === 0) return
    if(progressionTimeoutRef.current) clearTimeout(progressionTimeoutRef.current)
    progressionTimeoutRef.current = null
    progressionPlayingRef.current = true
    setIsProgressionPlaying(true)

    const engine = await warmAudioEngine()
    if(!engine) {
      stopProgressionAudio()
      return
    }
    if(!progressionPlayingRef.current) return

    let index = startIndex
    let repeatsDone = 0
    const playNext = async () => {
      if(!progressionPlayingRef.current) return
      const currentProgression = progressionRef.current

      if(currentProgression.length === 0) {
        stopProgressionAudio()
        return
      }

      if(index >= currentProgression.length) {
        if(!progressionLoopingRef.current) {
          stopProgressionAudio()
          return
        }
        index = 0
      }

      setProgressionPlayIndex(index)
      const currentItem = currentProgression[index]
      showProgressionItem(index, currentItem)
      const notes = audioNotesForProgressionItem(currentItem)
      const duration = await playAudioNotes(notes, "strum")
      if(duration <= 0) {
        stopProgressionAudio()
        return
      }
      repeatsDone += 1
      if(repeatsDone >= audioRepeatsRef.current) {
        repeatsDone = 0
        index += 1
      }
      progressionTimeoutRef.current = setTimeout(() => void playNext(), duration)
    }

    void playNext()
  }

  function toggleProgressionAudio() {
    if(progressionPlayingRef.current) {
      stopProgressionAudio()
      return
    }

    void playProgressionFrom(selectedIndex ?? progressionPlayIndex ?? 0)
  }

  function toggleProgressionLoop() {
    const next = !isProgressionLooping
    progressionLoopingRef.current = next
    setIsProgressionLooping(next)
    if(progressionPlayingRef.current && progressionPlayIndex !== null) {
      const item = progressionRef.current[progressionPlayIndex]
      if(item) showProgressionItem(progressionPlayIndex, item)
    }
  }

  const current = selectedIndex !== null ? progression[selectedIndex] ?? null : null
  const v = voicings[voicingIndex] ?? getPinnedCustomVoicing(current)
  const draftNamedChord = namedChordFromVoicing(draftVoicing)
  const fretboardVoicing = current
    ? v
    : draftNamedChord
      ? applyChordRoles(draftVoicing, draftNamedChord)
      : draftVoicing
  const fretboardChord = current?.chord ?? draftNamedChord
  const canAddFretboardChord = current
    ? Boolean(parseChordSymbol(current.chord))
    : Boolean(draftNamedChord)
  const fretboardAddTooltip = current
    ? "Add chord"
    : draftVoicing.length < 3 || distinctChordToneCount(draftVoicing) < 3
      ? "Need 3 notes"
      : draftNamedChord
        ? "Add chord"
        : "Not nameable"
  const canAddChord = Boolean(parseChordSymbol(inputChord.trim()))
  const canResolveBackward = resolveWithin > RESOLVE_WITHIN_OPTIONS[0]
  const canResolveForward = resolveWithin < RESOLVE_WITHIN_OPTIONS[RESOLVE_WITHIN_OPTIONS.length - 1]
  const canRepeatLess = audioRepeats > AUDIO_REPEAT_OPTIONS[0]
  const canRepeatMore = audioRepeats < AUDIO_REPEAT_OPTIONS[AUDIO_REPEAT_OPTIONS.length - 1]
  const canPatternLess = audioStrumPattern !== AUDIO_STRUM_PATTERN_OPTIONS[0]
  const canPatternMore = audioStrumPattern !== AUDIO_STRUM_PATTERN_OPTIONS[AUDIO_STRUM_PATTERN_OPTIONS.length - 1]
  const canStepStringsBackward = inputStrings > STRING_COUNTS[0]
  const canStepStringsForward = inputStrings < STRING_COUNTS[STRING_COUNTS.length - 1]
  const canStepVoicingBackward = voicingIndex > 0
  const canStepVoicingForward = voicings.length > 0 && voicingIndex < voicings.length - 1
  const audioNotes = voicingAudioNotes(fretboardVoicing, audioDirection)
  const canPlayProgression = progression.length > 0
  const isDarkTheme = theme === "dark"
  const chordToneNotes: ChordToneBubble[] = useMemo(() => {
    const activeSymbol = current?.chord ?? draftNamedChord
    const symbolNotes = activeSymbol ? getChordDisplayNotes(activeSymbol, key, mode) : []
    const fallbackCustomVoicing = current ? getPinnedCustomVoicing(current) : draftVoicing
    const fallbackVoicingNotes = fallbackCustomVoicing
      ? fallbackCustomVoicing.map((entry) => ({ note: entry.note, role: entry.role }))
      : []
    const flashingVoicingNotes = new Set(
      (fretboardVoicing || [])
        .filter((entry) => {
          const fret = typeof entry.fret === "number" ? entry.fret : 0
          return flashingNoteIds.has(audioNoteId(entry.string, fret))
        })
        .map((entry) => normalizeNote(entry.note))
    )

    const displayNotes = symbolNotes.length ? symbolNotes : fallbackVoicingNotes

    return displayNotes.map((item, index) => ({
      note: item.note,
      role: item.role,
      id: `${item.note}:${item.role}:${index}`,
      isFlashing: flashingVoicingNotes.has(normalizeNote(item.note))
    }))
  }, [current, fretboardVoicing, draftNamedChord, draftVoicing, flashingNoteIds, key, mode])
  const chordNotes = useMemo(() => {
    return new Set(chordToneNotes.map(item => normalizeNote(item.note)))
  }, [chordToneNotes])
  const scaleNotes = useMemo(() => {
    return new Set(buildScaleFromMode(key, mode).map(note => normalizeNote(note)))
  }, [key, mode])

  useEffect(() => {
    progressionLoopingRef.current = isProgressionLooping
  }, [isProgressionLooping])

  useEffect(() => {
    progressionRef.current = progression
  }, [progression])

  useEffect(() => {
    audioSpeedRef.current = audioSpeed
  }, [audioSpeed])

  useEffect(() => {
    audioRepeatsRef.current = audioRepeats
  }, [audioRepeats])

  useEffect(() => {
    audioStrumPatternRef.current = audioStrumPattern
  }, [audioStrumPattern])

  useEffect(() => {
    audioWarmEngineRef.current = warmAudioEngine
  })

  useEffect(() => {
    void ensureAudioEngine().catch((error) => {
      console.error("Audio engine prewarm failed", error)
      audioEnginePromiseRef.current = null
    })
  }, [])

  useEffect(() => {
    let didWarm = false
    const prewarmOnInteraction = () => {
      if(didWarm) return
      didWarm = true
      void audioWarmEngineRef.current?.().catch((error) => {
        console.error("Audio engine interaction prewarm failed", error)
        audioWarmPromiseRef.current = null
      })
    }

    window.addEventListener("pointerdown", prewarmOnInteraction, { capture: true, passive: true, once: true })
    window.addEventListener("touchstart", prewarmOnInteraction, { capture: true, passive: true, once: true })
    window.addEventListener("keydown", prewarmOnInteraction, { capture: true, once: true })
    return () => {
      window.removeEventListener("pointerdown", prewarmOnInteraction, true)
      window.removeEventListener("touchstart", prewarmOnInteraction, true)
      window.removeEventListener("keydown", prewarmOnInteraction, true)
    }
  }, [])

  useEffect(() => {
    if(!detailTooltip) return

    const close = () => setDetailTooltip(null)
    const closeOnEscape = (event: KeyboardEvent) => {
      if(event.key === "Escape") close()
    }

    window.addEventListener("click", close)
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      window.removeEventListener("click", close)
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [detailTooltip])

  useEffect(() => {
    return () => {
      audioPlaybackRequestRef.current += 1
      if(audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current)
      if(progressionTimeoutRef.current) clearTimeout(progressionTimeoutRef.current)
      noteFlashTimeoutsRef.current.forEach(clearTimeout)
      clearActivePlaybackTracking()
      audioWarmPromiseRef.current = null
      audioReadyRef.current = false
      const engine = audioEngineRef.current
      if(!engine) return

      engine.sampler.dispose()
      engine.filter.dispose()
      engine.delay.dispose()
      engine.reverb.dispose()
      engine.gain.dispose()
    }
  }, [])

  return (
    <main data-theme={theme} className="app-shell min-h-screen bg-[var(--background)] text-[var(--foreground)] p-3 space-y-3 transition-colors">
      {detailTooltip && (
        <div
          className="detail-tooltip"
          style={{ left: detailTooltip.x, top: detailTooltip.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="detail-tooltip-title">{detailTooltip.title}</div>
          <div className="detail-tooltip-body">
            {detailTooltip.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>
      )}

      <div className="top-layout grid grid-cols-1 xl:grid-cols-[540px_minmax(0,1fr)] gap-3">
        <div className="surface-panel flex h-full flex-col gap-4 p-4">
          <div className="surface-inset flex flex-1 flex-col p-4">
            <div className="mb-3 flex items-center">
              <span className="label-text text-base font-black tracking-wide">Key</span>
            </div>
            <div className="key-grid grid grid-cols-6 gap-2">
              {KEY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setKey(option)}
                  aria-pressed={key === option}
                  title={`Key ${option}`}
                  className={`min-h-10 rounded-2xl border px-3 py-2 text-sm font-black transition ${
                    key === option
                      ? "choice-button-active"
                      : "choice-button hover:brightness-95"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-inset flex flex-1 flex-col p-4">
            <div className="mb-3 flex items-center">
              <span className="label-text text-base font-black tracking-wide">Mode</span>
            </div>
            <div className="mode-grid grid grid-cols-8 gap-2">
              {MODE_OPTIONS.map((option, i) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  onContextMenu={(event) => openModeDetail(event, option.value)}
                  aria-pressed={mode === option.value}
                  title={`Mode ${option.label}`}
                  className={`mode-button ${i === 4 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl border px-3 py-2 text-sm font-black transition ${
                    mode === option.value
                      ? "choice-button-active"
                      : "choice-button hover:brightness-95"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-inset flex items-center justify-between gap-4 p-4">
            <div>
              <div className="label-text text-base font-black tracking-wide">Theme</div>
              <div className="mt-1 text-sm font-extrabold text-[var(--ink)]">
                {isDarkTheme ? "Dark" : "Light"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
              aria-pressed={isDarkTheme}
              aria-label={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
              title="Theme"
              className="theme-switch"
            >
              <span className="theme-switch-label">Light</span>
              <span className="theme-switch-track" aria-hidden="true">
                <span className="theme-switch-knob" />
              </span>
              <span className="theme-switch-label">Dark</span>
            </button>
          </div>
        </div>

        <div className="surface-panel min-w-0 space-y-3 p-4">
          <div className="label-text flex justify-between text-sm font-extrabold">
            <span>Progression</span>
          </div>

          <div className="progression-scroll max-w-full overflow-x-auto overflow-y-hidden pl-7 pr-9 pt-8 pb-6">
          <div className="flex h-[118px] w-max items-start gap-4 pr-4">
            {progression.map((c, i) => {
  const degree = getDegree(c.chord, key)
  const chordLabel = chordDisplayName(c.chord)
  const canMoveLeft = i > 0
  const canMoveRight = i < progression.length - 1
  const isPlayingChord = isProgressionPlaying && i === progressionPlayIndex
  const startsPhraseGroup = i > 0 && i % resolveWithin === 0

  return (
    <div key={i} className={`flex flex-col items-center gap-2 ${startsPhraseGroup ? "border-l border-[var(--line)]/55 pl-5" : ""}`}>

      <div className="relative">
        <button
          type="button"
          className={`has-tooltip relative px-6 py-3 text-xl font-extrabold rounded-full border-2 border-[var(--ink)] shadow cursor-pointer flex items-center gap-3 transition ${chordColor(c.chord, key)} ${i === selectedIndex ? "ring-4 ring-[var(--ink)]/70" : ""} ${isPlayingChord ? "scale-110 brightness-125 ring-4 ring-[#fff8ec] shadow-[0_0_24px_rgba(255,248,236,0.95)]" : ""}`}
          onClick={() => selectChord(i)}
          aria-pressed={i === selectedIndex}
          aria-label={`Select ${chordLabel}`}
          data-tooltip={i === selectedIndex ? "Close" : "Edit"}
        >
          <span className="text-xl tracking-tight">{chordLabel}</span>

          {degree && (
            <span className="degree-badge text-base font-extrabold rounded-full px-4 py-1 shadow-sm">
              {degree}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            removeChord(i)
          }}
          aria-label={`Remove ${chordLabel}`}
          data-tooltip="Remove"
          className="has-tooltip degree-badge absolute -top-2 -right-2 w-7 h-7 text-sm rounded-full flex items-center justify-center shadow hover:brightness-110"
        >
          {"\u00d7"}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => moveChord(i, -1)}
          disabled={!canMoveLeft}
          aria-label={`Move ${chordLabel} left`}
          data-tooltip="Move left"
          className={`has-tooltip control-button h-10 min-w-10 text-sm font-bold px-3 py-2 rounded-full ${canMoveLeft ? "" : "button-disabled"}`}
        >
          {"\u2190"}
        </button>

        <button
          type="button"
          onClick={() => moveChord(i, 1)}
          disabled={!canMoveRight}
          aria-label={`Move ${chordLabel} right`}
          data-tooltip="Move right"
          className={`has-tooltip control-button h-10 min-w-10 text-sm font-bold px-3 py-2 rounded-full ${canMoveRight ? "" : "button-disabled"}`}
        >
          {"\u2192"}
        </button>
      </div>

    </div>
  )
})}
          </div>
          </div>

          <div className="progression-controls flex flex-wrap items-end gap-4">
            <div>
              <div className="label-text text-sm font-extrabold mb-2">Add Chord</div>
              <div className="add-chord-row flex h-11 max-w-[360px] items-center gap-3">
                <input
                  value={inputChord}
                  onChange={(e) => updateChord(e.target.value)}
                  onBlur={normalizeCurrentInputChord}
                  onKeyDown={(e) => {
                    if(e.key === "Enter") addChord()
                  }}
                  placeholder="Type chord . . ."
                  aria-label="Chord name"
                  title="Chord name"
                  className="h-11 w-64 rounded-2xl border border-[var(--line-soft)] bg-[var(--control-soft)]/65 px-4 text-[15px] font-bold text-[var(--ink)] shadow-inner outline-none transition placeholder:text-[var(--ink-soft)]/55 focus:border-[var(--control)] focus:bg-[var(--control-soft)]/80 focus:placeholder:text-transparent focus:ring-4 focus:ring-[var(--control)]/20"
                />
                <button
                  type="button"
                  onClick={addChord}
                  disabled={!canAddChord}
                  aria-label="Add chord"
                  title="Add chord"
                  className={`control-button h-11 w-14 rounded-2xl text-xl font-black ${canAddChord ? "" : "button-disabled"}`}
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <div className="label-text text-sm font-extrabold mb-2">Resolve In</div>
              <div className="flex h-11 items-center gap-3">
                <button
                  type="button"
                  onClick={() => stepResolveWithin(-1)}
                  disabled={!canResolveBackward}
                  aria-label="Resolve sooner"
                  title="Sooner"
                  className={`control-button h-11 w-11 rounded-full ${canResolveBackward ? "" : "button-disabled"}`}
                >
                  {"\u2190"}
                </button>
                <span className="flex h-11 min-w-12 items-center justify-center rounded-full bg-[var(--control-soft)] px-4 text-center font-black text-[var(--ink)] shadow-sm">{resolveWithin}</span>
                <button
                  type="button"
                  onClick={() => stepResolveWithin(1)}
                  disabled={!canResolveForward}
                  aria-label="Resolve later"
                  title="Later"
                  className={`control-button h-11 w-11 rounded-full ${canResolveForward ? "" : "button-disabled"}`}
                >
                  {"\u2192"}
                </button>
              </div>
            </div>

            <div>
              <div className="label-text text-sm font-extrabold mb-2">Audio</div>
              <div className="flex h-12 items-center gap-2 rounded-2xl bg-[var(--surface-soft)]/70 p-1 shadow-inner">
                <button
                  type="button"
                  onClick={toggleProgressionAudio}
                  disabled={!canPlayProgression}
                  aria-label={isProgressionPlaying ? "Pause progression" : "Play progression"}
                  title={isProgressionPlaying ? "Pause" : "Play"}
                  className={`flex h-10 w-12 items-center justify-center rounded-xl text-sm font-black shadow-sm ${
                    isProgressionPlaying
                      ? "degree-badge"
                      : "control-button"
                  } ${canPlayProgression ? "" : "button-disabled"}`}
                  >
                  <PlayMark paused={isProgressionPlaying} />
                </button>
                <button
                  type="button"
                  onClick={toggleProgressionLoop}
                  aria-pressed={isProgressionLooping}
                  aria-label={isProgressionLooping ? "Disable loop" : "Enable loop"}
                  title="Loop"
                  className={`flex h-10 w-12 items-center justify-center rounded-xl text-xl font-black leading-none shadow-sm ${
                    isProgressionLooping
                      ? "degree-badge"
                      : "control-button"
                  }`}
                >
                  <span aria-hidden="true">{"\u21bb"}</span>
                </button>
                <button
                  type="button"
                  onClick={cycleAudioSpeed}
                  className="control-button flex h-10 w-12 items-center justify-center rounded-xl"
                  aria-label="Change playback speed"
                  title={audioSpeed}
                >
                  <span className="flex h-6 w-8 items-end justify-center gap-1" aria-hidden="true">
                    <span className={`w-1.5 rounded-full bg-current ${audioSpeed === "quick" ? "h-1.5 opacity-100" : "h-1.5 opacity-35"}`} />
                    <span className={`w-1.5 rounded-full bg-current ${audioSpeed === "tight" ? "h-3 opacity-100" : "h-3 opacity-45"}`} />
                    <span className={`w-1.5 rounded-full bg-current ${audioSpeed === "easy" ? "h-[18px] opacity-100" : "h-[18px] opacity-55"}`} />
                    <span className={`w-1.5 rounded-full bg-current ${audioSpeed === "slow" ? "h-6 opacity-100" : "h-6 opacity-65"}`} />
                  </span>
                </button>
                <div className="ml-1 flex h-10 items-center gap-1 rounded-xl bg-[var(--control-soft)]/70 px-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => stepAudioRepeats(-1)}
                    disabled={!canRepeatLess}
                    aria-label="Play each chord fewer times"
                    title="Fewer repeats"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--control)] text-lg font-black text-[var(--ink)] shadow-sm ${canRepeatLess ? "" : "button-disabled"}`}
                  >
                    {"\u2190"}
                  </button>
                  <span className="degree-badge flex h-8 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-black">
                    x{audioRepeats}
                  </span>
                  <button
                    type="button"
                    onClick={() => stepAudioRepeats(1)}
                    disabled={!canRepeatMore}
                    aria-label="Play each chord more times"
                    title="More repeats"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--control)] text-lg font-black text-[var(--ink)] shadow-sm ${canRepeatMore ? "" : "button-disabled"}`}
                  >
                    {"\u2192"}
                  </button>
                </div>
                <div className="flex h-10 items-center gap-1 rounded-xl bg-[var(--control-soft)]/70 px-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => stepAudioStrumPattern(-1)}
                    disabled={!canPatternLess}
                    aria-label="Use previous strum pattern"
                    title="Previous pattern"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--control)] text-lg font-black text-[var(--ink)] shadow-sm ${canPatternLess ? "" : "button-disabled"}`}
                  >
                    {"\u2190"}
                  </button>
                  <span
                    className="degree-badge flex h-8 min-w-[88px] items-center justify-center rounded-lg px-2 text-sm font-black"
                    title={strumPatternTitle(audioStrumPattern)}
                  >
                    {strumPatternLabel(audioStrumPattern)}
                  </span>
                  <button
                    type="button"
                    onClick={() => stepAudioStrumPattern(1)}
                    disabled={!canPatternMore}
                    aria-label="Use next strum pattern"
                    title="Next pattern"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--control)] text-lg font-black text-[var(--ink)] shadow-sm ${canPatternMore ? "" : "button-disabled"}`}
                  >
                    {"\u2192"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
          <div className="label-text text-sm font-extrabold mb-3">Harmony Suggestions</div>
          <div className="suggestion-groups grid grid-cols-1 gap-4 pt-1 lg:grid-cols-3">
            <div className="surface-inset p-3">
              <div className="label-text text-sm font-extrabold mb-2">Chords of the Key</div>
              <div className="key-suggestion-grid grid grid-cols-8 gap-2">
                {suggestionPresentation.keyCategory.symbols.map((s: string, i: number) => {
                  const degree = getDegree(s, key)
                  const isHighlighted = suggestionPresentation.keyCategory.highlightedSymbol === s

                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => addSuggestion(s)}
                      onContextMenu={(event) => openSuggestionDetail(event, s, "key")}
                      aria-label={`Add ${s}`}
                      data-tooltip={suggestionTitle(s)}
                      className={`${chordColor(s, key)} ${i === 4 ? "col-start-2" : ""} has-tooltip suggestion-button ${isHighlighted ? "suggestion-button-primary" : "suggestion-button-secondary"} relative col-span-2`}
                    >
                      <span className="truncate">{s}</span>
                      {degree && (
                        <span className="degree-badge suggestion-degree shrink-0">
                          {degree}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="surface-inset p-3">
              <div className="label-text text-sm font-extrabold mb-2">Simple Suggestions</div>
              <div className="suggestion-grid grid grid-cols-6 gap-3">
                {suggestionPresentation.simpleCategory.symbols.map((s: string, i: number) => {
                  const degree = getDegree(s, key)
                  const isHighlighted = suggestionPresentation.simpleCategory.highlightedSymbol === s
                  const hasStar = shouldShowSuggestionStar("simple", s, i)

                  return (
                    <button
                      type="button"
                      key={`${s}-${i}`}
                      onClick={() => addSuggestion(s)}
                      onContextMenu={(event) => openSuggestionDetail(event, s, "simple")}
                      aria-label={`Add ${s}`}
                      data-tooltip={suggestionTitle(s)}
                      className={`${chordColor(s, key)} ${i === 3 ? "col-start-2" : ""} has-tooltip suggestion-button ${isHighlighted ? "suggestion-button-primary" : "suggestion-button-secondary"} relative col-span-2`}
                    >
                      {hasStar && (
                        <span className="suggestion-star" aria-hidden="true">{"\u2605"}</span>
                      )}
                      <span className="truncate">{s}</span>
                      {degree && (
                        <span className="degree-badge suggestion-degree shrink-0">
                          {degree}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="surface-inset p-3">
              <div className="label-text text-sm font-extrabold mb-2">Complex Suggestions</div>
              <div className="suggestion-grid grid grid-cols-6 gap-3">
                {suggestionPresentation.complexCategory.symbols.map((s: string, i: number) => {
                  const degree = getDegree(s, key)
                  const isHighlighted = suggestionPresentation.complexCategory.highlightedSymbol === s
                  const hasStar = shouldShowSuggestionStar("complex", s, i)

                  return (
                    <button
                      type="button"
                      key={`${s}-${i}`}
                      onClick={() => addSuggestion(s)}
                      onContextMenu={(event) => openSuggestionDetail(event, s, "complex")}
                      aria-label={`Add ${s}`}
                      data-tooltip={suggestionTitle(s)}
                      className={`${chordColor(s, key)} ${i === 3 ? "col-start-2" : ""} has-tooltip suggestion-button ${isHighlighted ? "suggestion-button-primary" : "suggestion-button-secondary"} relative col-span-2`}
                    >
                      {hasStar && (
                        <span className="suggestion-star" aria-hidden="true">{"\u2605"}</span>
                      )}
                      <span className="truncate">{s}</span>
                      {degree && (
                        <span className="degree-badge suggestion-degree shrink-0">
                          {degree}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          </div>

        </div>
      </div>

      <div className="workbench-layout grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-3">
        <div className="surface-panel p-4">
            <>
              <div className={`text-3xl font-extrabold mb-3 px-5 py-2 rounded-2xl shadow-sm ${fretboardChord ? chordColor(fretboardChord, key) : "bg-[var(--surface-soft)] text-[var(--ink)]"}`}>
                {fretboardChord ? chordDisplayName(fretboardChord) : "Add Chord"}
              </div>

              <div className="fretboard-controls mb-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start">
                <div>
              <div className="inline-flex max-w-full flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3 text-base font-bold">
                  {current && (
                  <div>
                    <div className="label-text text-sm font-extrabold mb-2">Voicing</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateVoicingIndex(voicingIndex - 1)}
                        disabled={!canStepVoicingBackward}
                        aria-label="Previous voicing"
                        data-tooltip="Previous voicing"
                        className={`has-tooltip control-button h-10 min-w-10 px-4 py-2 rounded-full ${canStepVoicingBackward ? "" : "button-disabled"}`}
                      >
                        {"\u2190"}
                      </button>
                      <span className="px-4 py-2 rounded-full bg-[var(--control-soft)] text-[var(--ink)] shadow-sm">{voicingIndex + 1}/{voicings.length}</span>
                      <button
                        type="button"
                        onClick={() => updateVoicingIndex(voicingIndex + 1)}
                        disabled={!canStepVoicingForward}
                        aria-label="Next voicing"
                        data-tooltip="Next voicing"
                        className={`has-tooltip control-button h-10 min-w-10 px-4 py-2 rounded-full ${canStepVoicingForward ? "" : "button-disabled"}`}
                      >
                        {"\u2192"}
                      </button>
                    </div>
                  </div>
                  )}

                  {current && (
                  <div>
                    <div className="label-text text-sm font-extrabold mb-2">Strings</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => stepStrings(-1)}
                        disabled={!canStepStringsBackward}
                        aria-label="Use fewer strings"
                        data-tooltip="Use fewer strings"
                        className={`has-tooltip control-button h-10 min-w-10 px-4 py-2 rounded-full ${canStepStringsBackward ? "" : "button-disabled"}`}
                      >
                        {"\u2190"}
                      </button>
                      <span className="px-4 py-2 rounded-full bg-[var(--control-soft)] text-[var(--ink)] shadow-sm">{inputStrings}</span>
                      <button
                        type="button"
                        onClick={() => stepStrings(1)}
                        disabled={!canStepStringsForward}
                        aria-label="Use more strings"
                        data-tooltip="Use more strings"
                        className={`has-tooltip control-button h-10 min-w-10 px-4 py-2 rounded-full ${canStepStringsForward ? "" : "button-disabled"}`}
                      >
                        {"\u2192"}
                      </button>
                    </div>
                  </div>
                  )}

                  <div>
                    <div className="label-text text-sm font-extrabold mb-2">Notes</div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAllNotes(!showAllNotes)}
                        aria-pressed={showAllNotes}
                        title="All notes"
                        className={`px-5 py-2 rounded-full text-base font-extrabold shadow-sm ${
                          showAllNotes
                            ? "degree-badge"
                            : "control-button"
                        }`}
                      >
                        {showAllNotes ? "Hide all notes" : "Show all notes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHighlightScale(!highlightScale)}
                        aria-pressed={highlightScale}
                        title="Scale"
                        className={`px-5 py-2 rounded-full text-base font-extrabold shadow-sm ${
                          highlightScale
                            ? "degree-badge"
                            : "control-button"
                        }`}
                      >
                        {highlightScale ? "Hide scale" : "Highlight scale"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHighlightChordNotes(!highlightChordNotes)}
                        aria-pressed={highlightChordNotes}
                        title="Chord notes"
                        className={`px-5 py-2 rounded-full text-base font-extrabold shadow-sm ${
                          highlightChordNotes
                            ? "degree-badge"
                            : "control-button"
                        }`}
                      >
                        {highlightChordNotes ? "Hide chord notes" : "Highlight chord notes"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="group relative flex w-full items-start gap-2 rounded-[32px] bg-[var(--surface-soft)]/50 px-3 pb-3 pt-2 shadow-inner" title="Bass to treble">
                  {chordToneNotes.flatMap((item, i) => {
                    const items = [
                      <div
                        key={item.id}
                        className="relative z-10 flex w-[68px] shrink-0 flex-col items-center gap-1.5"
                        title={`${item.note}: ${item.role}`}
                      >
                        <span className={`flex h-[68px] w-[68px] items-center justify-center rounded-full text-2xl font-black leading-none text-[var(--ink)] shadow-[0_4px_10px_rgba(47,33,24,0.18)] transition duration-150 ${noteColor(item.note, key)} ${item.isFlashing ? "scale-125 brightness-150 ring-4 ring-[#fff8ec] shadow-[0_0_24px_rgba(255,248,236,0.95)]" : ""}`}>
                          {item.note}
                        </span>
                        <span className="degree-badge flex h-7 min-w-9 items-center justify-center rounded-full border-2 border-[var(--degree-badge-text)] px-2 text-sm font-black leading-none shadow-[0_2px_6px_rgba(47,33,24,0.28)]">
                          {item.role}
                        </span>
                      </div>
                    ]

                    if(i < chordToneNotes.length - 1) {
                      items.push(
                        <div
                          key={`${item.id}-arrow`}
                          className="relative mt-[30px] flex min-w-10 flex-1 items-center justify-center"
                          aria-hidden="true"
                        >
                          <div
                            className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
                            style={{ background: "color-mix(in srgb, var(--ink) 18%, transparent)" }}
                          />
                          <span className="relative z-10 flex h-8 w-8 items-center justify-center">
                            <span
                              className="block h-3.5 w-3.5 rotate-45 border-r-[4px] border-t-[4px]"
                              style={{ borderColor: "color-mix(in srgb, var(--ink) 18%, transparent)" }}
                            />
                          </span>
                        </div>
                      )
                    }

                    return items
                  })}
                </div>
              </div>
                </div>

                <div className="flex h-full min-h-[132px] items-center justify-center">
                  <button
                    type="button"
                    onClick={() => void playVoicingAudio("strum")}
                    disabled={audioNotes.length === 0}
                    aria-label="Play selected voicing"
                    title="Play"
                    className={`flex h-24 w-24 items-center justify-center rounded-[24px] text-[var(--ink)] shadow-[0_4px_10px_rgba(47,33,24,0.18)] transition ${
                      isAudioPlaying
                        ? "bg-[var(--control)] text-[var(--ink)] brightness-95"
                        : "bg-[var(--control)] text-[var(--ink)] hover:brightness-95"
                    } ${audioNotes.length > 0 ? "" : "cursor-not-allowed opacity-45"}`}
                  >
                    <PlayMark paused={isAudioPlaying} large />
                  </button>
                </div>
              </div>

              <div className="fretboard-scroll mt-4 rounded-[24px] bg-[var(--fretboard-deep)] px-2 pb-3 pt-0.5 overflow-x-auto shadow-inner">
                <div className="fretboard-inner relative min-w-[980px] rounded-[18px] overflow-hidden bg-[var(--fretboard)]">
                  <div
                    className="absolute z-0 rounded-[16px] bg-[var(--control)]"
                    style={{
                      top: `${FRETBOARD_HEADER_HEIGHT }px`,
                      bottom: '6px',
                      left: '6px',
                      width: '70px'
                    }}
                  />
                  <div
                    className="relative z-20"
                    style={{ height: FRETBOARD_HEADER_HEIGHT }}
                  >
                    <button
                      type="button"
                      onClick={addFretboardChord}
                      disabled={!canAddFretboardChord}
                      aria-label="Add fretboard chord"
                      data-tooltip={fretboardAddTooltip}
                      className={`has-tooltip absolute left-[14px] top-1/2 z-30 flex w-12 -translate-y-1/2 appearance-none items-center justify-center rounded-full border-0 p-0 text-sm font-black leading-none shadow-md ${
                        canAddFretboardChord
                          ? "bg-[var(--control)] text-[var(--ink)] hover:brightness-95"
                          : "button-disabled bg-[var(--surface-muted)] text-[var(--ink-soft)]"
                      }`}
                      style={{ height: `${FRETBOARD_ADD_BUTTON_HEIGHT}px` }}
                    >
                      +
                    </button>
                    <div
                      className="pointer-events-none absolute inset-0 grid"
                      style={{ gridTemplateColumns: FRETBOARD_GRID }}
                    >
                      <div />
                      <div className="flex h-full items-center" style={{ gridColumn: '2 / -1' }}>
                        <div
                          className="w-full rounded-full bg-[var(--fretboard-deep)]"
                          style={{ height: `${FRETBOARD_NUMBER_BAR_HEIGHT}px` }}
                        />
                      </div>
                    </div>
                    <div
                      className="absolute inset-0 z-10 grid"
                      style={{ gridTemplateColumns: FRETBOARD_GRID }}
                    >
                      <div />
                      {FRET_RANGE.map((fret) => (
                        <div
                          key={fret}
                          className="flex h-full items-center justify-center"
                        >
                          <span className="text-sm font-extrabold leading-none text-[#e4c590]">
                            {fret}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {[...STRINGS.map((_, i) => i)].reverse().map((stringIndex) => {
                    const s = STRINGS[stringIndex]
                    const active = fretboardVoicing?.find(x => x.string === stringIndex)

                    return (
                      <div
                        key={`${s}-${stringIndex}`}
                        className="relative grid items-center"
                        style={{ gridTemplateColumns: FRETBOARD_GRID }}
                      >
                        <div 
                          className="h-10 flex items-center px-3 relative"
                          onDragOver={(event) => {
                            const preview = getStringPreviewState(stringIndex)
                            if (preview === "allowed") {
                              event.preventDefault()
                              event.dataTransfer.dropEffect = "move"
                            } else {
                              event.dataTransfer.dropEffect = "none"
                            }
                          }}
                          onDrop={() => {
                            if (getStringPreviewState(stringIndex) !== "allowed") {
                              return
                            }

                            if (draggedNote) {
                              handleDropOnString(stringIndex)
                            }
                          }}
                        >
                          <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--ink)]">
                            <span>{s}</span>
                            <span className="min-w-6 h-6 rounded-full bg-[var(--fretboard)] px-2 flex items-center justify-center text-xs text-[#f7e5c7]">
                              {STRING_NO[stringIndex]}
                            </span>
                          </span>
                          {(() => {
                            const headerPreview = getStringPreviewState(stringIndex)
                            if (!headerPreview) return null
                            return (
                              <div className={dragPreviewClass(headerPreview, "string")} />
                            )
                          })()}
                        </div>

                        {FRET_RANGE.map((fret) => {
                          const note = getFretNote(s, fret)
                          const displayNote = noteDisplayName(note, key, mode)
                          const isActive = active?.fret === fret
                          const isMuted = !active && fret === 0
                          const notePitch = normalizeNote(note)
                          const isScaleNote = scaleNotes.has(notePitch)
                          const isChordNote = chordNotes.has(notePitch)
                          const showNote = showAllNotes || isActive || (highlightScale && isScaleNote) || (highlightChordNotes && isChordNote)
                          const noteMarkerColor = noteColor(note, key)
                          const isFlashing = flashingNoteIds.has(audioNoteId(stringIndex, fret))
                          const fretPreview = getFretPreviewState(stringIndex, fret)

                          return (
                            <div
                              key={fret}
                              className="h-10 relative flex items-center justify-center bg-[var(--fretboard)]"
                              style={{
                                borderRight: '4px solid var(--fretboard-line)',
                              }}
                              onDragOver={(event) => {
                                if (getFretPreviewState(stringIndex, fret) === "allowed") {
                                  event.preventDefault()
                                  event.dataTransfer.dropEffect = "move"
                                } else {
                                  event.dataTransfer.dropEffect = "none"
                                }
                              }}
                              onDrop={() => {
                                if (getFretPreviewState(stringIndex, fret) !== "allowed") {
                                  return
                                }

                                if (draggedNote) {
                                  handleDropOnFret(stringIndex, fret)
                                } else if (draggedMutedString !== null) {
                                  handleDropMutedOnFret(stringIndex, fret)
                                }
                              }}
                            >
                              <div
                                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full bg-[var(--fretboard-deep)]"
                                style={{
                                  height: stringThickness(stringIndex),
                                }}
                              />
                              {fretPreview && (
                                <div className={dragPreviewClass(fretPreview, "fret")} />
                              )}

                              {isMuted && (
                                <div 
                                  draggable
                                  onDragStart={(event) => handleDragStartMuted(stringIndex, event)}
                                  onDragEnd={handleDragEndMuted}
                                  className="absolute z-10 rounded-full flex items-center justify-center font-extrabold leading-none text-[var(--muted-badge-text)] transition duration-150 w-7 h-7 text-xs bg-[var(--muted-badge)] cursor-grab"
                                >
                                  X
                                </div>
                              )}

                              {showNote && (
                                <div
                                  draggable={isActive}
                                  onDragStart={(event) => isActive && handleDragStartNote(active!, event)}
                                  onDragEnd={handleDragEndNote}
                                  className={`absolute z-10 rounded-full shadow-md flex items-center justify-center cursor-grab font-extrabold leading-none text-[var(--ink)] transition duration-150 ${noteMarkerColor} ${
                                    isActive
                                      ? "w-9 h-9 text-base border-[3px] border-[#fffaf0]"
                                      : `w-7 h-7 text-xs ${
                                          highlightChordNotes && isChordNote
                                            ? "border-[3px] border-[#fffaf0] ring-2 ring-[#fffaf0]/75"
                                            : highlightScale && isScaleNote
                                            ? "border-[3px] border-[#fffaf0] ring-2 ring-[var(--ink)]/45"
                                            : highlightScale || highlightChordNotes
                                              ? "opacity-35"
                                              : "opacity-85"
                                        }`
                                  } ${isFlashing ? "scale-150 brightness-150 ring-4 ring-[#fff8ec] shadow-[0_0_28px_rgba(255,248,236,0.95)]" : ""}`}
                                >
                                  {displayNote}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
        </div>

        <div className="voicing-panel surface-panel p-4">
          <div className="mb-3 text-lg font-black text-[var(--ink)]">Voicing</div>

          <div className="flex flex-col gap-2.5">
  {STRINGS.map((_, i) => i).reverse().map((i) => {
    const s = STRINGS[i]
    const f = fretboardVoicing ? fretboardVoicing.find(x => x.string === i) : null
    const status = !f ? "MUTED" : f.fret === 0 ? "OPEN" : `${f.fret}`

    return (
      <div
        key={i}
        className={`voicing-row grid min-h-[72px] grid-cols-[62px_minmax(72px,1fr)_48px] items-center gap-2 rounded-[22px] px-3 py-2 shadow-sm ${
          f ? `${noteColor(f.note, key)} voicing-row-active` : "voicing-row-muted"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl font-black leading-none text-[var(--ink)]">{s}</div>
          <div className="string-number-badge flex h-8 w-8 items-center justify-center rounded-full text-base font-black leading-none shadow-sm">
            {STRING_NO[i]}
          </div>
        </div>

        <div className="flex justify-center">
          <div className={`voicing-status min-w-[72px] rounded-full px-3 py-2.5 text-center text-base font-black leading-none shadow-sm ${
            f ? "voicing-status-active" : "voicing-status-muted"
          }`}>
            {status}
          </div>
        </div>

        <div className="flex justify-end">
          <div className="hidden">
            {f ? f.fret : "\u2014"}
          </div>

          <div
            className={`${f ? "flex" : "hidden"} note-name-badge h-11 w-11 items-center justify-center rounded-full text-xl font-black leading-none shadow-sm`}
          >
            {f ? noteDisplayName(f.note, key, mode) : "\u2014"}
          </div>
        </div>
      </div>
    )
  })}
</div>
        </div>
      </div>
    </main>
  )
}
