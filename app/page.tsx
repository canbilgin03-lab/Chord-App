'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  analyzeChord,
  buildDiatonicChords,
  buildProgressionSuggestions,
  buildScaleFromMode,
  getChordRoot,
  getChordDisplayNotes,
  getFretNote,
  getNoteIndex,
  normalizeNote,
  normalizeChordSymbol,
  parseChordSymbol,
  spellNoteForKey,
  type Fret,
  type Quality
} from '@/app/lib/chordEngine'

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
const DISPLAY_FRETS = 19
const FRET_RANGE = Array.from({ length: DISPLAY_FRETS }, (_, fret) => fret)
const FRETBOARD_GRID = `80px 48px repeat(${DISPLAY_FRETS - 1}, minmax(42px, 1fr))`
const FRETBOARD_HEADER_HEIGHT = 48
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]
const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const AUDIO_SPEED_OPTIONS = ["quick", "tight", "easy", "slow"] as const
const AUDIO_STEP_SECONDS = {
  quick: 0.035,
  tight: 0.055,
  easy: 0.085,
  slow: 0.125
}
const AUDIO_NOTE_LENGTH_SECONDS: Record<AudioSpeed, number> = {
  quick: 0.92,
  tight: 1.05,
  easy: 1.18,
  slow: 1.34
}
const AUDIO_STRUM_TAIL_MS: Record<AudioSpeed, number> = {
  quick: 620,
  tight: 780,
  easy: 980,
  slow: 1220
}
const AUDIO_MIN_CHORD_DELAY_MS: Record<AudioSpeed, number> = {
  quick: 360,
  tight: 460,
  easy: 560,
  slow: 700
}
const AUDIO_CHORD_MODE_DURATION_MS: Record<AudioSpeed, number> = {
  quick: 760,
  tight: 960,
  easy: 1180,
  slow: 1460
}
const AUDIO_LEAD_SECONDS = 0.055
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
}

type VoicingItem = {
  string: number
  fret: Fret
  note: string
  role: string
}

type AudioDirection = "down" | "up"
type AudioSpeed = typeof AUDIO_SPEED_OPTIONS[number]

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

type ToneEngine = {
  Tone: typeof import("tone")
  sampler: import("tone").Sampler
  gain: import("tone").Gain
  filter: import("tone").Filter
  delay: import("tone").FeedbackDelay
  reverb: import("tone").Reverb
}

