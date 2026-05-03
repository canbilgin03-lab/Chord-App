'use client'

import { useMemo, useState } from 'react'
import { analyzeChord, buildDiatonicChords, buildProgressionSuggestions, buildScaleFromMode, type Fret } from '@/app/lib/chordEngine'

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

/* ---------------- NEW: COLOR + DEGREE HELPERS ---------------- */

const NOTE_ORDER = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

function normalize(note:string){
  const clean = note.trim()
  const canonical = clean.charAt(0).toUpperCase() + clean.slice(1)
  const map: Record<string, string> = {Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"}
  return map[canonical] || canonical
}

type ParsedChordName = {
  root: string
  quality: "maj" | "m" | "7" | "maj7" | "m7" | "m7b5" | "dim" | "dim7" | "sus2" | "sus4" | "7sus2" | "7sus4" | "aug"
}

function parseChordName(chord: string): ParsedChordName | null {
  const rootMatch = chord.match(/^([A-G](?:#|b)?)/i)
  if(!rootMatch) return null

  const root = normalize(rootMatch[1])
  const tail = chord.slice(rootMatch[0].length).toLowerCase()

  if(tail.includes("m7b5")) return { root, quality: "m7b5" }
  if(tail.includes("dim7")) return { root, quality: "dim7" }
  if(tail.includes("dim")) return { root, quality: "dim" }
  if(tail.includes("7sus2")) return { root, quality: "7sus2" }
  if(tail.includes("7sus4")) return { root, quality: "7sus4" }
  if(tail.includes("sus2")) return { root, quality: "sus2" }
  if(tail.includes("sus4")) return { root, quality: "sus4" }
  if(tail.includes("aug") || tail.includes("+")) return { root, quality: "aug" }
  if(tail.includes("maj7")) return { root, quality: "maj7" }
  if(tail.includes("m7")) return { root, quality: "m7" }
  if(tail.includes("7")) return { root, quality: "7" }
  if(tail.includes("m")) return { root, quality: "m" }

  return { root, quality: "maj" }
}

function romanForQuality(roman: string, quality: ParsedChordName["quality"]) {
  if(quality === "m" || quality === "m7" || quality === "m7b5") {
    return roman.toLowerCase()
  }

  if(quality === "dim" || quality === "dim7") {
    return roman.toLowerCase()
  }

  return roman
}

function qualityDegreeSuffix(quality: ParsedChordName["quality"]) {
  const suffixes: Record<ParsedChordName["quality"], string> = {
    maj: "",
    m: "",
    "7": "7",
    maj7: "Δ7",
    m7: "7",
    m7b5: "ø7",
    dim: "°",
    dim7: "°7",
    sus2: "sus2",
    sus4: "sus4",
    "7sus2": "7sus2",
    "7sus4": "7sus4",
    aug: "+"
  }

  return suffixes[quality]
}

function getDegree(chord:string, key:string){
  const parsed = parseChordName(chord)
  if(!parsed) return null

  const rootIdx = NOTE_ORDER.indexOf(parsed.root)
  const keyIdx = NOTE_ORDER.indexOf(normalize(key))

  const diff = (rootIdx - keyIdx + 12) % 12

  const MAP: Record<number, string> = {
    0:"I",
    1:"♭II",
    2:"II",
    3:"♭III",
    4:"III",
    5:"IV",
    6:"♯IV",
    7:"V",
    8:"♭VI",
    9:"VI",
    10:"♭VII",
    11:"VII"
  }

  const roman = romanForQuality(MAP[diff], parsed.quality)
  return `${roman}${qualityDegreeSuffix(parsed.quality)}`
}

function getChordRoot(chord:string){
  const rootMatch = chord.match(/^([A-G](?:#|b)?)/i)
  if(!rootMatch) return null
  return normalize(rootMatch[1])
}

const COLORS = [
  "bg-[#e85d50]",
  "bg-[#ee7d42]",
  "bg-[#f0a23e]",
  "bg-[#e8c84d]",
  "bg-[#b9d957]",
  "bg-[#76c86b]",
  "bg-[#45bd88]",
  "bg-[#3fb8b2]",
  "bg-[#4a9fe0]",
  "bg-[#7475d8]",
  "bg-[#a66dd6]",
  "bg-[#d767a5]"
]

function chordColor(chord:string, key:string){
  const root = getChordRoot(chord)
  if(!root) return COLORS[0]

  const rootIdx = NOTE_ORDER.indexOf(root)
  const keyIdx = NOTE_ORDER.indexOf(normalize(key))
  const diff = (rootIdx - keyIdx + 12) % 12

  return COLORS[diff]
}

function noteColor(note:string, key:string){
  const idx = NOTE_ORDER.indexOf(normalize(note))
  const keyIdx = NOTE_ORDER.indexOf(normalize(key))
  const diff = (idx - keyIdx + 12) % 12
  return COLORS[diff]
}

function fretNote(open:string, fret:number){
  const idx = NOTE_ORDER.indexOf(normalize(open))
  return NOTE_ORDER[(idx + fret) % 12]
}

function stringThickness(stringIndex: number) {
  return `${7 - stringIndex}px`
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
      return
    }

    setSelectedIndex(idx)
    setInputChord(item.chord)
    setInputStrings(item.strings)
    setVoicingIndex(item.voicingIndex ?? 0)
    computeVoicings(item)
  }

  function updateChord(val: string) {
    setInputChord(val)
    if (selectedIndex === null) return

    const next = [...progression]
    next[selectedIndex] = { ...next[selectedIndex], chord: val }
    setProgression(next)
    computeVoicings(next[selectedIndex])
  }

  function updateStrings(val: number) {
    setInputStrings(val)
    if (selectedIndex === null) return

    const next = [...progression]
    next[selectedIndex] = { ...next[selectedIndex], strings: val }
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

  function addChord() {
    const clean = inputChord.trim()
    if (!clean) return

    const next = [...progression, { chord: clean, strings: inputStrings, voicingIndex: 0 }]
    setProgression(next)

    const i = next.length - 1
    setSelectedIndex(i)
    setVoicingIndex(0)
    computeVoicings(next[i])
  }

  function addSuggestion(chord: string) {
    const next = [...progression, { chord, strings: 4, voicingIndex: 0 }]
    setProgression(next)

    const i = next.length - 1
    setSelectedIndex(i)
    setInputChord(chord)
    setInputStrings(4)
    setVoicingIndex(0)
    computeVoicings(next[i])
  }

  const current = selectedIndex !== null ? progression[selectedIndex] : null
  const v = voicings[voicingIndex]
  const scaleNotes = useMemo(() => {
    return new Set(buildScaleFromMode(key, mode))
  }, [key, mode])

  return (
    <main className="min-h-screen bg-[#eadcc8] text-[#21170f] p-3 space-y-3">

      <div className="grid grid-cols-1 xl:grid-cols-[540px_minmax(0,1fr)] gap-3">
        <div className="bg-[#f4eadb] border-2 border-[#b9966a] rounded-[24px] p-4 shadow-[0_8px_20px_rgba(58,38,23,0.08)] flex h-full flex-col gap-4">
          <div className="flex flex-1 flex-col justify-center rounded-[20px] border border-[#b9966a]/70 bg-[#eadcc8]/70 p-3 shadow-inner">
            <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Key</div>
            <div className="grid grid-cols-6 gap-2">
              {KEY_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setKey(option)}
                  className={`min-h-10 rounded-2xl px-3 py-2 text-sm font-black shadow-sm border border-[#3a2617]/20 hover:brightness-95 ${
                    key === option
                      ? "bg-[#3a2617] text-[#fff7eb]"
                      : "bg-[#e1cfb2] text-[#24170f]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center rounded-[20px] border border-[#b9966a]/70 bg-[#eadcc8]/70 p-3 shadow-inner">
            <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Mode</div>
            <div className="grid grid-cols-8 gap-2">
              {MODE_OPTIONS.map((option, i) => (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  className={`${i === 4 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl px-3 py-2 text-sm font-black shadow-sm border border-[#3a2617]/20 hover:brightness-95 ${
                    mode === option.value
                      ? "bg-[#3a2617] text-[#fff7eb]"
                      : "bg-[#e1cfb2] text-[#24170f]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 bg-[#f4eadb] border-2 border-[#b9966a] rounded-[24px] p-4 shadow-[0_8px_20px_rgba(58,38,23,0.08)] space-y-3">
          <div className="flex justify-between text-sm font-extrabold text-[#6b4b2f]">
            <span>Progression</span>
          </div>

          <div className="progression-scroll max-w-full overflow-x-auto overflow-y-hidden pt-4 pb-3">
          <div className="flex h-[90px] w-max items-start gap-3 pr-3">
            {progression.map((c, i) => {
  const degree = getDegree(c.chord, key)

  return (
    <div key={i} className="flex flex-col items-center gap-2">

      <div className="relative">
        <div
          className={`relative px-6 py-3 text-xl font-extrabold rounded-full border-2 border-[#3a2617] shadow cursor-pointer flex items-center gap-3 ${chordColor(c.chord, key)} ${i === selectedIndex ? "ring-4 ring-[#3a2617]/75" : ""}`}
          onClick={() => selectChord(i)}
        >
          <span className="text-xl tracking-tight">{c.chord}</span>

          {degree && (
            <span className="text-base font-extrabold bg-[#3a2617] text-[#fff7eb] rounded-full px-4 py-1 shadow-sm">
              {degree}
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            const next = [...progression]
            next.splice(i, 1)
            setProgression(next)
            if (selectedIndex === i) setSelectedIndex(null)
          }}
          className="absolute -top-2 -right-2 w-7 h-7 text-sm bg-[#3a2617] text-[#fff7eb] rounded-full flex items-center justify-center shadow"
        >
          ×
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            if (i === 0) return
            const next = [...progression]
            ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
            setProgression(next)
            setSelectedIndex(i - 1)
          }}
          className="text-sm font-bold px-3 py-2 bg-[#c7aa7c] text-[#24170f] rounded-full shadow-sm"
        >
          ←
        </button>

        <button
          onClick={() => {
            if (i === progression.length - 1) return
            const next = [...progression]
            ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
            setProgression(next)
            setSelectedIndex(i + 1)
          }}
          className="text-sm font-bold px-3 py-2 bg-[#c7aa7c] text-[#24170f] rounded-full shadow-sm"
        >
          →
        </button>
      </div>

    </div>
  )
})}
          </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Add Chord</div>
              <div className="flex max-w-[360px] gap-3">
                <input value={inputChord} onChange={(e) => updateChord(e.target.value)} placeholder="Chord" className="w-64 px-4 py-3 text-base font-semibold border-2 rounded-2xl bg-[#fff7eb] border-[#b9966a] text-[#24170f]" />
                <button onClick={addChord} className="h-11 w-14 rounded-2xl bg-[#c7aa7c] text-xl font-black text-[#24170f] shadow-sm">+</button>
              </div>
            </div>

            <div>
              <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Resolve In</div>
              <div className="flex items-center gap-3">
                <button onClick={() => stepResolveWithin(-1)} className="px-4 py-2 rounded-full bg-[#c7aa7c] text-[#24170f] shadow-sm">←</button>
                <span className="min-w-12 px-4 py-2 rounded-full bg-[#e1cfb2] text-center font-black text-[#3a2617]">{resolveWithin}</span>
                <button onClick={() => stepResolveWithin(1)} className="px-4 py-2 rounded-full bg-[#c7aa7c] text-[#24170f] shadow-sm">→</button>
              </div>
            </div>
          </div>

          <div>
          <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Harmony Suggestions</div>
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="rounded-[20px] border border-[#b9966a]/70 bg-[#eadcc8]/70 p-2.5 shadow-inner">
              <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Chords of the Key</div>
              <div className="grid grid-cols-8 gap-2">
                {keyChords.map((s: string, i: number) => {
                  const degree = getDegree(s, key)

                  return (
                    <button key={s} onClick={() => addSuggestion(s)} className={`${chordColor(s, key)} ${i === 4 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl px-2 py-2 text-[15px] font-black shadow-sm border border-[#3a2617]/20 hover:brightness-95 flex items-center justify-center gap-1.5 min-w-0`}>
                      <span className="truncate">{s}</span>
                      {degree && (
                        <span className="shrink-0 rounded-full bg-[#3a2617] px-2 py-1 text-[11px] font-black leading-none text-[#fff7eb]">
                          {degree}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#b9966a]/70 bg-[#eadcc8]/70 p-2.5 shadow-inner">
              <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Simple Suggestions</div>
              <div className="grid grid-cols-6 gap-3">
                {progressionSuggestions.simple.map((s: string, i: number) => {
                  const degree = getDegree(s, key)

                  return (
                    <button key={s} onClick={() => addSuggestion(s)} className={`${chordColor(s, key)} ${i === 3 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl px-3 py-2 text-base font-black shadow-sm border border-[#3a2617]/20 hover:brightness-95 flex items-center justify-center gap-2 min-w-0`}>
                      <span className="truncate">{s}</span>
                      {degree && (
                        <span className="shrink-0 rounded-full bg-[#3a2617] px-2 py-1 text-[11px] font-black leading-none text-[#fff7eb]">
                          {degree}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#b9966a]/70 bg-[#eadcc8]/70 p-2.5 shadow-inner">
              <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Complex Suggestions</div>
              <div className="grid grid-cols-6 gap-3">
                {progressionSuggestions.complex.map((s: string, i: number) => {
                  const degree = getDegree(s, key)

                  return (
                    <button key={s} onClick={() => addSuggestion(s)} className={`${chordColor(s, key)} ${i === 3 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl px-3 py-2 text-base font-black shadow-sm border border-[#3a2617]/20 hover:brightness-95 flex items-center justify-center gap-2 min-w-0`}>
                      <span className="truncate">{s}</span>
                      {degree && (
                        <span className="shrink-0 rounded-full bg-[#3a2617] px-2 py-1 text-[11px] font-black leading-none text-[#fff7eb]">
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
        <div className="bg-[#f4eadb] border-2 border-[#b9966a] rounded-[24px] p-4 shadow-[0_8px_20px_rgba(58,38,23,0.08)]">
          {!current && <div className="text-2xl font-extrabold text-[#3a2617]">Add a chord</div>}

          {current && (
            <>
              <div className={`text-3xl font-extrabold mb-3 px-5 py-2 rounded-2xl shadow-sm ${chordColor(current.chord, key)}`}>{current.chord}</div>

              <div className="flex flex-wrap items-end gap-3 mb-3 text-base font-bold">
                <div>
                  <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Voicing</div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => {
                      const nextIndex = Math.max(0, voicingIndex - 1)
                      setVoicingIndex(nextIndex)
                      if (selectedIndex !== null && progression[selectedIndex]) {
                        const next = [...progression]
                        next[selectedIndex] = { ...next[selectedIndex], voicingIndex: nextIndex }
                        setProgression(next)
                      }
                    }} className="px-4 py-2 rounded-full bg-[#c7aa7c] text-[#24170f] shadow-sm">←</button>
                    <span className="px-4 py-2 rounded-full bg-[#e1cfb2] text-[#3a2617]">{voicingIndex + 1}/{voicings.length}</span>
                    <button onClick={() => {
                      const nextIndex = Math.min(voicings.length - 1, voicingIndex + 1)
                      setVoicingIndex(nextIndex)
                      if (selectedIndex !== null && progression[selectedIndex]) {
                        const next = [...progression]
                        next[selectedIndex] = { ...next[selectedIndex], voicingIndex: nextIndex }
                        setProgression(next)
                      }
                    }} className="px-4 py-2 rounded-full bg-[#c7aa7c] text-[#24170f] shadow-sm">→</button>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Strings</div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => stepStrings(-1)} className="px-4 py-2 rounded-full bg-[#c7aa7c] text-[#24170f] shadow-sm">←</button>
                    <span className="px-4 py-2 rounded-full bg-[#e1cfb2] text-[#3a2617]">{inputStrings}</span>
                    <button onClick={() => stepStrings(1)} className="px-4 py-2 rounded-full bg-[#c7aa7c] text-[#24170f] shadow-sm">→</button>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-extrabold mb-2 text-[#6b4b2f]">Notes</div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowAllNotes(!showAllNotes)}
                      className={`px-5 py-2 rounded-full text-base font-extrabold shadow-sm ${
                        showAllNotes
                          ? "bg-[#3a2617] text-[#fff7eb]"
                          : "bg-[#c7aa7c] text-[#24170f]"
                      }`}
                    >
                      {showAllNotes ? "Hide all notes" : "Show all notes"}
                    </button>
                    <button
                      onClick={() => setHighlightScale(!highlightScale)}
                      className={`px-5 py-2 rounded-full text-base font-extrabold shadow-sm ${
                        highlightScale
                          ? "bg-[#3a2617] text-[#fff7eb]"
                          : "bg-[#c7aa7c] text-[#24170f]"
                      }`}
                    >
                      {highlightScale ? "Hide scale" : "Highlight scale"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                {STRINGS.map((s, i) => {
                  const f = v?.find(x => x.string === i)
                  return (
                    <div key={i} className={`w-[88px] h-[88px] border-[3px] border-[#3a2617] rounded-full p-2 flex flex-col items-center justify-center shadow ${f ? noteColor(f.note, key) : "bg-[#cfc2ae]"}`}>
                      <div className="text-xs font-extrabold tracking-wide text-[#2a1c12] mb-1.5">{s} ({STRING_NO[i]})</div>
                      <div className={`min-w-[54px] rounded-full px-3 py-1 text-xs font-extrabold leading-none text-center shadow-sm ${f ? "bg-[#fff7eb]/90 text-[#24170f]" : "bg-[#e1cfb2] text-[#6b4b2f]"}`}>
                        {f ? `Fret ${f.fret}` : "x"}
                      </div>
                      <div className={`mt-2 min-w-[28px] rounded-full px-3 py-1 text-xs font-bold leading-none text-center shadow-sm ${f ? "bg-[#3a2617]/15 text-[#111]" : "bg-[#3a2617]/10 text-[#6b4b2f]"}`}>
                        {f ? f.note : "—"}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 rounded-[28px] bg-[#5a4b35] p-2 overflow-x-auto shadow-inner">
                <div className="relative min-w-[980px] rounded-[22px] overflow-hidden bg-[#57462f]">
                  <div
                    className="absolute left-0 w-[88px] rounded-[22px] bg-[#caa46f]"
                    style={{
                      top: `${FRETBOARD_HEADER_HEIGHT + 6}px`,
                      height: 'calc(100% - 56px)'
                    }}
                  />
                  <div className="absolute left-[96px] right-2 top-2 h-10 rounded-full bg-[#473522]" />
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
                        <span className="text-sm font-extrabold text-[#d5b582]">
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
                          <span className="flex items-center gap-2 text-sm font-extrabold text-[#2f2417]">
                            <span>{s}</span>
                            <span className="min-w-6 h-6 rounded-full bg-[#57462f] px-2 flex items-center justify-center text-xs text-[#f2dfbd]">
                              {STRING_NO[stringIndex]}
                            </span>
                          </span>
                        </div>

                        {FRET_RANGE.map((fret) => {
                          const note = fretNote(s, fret)
                          const isActive = active?.fret === fret
                          const isScaleNote = scaleNotes.has(note)
                          const showNote = showAllNotes || isActive || (highlightScale && isScaleNote)
                          const noteMarkerColor = noteColor(note, key)

                          return (
                            <div
                              key={fret}
                              className="h-10 relative flex items-center justify-center bg-[#57462f]"
                              style={{
                                borderRight: '4px solid #ab8754',
                              }}
                            >
                              <div
                                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full bg-[#2d251b]"
                                style={{
                                  height: stringThickness(stringIndex),
                                }}
                              />

                              {showNote && (
                                <div
                                  className={`absolute z-10 rounded-full shadow-md flex items-center justify-center font-extrabold leading-none text-[#24170f] ${noteMarkerColor} ${
                                    isActive
                                      ? "w-9 h-9 text-base border-[3px] border-[#fff7eb]"
                                      : `w-7 h-7 text-xs ${
                                          highlightScale && isScaleNote
                                            ? "border-[3px] border-[#fff7eb] ring-2 ring-[#24170f]/45"
                                            : highlightScale
                                              ? "opacity-35"
                                              : "opacity-85"
                                        }`
                                  }`}
                                >
                                  {note}
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

        <div className="bg-[#f4eadb] border-2 border-[#b9966a] rounded-[24px] p-4 shadow-[0_8px_20px_rgba(58,38,23,0.08)]">
          <div className="mb-3 text-lg font-black text-[#3a2617]">Fretboard</div>

          <div className="flex flex-col gap-2.5">
  {voicings.length > 0 && STRINGS.map((_, i) => i).reverse().map((i) => {
    const s = STRINGS[i]
    const f = v ? v.find(x => x.string === i) : null
    const status = !f ? "MUTED" : f.fret === 0 ? "OPEN" : `${f.fret}`

    return (
      <div
        key={i}
        className={`grid min-h-[72px] grid-cols-[62px_minmax(72px,1fr)_48px] items-center gap-2 rounded-[22px] px-3 py-2 shadow-sm ${
          f ? noteColor(f.note, key) : "bg-[#cfc2ae]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl font-black leading-none text-[#24170f]">{s}</div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3a2617] text-base font-black leading-none text-[#fff7eb] shadow-sm">
            {STRING_NO[i]}
          </div>
        </div>

        <div className="flex justify-center">
          <div className={`min-w-[72px] rounded-full px-3 py-2.5 text-center text-base font-black leading-none shadow-sm ${
            f ? "bg-[#fff7eb]/90 text-[#24170f]" : "bg-[#e6d8c3] text-[#5a4632]"
          }`}>
            {status}
          </div>
        </div>

        <div className="flex justify-end">
          <div className="hidden">
            {f ? f.fret : "—"}
          </div>

          <div
            className={`${f ? "flex" : "hidden"} h-11 w-11 items-center justify-center rounded-full bg-[#3a2617] text-xl font-black leading-none text-[#fff7eb] shadow-sm`}
          >
            {f ? f.note : "—"}
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