function romanForQuality(roman: string, quality: Quality) {
  if(quality === "m" || quality === "m7" || quality === "m7b5") {
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
    maj7: "\u03947",
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

function defaultStringCountForChord(chord: string) {
  if(!parseChordSymbol(chord)) return 4

  const uniqueNotes = new Set(getChordDisplayNotes(chord).map(item => item.note))
  return uniqueNotes.size > 3 ? 5 : 4
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

function humanizedOffset(index: number) {
  return [0, 0.005, -0.003, 0.008, -0.002, 0.004][index % 6]
}

function humanizedVelocity(index: number) {
  const firstStringAccent = index === 0 ? 0.07 : 0
  return Math.max(0.48, Math.min(0.86, 0.76 + firstStringAccent - index * 0.035))
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

  const [progression, setProgression] = useState<ProgressionItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const [voicings, setVoicings] = useState<VoicingItem[][]>([])
  const [voicingIndex, setVoicingIndex] = useState(0)

  const [inputChord, setInputChord] = useState("")
  const [inputStrings, setInputStrings] = useState(4)
  const [resolveWithin, setResolveWithin] = useState(4)
  const [showAllNotes, setShowAllNotes] = useState(false)
  const [highlightScale, setHighlightScale] = useState(false)
  const [highlightChordNotes, setHighlightChordNotes] = useState(false)
  const audioDirection: AudioDirection = "down"
  const [audioSpeed, setAudioSpeed] = useState<AudioSpeed>("tight")
  const [audioRepeats, setAudioRepeats] = useState(1)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [isProgressionPlaying, setIsProgressionPlaying] = useState(false)
  const [isProgressionLooping, setIsProgressionLooping] = useState(true)
  const [progressionPlayIndex, setProgressionPlayIndex] = useState<number | null>(null)
  const [flashingNoteIds, setFlashingNoteIds] = useState<Set<string>>(() => new Set())
  const audioSpeedRef = useRef<AudioSpeed>("tight")
  const audioRepeatsRef = useRef(1)
  const progressionRef = useRef<ProgressionItem[]>([])
  const audioEngineRef = useRef<ToneEngine | null>(null)
  const audioEnginePromiseRef = useRef<Promise<ToneEngine> | null>(null)
  const audioTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteFlashTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const progressionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressionPlayingRef = useRef(false)
  const progressionLoopingRef = useRef(true)

  function computeVoicings(item: ProgressionItem) {
    const res = analyzeChord({
      symbol: item.chord,
      stringCount: item.strings,
      key,
      mode
    })

    const nextVoicings = (res.voicings || []) as VoicingItem[][]
    setVoicings(nextVoicings)

    const safeIndex = nextVoicings.length > 0
      ? Math.min(item.voicingIndex ?? 0, nextVoicings.length - 1)
      : 0

    setVoicingIndex(safeIndex)
  }

  function showProgressionItem(index: number, item: ProgressionItem) {
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

  function selectChord(idx: number) {
    const item = progression[idx]
    if (!item) return

    if (selectedIndex === idx) {
      setSelectedIndex(null)
      setInputChord("")
      setVoicings([])
      setVoicingIndex(0)
      return
    }

    showProgressionItem(idx, item)
  }

  function updateChord(val: string) {
    setInputChord(val)
    if (selectedIndex === null) return
    if(!parseChordSymbol(val.trim())) return

    const defaultStrings = defaultStringCountForChord(val)
    const next = [...progression]
    next[selectedIndex] = { ...next[selectedIndex], chord: val, strings: defaultStrings, voicingIndex: 0 }
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

    const defaultStrings = defaultStringCountForChord(chord)
    const next = [...progression]
    next[selectedIndex] = { ...next[selectedIndex], chord, strings: defaultStrings, voicingIndex: 0 }
    progressionRef.current = next
    setProgression(next)
    setInputStrings(defaultStrings)
    computeVoicings(next[selectedIndex])
  }

  function updateStrings(val: number) {
    setInputStrings(val)
    if (selectedIndex === null) return

    const next = [...progression]
    next[selectedIndex] = { ...next[selectedIndex], strings: val }
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
    const defaultStrings = defaultStringCountForChord(chord)

    const next = [...progression, { chord, strings: defaultStrings, voicingIndex: 0 }]
    progressionRef.current = next
    setProgression(next)

    const i = next.length - 1
    setSelectedIndex(i)
    setInputChord(chord)
    setInputStrings(defaultStrings)
    setVoicingIndex(0)
    computeVoicings(next[i])
    if(progressionPlayingRef.current && progressionPlayIndex === null) {
      setProgressionPlayIndex(i)
    }
  }

  function addSuggestion(chord: string) {
    const defaultStrings = defaultStringCountForChord(chord)
    const next = [...progression, { chord, strings: defaultStrings, voicingIndex: 0 }]
    progressionRef.current = next
    setProgression(next)

    const i = next.length - 1
    setSelectedIndex(i)
    setInputChord(chord)
    setInputStrings(defaultStrings)
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
      next[selectedIndex] = { ...next[selectedIndex], voicingIndex: safeIndex }
      progressionRef.current = next
      setProgression(next)
    }
  }

  async function ensureAudioEngine() {
    if(audioEngineRef.current?.sampler.loaded) return audioEngineRef.current
    if(audioEnginePromiseRef.current) return audioEnginePromiseRef.current

    audioEnginePromiseRef.current = (async () => {
      const Tone = await import("tone")
      await Tone.start()

      const gain = new Tone.Gain(0.72).toDestination()
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
        release: 0.86,
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
    engine.gain.gain.value = 0.72
  }

  async function prepareAudioEngine() {
    const engine = await ensureAudioEngine().catch((error) => {
      console.error("Audio engine failed to start", error)
      audioEnginePromiseRef.current = null
      return null
    })
    if(!engine?.sampler.loaded) return null

    await engine.Tone.start()
    applyAudioTone(engine)
    return engine
  }

  function clearNoteFlashes() {
    noteFlashTimeoutsRef.current.forEach(clearTimeout)
    noteFlashTimeoutsRef.current = []
    setFlashingNoteIds(new Set())
  }

  function flashAudioNotes(notes: AudioNote[], mode: "strum" | "chord", step: number) {
    const flashDuration = 210
    notes.forEach((item, index) => {
      const noteDelay = mode === "chord" ? index * 12 : index * step * 1000
      const delay = AUDIO_LEAD_SECONDS * 1000 + noteDelay
      const startTimeout = setTimeout(() => {
        setFlashingNoteIds((current) => {
          const next = new Set(current)
          next.add(item.id)
          return next
        })

        const endTimeout = setTimeout(() => {
          setFlashingNoteIds((current) => {
            const next = new Set(current)
            next.delete(item.id)
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

  async function playAudioNotes(notes: AudioNote[], mode: "strum" | "chord") {
    if(notes.length === 0) return 0
    const engine = await prepareAudioEngine()
    if(!engine) return 0

    const speed = audioSpeedRef.current
    const now = engine.Tone.now() + AUDIO_LEAD_SECONDS
    const step = AUDIO_STEP_SECONDS[speed]
    clearNoteFlashes()
    flashAudioNotes(notes, mode, step)

    if(mode === "chord") {
      notes.forEach((item, index) => {
        engine.sampler.triggerAttackRelease(item.note, 1.35, now + index * 0.012 + humanizedOffset(index), humanizedVelocity(index))
      })
      return AUDIO_CHORD_MODE_DURATION_MS[speed]
    }

    notes.forEach((item, index) => {
      const noteLength = AUDIO_NOTE_LENGTH_SECONDS[speed]
      engine.sampler.triggerAttackRelease(item.note, noteLength, now + index * step + humanizedOffset(index), humanizedVelocity(index))
    })

    return Math.round((notes.length - 1) * step * 1000 + AUDIO_STRUM_TAIL_MS[speed])
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
    const result = analyzeChord({
      symbol: item.chord,
      stringCount: item.strings,
      key,
      mode
    })
    const safeIndex = result.voicings.length > 0
      ? Math.min(item.voicingIndex ?? 0, result.voicings.length - 1)
      : 0

    return voicingAudioNotes(result.voicings[safeIndex] as VoicingItem[] | undefined, audioDirection)
  }

  function stopProgressionAudio() {
    progressionPlayingRef.current = false
    if(progressionTimeoutRef.current) clearTimeout(progressionTimeoutRef.current)
    progressionTimeoutRef.current = null
    audioEngineRef.current?.sampler.releaseAll()
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

    const engine = await prepareAudioEngine()
    if(!engine) {
      stopProgressionAudio()
      return
    }
    if(!progressionPlayingRef.current) return
    engine.sampler.releaseAll()

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
      const currentSpeed = audioSpeedRef.current
      const nextDelay = Math.max(duration, AUDIO_MIN_CHORD_DELAY_MS[currentSpeed])

      repeatsDone += 1
      if(repeatsDone >= audioRepeatsRef.current) {
        repeatsDone = 0
        index += 1
      }
      progressionTimeoutRef.current = setTimeout(() => void playNext(), nextDelay)
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
  const v = voicings[voicingIndex]
  const canAddChord = Boolean(parseChordSymbol(inputChord.trim()))
  const canResolveBackward = resolveWithin > RESOLVE_WITHIN_OPTIONS[0]
  const canResolveForward = resolveWithin < RESOLVE_WITHIN_OPTIONS[RESOLVE_WITHIN_OPTIONS.length - 1]
  const canRepeatLess = audioRepeats > AUDIO_REPEAT_OPTIONS[0]
  const canRepeatMore = audioRepeats < AUDIO_REPEAT_OPTIONS[AUDIO_REPEAT_OPTIONS.length - 1]
  const canStepStringsBackward = inputStrings > STRING_COUNTS[0]
  const canStepStringsForward = inputStrings < STRING_COUNTS[STRING_COUNTS.length - 1]
  const canStepVoicingBackward = voicingIndex > 0
  const canStepVoicingForward = voicings.length > 0 && voicingIndex < voicings.length - 1
  const audioNotes = voicingAudioNotes(v, audioDirection)
  const canPlayProgression = progression.length > 0
  const chordToneNotes: ChordToneBubble[] = useMemo(() => {
    const symbolNotes = current ? getChordDisplayNotes(current.chord, key, mode) : []
    const flashingVoicingNotes = new Set(
      (v || [])
        .filter((entry) => {
          const fret = typeof entry.fret === "number" ? entry.fret : 0
          return flashingNoteIds.has(audioNoteId(entry.string, fret))
        })
        .map((entry) => normalizeNote(entry.note))
    )

    return symbolNotes.length
      ? symbolNotes.map((item, index) => ({
        note: item.note,
        role: item.role,
        id: `${item.note}:${item.role}:${index}`,
        isFlashing: flashingVoicingNotes.has(normalizeNote(item.note))
      }))
      : []
  }, [current, v, flashingNoteIds, key, mode])
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
    return () => {
      if(audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current)
      if(progressionTimeoutRef.current) clearTimeout(progressionTimeoutRef.current)
      noteFlashTimeoutsRef.current.forEach(clearTimeout)
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
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-3 space-y-3">

      <div className="grid grid-cols-1 xl:grid-cols-[540px_minmax(0,1fr)] gap-3">
        <div className="surface-panel flex h-full flex-col gap-4 p-4">
          <div className="surface-inset flex flex-1 flex-col p-4">
            <div className="mb-3 flex items-center">
              <span className="label-text text-base font-black tracking-wide">Key</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {KEY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setKey(option)}
                  aria-pressed={key === option}
                  title={`Set key to ${option}`}
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
            <div className="grid grid-cols-8 gap-2">
              {MODE_OPTIONS.map((option, i) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  aria-pressed={mode === option.value}
                  title={`Set mode to ${option.label}`}
                  className={`${i === 4 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl border px-3 py-2 text-sm font-black transition ${
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

  return (
    <div key={i} className="flex flex-col items-center gap-2">

      <div className="relative">
        <button
          type="button"
          className={`relative px-6 py-3 text-xl font-extrabold rounded-full border-2 border-[var(--ink)] shadow cursor-pointer flex items-center gap-3 transition ${chordColor(c.chord, key)} ${i === selectedIndex ? "ring-4 ring-[var(--ink)]/70" : ""} ${isPlayingChord ? "scale-110 brightness-125 ring-4 ring-[#fff8ec] shadow-[0_0_24px_rgba(255,248,236,0.95)]" : ""}`}
          onClick={() => selectChord(i)}
          aria-pressed={i === selectedIndex}
          aria-label={`Select ${chordLabel}`}
          title={i === selectedIndex ? `Unselect ${chordLabel}` : `Select ${chordLabel}`}
        >
          <span className="text-xl tracking-tight">{chordLabel}</span>

          {degree && (
            <span className="text-base font-extrabold bg-[var(--ink)] text-[#fff8ec] rounded-full px-4 py-1 shadow-sm">
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
          title={`Remove ${chordLabel}`}
          className="absolute -top-2 -right-2 w-7 h-7 text-sm bg-[var(--ink)] text-[#fff8ec] rounded-full flex items-center justify-center shadow hover:brightness-110"
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
          title={`Move ${chordLabel} left`}
          className={`control-button text-sm font-bold px-3 py-2 rounded-full ${canMoveLeft ? "" : "cursor-not-allowed opacity-45"}`}
        >
          {"\u2190"}
        </button>

        <button
          type="button"
          onClick={() => moveChord(i, 1)}
          disabled={!canMoveRight}
          aria-label={`Move ${chordLabel} right`}
          title={`Move ${chordLabel} right`}
          className={`control-button text-sm font-bold px-3 py-2 rounded-full ${canMoveRight ? "" : "cursor-not-allowed opacity-45"}`}
        >
          {"\u2192"}
        </button>
      </div>

    </div>
  )
})}
          </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <div className="label-text text-sm font-extrabold mb-2">Add Chord</div>
              <div className="flex h-11 max-w-[360px] items-center gap-3">
                <input
                  value={inputChord}
                  onChange={(e) => updateChord(e.target.value)}
                  onBlur={normalizeCurrentInputChord}
                  onKeyDown={(e) => {
                    if(e.key === "Enter") addChord()
                  }}
                  placeholder="Type chord . . ."
                  aria-label="Chord name"
                  title="Type a chord name"
                  className="h-11 w-64 rounded-2xl border border-[var(--line-soft)] bg-[var(--control-soft)]/65 px-4 text-[15px] font-bold text-[var(--ink)] shadow-inner outline-none transition placeholder:text-[var(--ink-soft)]/55 focus:border-[var(--control)] focus:bg-[var(--control-soft)]/80 focus:placeholder:text-transparent focus:ring-4 focus:ring-[var(--control)]/20"
                />
                <button
                  type="button"
                  onClick={addChord}
                  disabled={!canAddChord}
                  aria-label="Add chord"
                  title="Add chord to progression"
                  className={`control-button h-11 w-14 rounded-2xl text-xl font-black ${canAddChord ? "" : "cursor-not-allowed opacity-45"}`}
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
                  title="Resolve sooner"
                  className={`control-button h-11 w-11 rounded-full ${canResolveBackward ? "" : "cursor-not-allowed opacity-45"}`}
                >
                  {"\u2190"}
                </button>
                <span className="flex h-11 min-w-12 items-center justify-center rounded-full bg-[var(--control-soft)] px-4 text-center font-black text-[var(--ink)] shadow-sm">{resolveWithin}</span>
                <button
                  type="button"
                  onClick={() => stepResolveWithin(1)}
                  disabled={!canResolveForward}
                  aria-label="Resolve later"
                  title="Resolve later"
                  className={`control-button h-11 w-11 rounded-full ${canResolveForward ? "" : "cursor-not-allowed opacity-45"}`}
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
                  title={isProgressionPlaying ? "Pause progression" : "Play progression"}
                  className={`flex h-10 w-12 items-center justify-center rounded-xl text-sm font-black shadow-sm ${
                    isProgressionPlaying
                      ? "bg-[var(--ink)] text-[#fff8ec]"
                      : "control-button"
                  } ${canPlayProgression ? "" : "cursor-not-allowed opacity-45"}`}
                  >
                  <PlayMark paused={isProgressionPlaying} />
                </button>
                <button
                  type="button"
                  onClick={toggleProgressionLoop}
                  aria-pressed={isProgressionLooping}
                  aria-label={isProgressionLooping ? "Disable loop" : "Enable loop"}
                  title={isProgressionLooping ? "Loop on" : "Loop off"}
                  className={`flex h-10 w-12 items-center justify-center rounded-xl text-xl font-black leading-none shadow-sm ${
                    isProgressionLooping
                      ? "bg-[var(--ink)] text-[#fff8ec]"
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
                  title={`Speed: ${audioSpeed}`}
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
                    title="Play each chord fewer times"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--control)] text-lg font-black text-[var(--ink)] shadow-sm ${canRepeatLess ? "" : "cursor-not-allowed opacity-35"}`}
                  >
                    {"\u2190"}
                  </button>
                  <span className="flex h-8 min-w-10 items-center justify-center rounded-lg bg-[var(--ink)] px-2 text-sm font-black text-[#fff8ec]">
                    x{audioRepeats}
                  </span>
                  <button
                    type="button"
                    onClick={() => stepAudioRepeats(1)}
                    disabled={!canRepeatMore}
                    aria-label="Play each chord more times"
                    title="Play each chord more times"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--control)] text-lg font-black text-[var(--ink)] shadow-sm ${canRepeatMore ? "" : "cursor-not-allowed opacity-35"}`}
                  >
                    {"\u2192"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
          <div className="label-text text-sm font-extrabold mb-2">Harmony Suggestions</div>
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="surface-inset p-2.5">
              <div className="label-text text-sm font-extrabold mb-2">Chords of the Key</div>
              <div className="grid grid-cols-8 gap-2">
                {keyChords.map((s: string, i: number) => {
                  const degree = getDegree(s, key)

                  return (
                    <button type="button" key={s} onClick={() => addSuggestion(s)} aria-label={`Add ${s}`} title={`Add ${chordDisplayName(s)} to progression`} className={`${chordColor(s, key)} ${i === 4 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl px-2 py-2 text-[15px] font-black shadow-sm border border-[var(--ink)]/15 hover:brightness-95 flex items-center justify-center gap-1.5 min-w-0 transition`}>
                      <span className="truncate">{s}</span>
                      {degree && (
                        <span className="shrink-0 rounded-full bg-[var(--ink)] px-2 py-1 text-[11px] font-black leading-none text-[#fff8ec]">
                          {degree}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="surface-inset p-2.5">
              <div className="label-text text-sm font-extrabold mb-2">Simple Suggestions</div>
              <div className="grid grid-cols-6 gap-3">
                {progressionSuggestions.simple.map((s: string, i: number) => {
                  const degree = getDegree(s, key)

                  return (
                    <button type="button" key={`${s}-${i}`} onClick={() => addSuggestion(s)} aria-label={`Add ${s}`} title={`Add ${chordDisplayName(s)} to progression`} className={`${chordColor(s, key)} ${i === 3 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl px-3 py-2 text-base font-black shadow-sm border border-[var(--ink)]/15 hover:brightness-95 flex items-center justify-center gap-2 min-w-0 transition`}>
                      <span className="truncate">{s}</span>
                      {degree && (
                        <span className="shrink-0 rounded-full bg-[var(--ink)] px-2 py-1 text-[11px] font-black leading-none text-[#fff8ec]">
                          {degree}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="surface-inset p-2.5">
              <div className="label-text text-sm font-extrabold mb-2">Complex Suggestions</div>
              <div className="grid grid-cols-6 gap-3">
                {progressionSuggestions.complex.map((s: string, i: number) => {
                  const degree = getDegree(s, key)

                  return (
                    <button type="button" key={`${s}-${i}`} onClick={() => addSuggestion(s)} aria-label={`Add ${s}`} title={`Add ${chordDisplayName(s)} to progression`} className={`${chordColor(s, key)} ${i === 3 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl px-3 py-2 text-base font-black shadow-sm border border-[var(--ink)]/15 hover:brightness-95 flex items-center justify-center gap-2 min-w-0 transition`}>
                      <span className="truncate">{s}</span>
                      {degree && (
                        <span className="shrink-0 rounded-full bg-[var(--ink)] px-2 py-1 text-[11px] font-black leading-none text-[#fff8ec]">
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-3">
        <div className="surface-panel p-4">
          {!current && (
            <div className="surface-inset p-5 text-2xl font-extrabold text-[var(--ink)]">
              No chord selected
            </div>
          )}

          {current && (
            <>
              <div className={`text-3xl font-extrabold mb-3 px-5 py-2 rounded-2xl shadow-sm ${chordColor(current.chord, key)}`}>{chordDisplayName(current.chord)}</div>

              <div className="mb-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start">
                <div>
              <div className="inline-flex max-w-full flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3 text-base font-bold">
                  <div>
                    <div className="label-text text-sm font-extrabold mb-2">Voicing</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateVoicingIndex(voicingIndex - 1)}
                        disabled={!canStepVoicingBackward}
                        aria-label="Previous voicing"
                        title="Previous voicing"
                        className={`control-button px-4 py-2 rounded-full ${canStepVoicingBackward ? "" : "cursor-not-allowed opacity-45"}`}
                      >
                        {"\u2190"}
                      </button>
                      <span className="px-4 py-2 rounded-full bg-[var(--control-soft)] text-[var(--ink)] shadow-sm">{voicingIndex + 1}/{voicings.length}</span>
                      <button
                        type="button"
                        onClick={() => updateVoicingIndex(voicingIndex + 1)}
                        disabled={!canStepVoicingForward}
                        aria-label="Next voicing"
                        title="Next voicing"
                        className={`control-button px-4 py-2 rounded-full ${canStepVoicingForward ? "" : "cursor-not-allowed opacity-45"}`}
                      >
                        {"\u2192"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="label-text text-sm font-extrabold mb-2">Strings</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => stepStrings(-1)}
                        disabled={!canStepStringsBackward}
                        aria-label="Use fewer strings"
                        title="Use fewer strings"
                        className={`control-button px-4 py-2 rounded-full ${canStepStringsBackward ? "" : "cursor-not-allowed opacity-45"}`}
                      >
                        {"\u2190"}
                      </button>
                      <span className="px-4 py-2 rounded-full bg-[var(--control-soft)] text-[var(--ink)] shadow-sm">{inputStrings}</span>
                      <button
                        type="button"
                        onClick={() => stepStrings(1)}
                        disabled={!canStepStringsForward}
                        aria-label="Use more strings"
                        title="Use more strings"
                        className={`control-button px-4 py-2 rounded-full ${canStepStringsForward ? "" : "cursor-not-allowed opacity-45"}`}
                      >
                        {"\u2192"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="label-text text-sm font-extrabold mb-2">Notes</div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAllNotes(!showAllNotes)}
                        aria-pressed={showAllNotes}
                        title={showAllNotes ? "Hide all notes" : "Show all notes"}
                        className={`px-5 py-2 rounded-full text-base font-extrabold shadow-sm ${
                          showAllNotes
                            ? "bg-[var(--ink)] text-[#fff8ec]"
                            : "control-button"
                        }`}
                      >
                        {showAllNotes ? "Hide all notes" : "Show all notes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHighlightScale(!highlightScale)}
                        aria-pressed={highlightScale}
                        title={highlightScale ? "Hide scale notes" : "Highlight scale notes"}
                        className={`px-5 py-2 rounded-full text-base font-extrabold shadow-sm ${
                          highlightScale
                            ? "bg-[var(--ink)] text-[#fff8ec]"
                            : "control-button"
                        }`}
                      >
                        {highlightScale ? "Hide scale" : "Highlight scale"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHighlightChordNotes(!highlightChordNotes)}
                        aria-pressed={highlightChordNotes}
                        title={highlightChordNotes ? "Hide chord notes" : "Highlight chord notes"}
                        className={`px-5 py-2 rounded-full text-base font-extrabold shadow-sm ${
                          highlightChordNotes
                            ? "bg-[var(--ink)] text-[#fff8ec]"
                            : "control-button"
                        }`}
                      >
                        {highlightChordNotes ? "Hide chord notes" : "Highlight chord notes"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="group relative flex w-full items-start gap-2 rounded-[32px] bg-[var(--surface-soft)]/50 px-3 pb-3 pt-2 shadow-inner" title="Bass to high">
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
                        <span className="flex h-7 min-w-9 items-center justify-center rounded-full border-2 border-[#fff8ec] bg-[var(--ink)] px-2 text-sm font-black leading-none text-[#fff8ec] shadow-[0_2px_6px_rgba(47,33,24,0.28)]">
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
                    title="Play selected voicing"
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

              <div className="mt-4 rounded-[24px] bg-[var(--fretboard-deep)] p-2 overflow-x-auto shadow-inner">
                <div className="relative min-w-[980px] rounded-[18px] overflow-hidden bg-[var(--fretboard)]">
                  <div
                    className="absolute left-0 w-[88px] rounded-[18px] bg-[var(--control)]"
                    style={{
                      top: `${FRETBOARD_HEADER_HEIGHT + 6}px`,
                      height: 'calc(100% - 56px)'
                    }}
                  />
                  <div className="absolute left-[96px] right-2 top-2 h-10 rounded-full bg-[var(--fretboard-deep)]" />
                  <div
                    className="relative grid items-end"
                    style={{ gridTemplateColumns: FRETBOARD_GRID }}
                  >
                    <div style={{ height: FRETBOARD_HEADER_HEIGHT }} />
                    {FRET_RANGE.map((fret) => (
                      <div
                        key={fret}
                        className="flex items-center justify-center"
                        style={{ height: FRETBOARD_HEADER_HEIGHT }}
                      >
                        <span className="text-sm font-extrabold text-[#e4c590]">
                          {fret}
                        </span>
                      </div>
                    ))}
                  </div>

                  {[...STRINGS.map((_, i) => i)].reverse().map((stringIndex) => {
                    const s = STRINGS[stringIndex]
                    const active = v?.find(x => x.string === stringIndex)

                    return (
                      <div
                        key={`${s}-${stringIndex}`}
                        className="relative grid items-center"
                        style={{ gridTemplateColumns: FRETBOARD_GRID }}
                      >
                        <div className="h-10 flex items-center px-3">
                          <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--ink)]">
                            <span>{s}</span>
                            <span className="min-w-6 h-6 rounded-full bg-[var(--fretboard)] px-2 flex items-center justify-center text-xs text-[#f7e5c7]">
                              {STRING_NO[stringIndex]}
                            </span>
                          </span>
                        </div>

                        {FRET_RANGE.map((fret) => {
                          const note = getFretNote(s, fret)
                          const displayNote = noteDisplayName(note, key, mode)
                          const isActive = active?.fret === fret
                          const notePitch = normalizeNote(note)
                          const isScaleNote = scaleNotes.has(notePitch)
                          const isChordNote = chordNotes.has(notePitch)
                          const showNote = showAllNotes || isActive || (highlightScale && isScaleNote) || (highlightChordNotes && isChordNote)
                          const noteMarkerColor = noteColor(note, key)
                          const isFlashing = flashingNoteIds.has(audioNoteId(stringIndex, fret))

                          return (
                            <div
                              key={fret}
                              className="h-10 relative flex items-center justify-center bg-[var(--fretboard)]"
                              style={{
                                borderRight: '4px solid var(--fretboard-line)',
                              }}
                            >
                              <div
                                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full bg-[var(--fretboard-deep)]"
                                style={{
                                  height: stringThickness(stringIndex),
                                }}
                              />

                              {showNote && (
                                <div
                                  className={`absolute z-10 rounded-full shadow-md flex items-center justify-center font-extrabold leading-none text-[var(--ink)] transition duration-150 ${noteMarkerColor} ${
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
          )}
        </div>

        <div className="surface-panel p-4">
          <div className="mb-3 text-lg font-black text-[var(--ink)]">Voicing</div>

          <div className="flex flex-col gap-2.5">
  {voicings.length === 0 && (
    <div className="surface-inset p-4 text-sm font-extrabold text-[var(--ink-soft)]">
      No voicing selected
    </div>
  )}
  {voicings.length > 0 && STRINGS.map((_, i) => i).reverse().map((i) => {
    const s = STRINGS[i]
    const f = v ? v.find(x => x.string === i) : null
    const status = !f ? "MUTED" : f.fret === 0 ? "OPEN" : `${f.fret}`

    return (
      <div
        key={i}
        className={`grid min-h-[72px] grid-cols-[62px_minmax(72px,1fr)_48px] items-center gap-2 rounded-[22px] px-3 py-2 shadow-sm ${
          f ? noteColor(f.note, key) : "bg-[var(--surface-muted)]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl font-black leading-none text-[var(--ink)]">{s}</div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] text-base font-black leading-none text-[#fff8ec] shadow-sm">
            {STRING_NO[i]}
          </div>
        </div>

        <div className="flex justify-center">
          <div className={`min-w-[72px] rounded-full px-3 py-2.5 text-center text-base font-black leading-none shadow-sm ${
            f ? "bg-[#fffaf0]/90 text-[var(--ink)]" : "bg-[var(--muted-badge)] text-[var(--muted-badge-text)]"
          }`}>
            {status}
          </div>
        </div>

        <div className="flex justify-end">
          <div className="hidden">
            {f ? f.fret : "\u2014"}
          </div>

          <div
            className={`${f ? "flex" : "hidden"} h-11 w-11 items-center justify-center rounded-full bg-[var(--ink)] text-xl font-black leading-none text-[#fff8ec] shadow-sm`}
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
