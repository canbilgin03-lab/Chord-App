'use client'

import { useMemo, useState } from 'react'
import {
  analyzeChord,
  buildDiatonicChords,
  buildProgressionSuggestions,
  buildScaleFromMode,
  getChordRoot,
  getFretNote,
  getNoteIndex,
  parseChordSymbol,
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
  return `${roman}${qualityDegreeSuffix(parsed.type)}`
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

function noteColor(note:string, key:string){
  const idx = getNoteIndex(note)
  const keyIdx = getNoteIndex(key)
  if(idx < 0 || keyIdx < 0) return COLORS[0]

  const diff = (idx - keyIdx + 12) % 12
  return COLORS[diff]
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
      setVoicings([])
      setVoicingIndex(0)
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

  function removeChord(index: number) {
    const next = [...progression]
    next.splice(index, 1)
    setProgression(next)

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
      setProgression(next)
    }
  }

  const current = selectedIndex !== null ? progression[selectedIndex] ?? null : null
  const v = voicings[voicingIndex]
  const canAddChord = inputChord.trim().length > 0
  const canResolveBackward = resolveWithin > RESOLVE_WITHIN_OPTIONS[0]
  const canResolveForward = resolveWithin < RESOLVE_WITHIN_OPTIONS[RESOLVE_WITHIN_OPTIONS.length - 1]
  const canStepStringsBackward = inputStrings > STRING_COUNTS[0]
  const canStepStringsForward = inputStrings < STRING_COUNTS[STRING_COUNTS.length - 1]
  const canStepVoicingBackward = voicingIndex > 0
  const canStepVoicingForward = voicings.length > 0 && voicingIndex < voicings.length - 1
  const scaleNotes = useMemo(() => {
    return new Set(buildScaleFromMode(key, mode))
  }, [key, mode])

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-3 space-y-3">

      <div className="grid grid-cols-1 xl:grid-cols-[540px_minmax(0,1fr)] gap-3">
        <div className="surface-panel flex h-full flex-col gap-4 p-4">
          <div className="surface-inset flex flex-1 flex-col justify-center p-3">
            <div className="label-text text-sm font-extrabold mb-2">Key</div>
            <div className="grid grid-cols-6 gap-2">
              {KEY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setKey(option)}
                  aria-pressed={key === option}
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

          <div className="surface-inset flex flex-1 flex-col justify-center p-3">
            <div className="label-text text-sm font-extrabold mb-2">Mode</div>
            <div className="grid grid-cols-8 gap-2">
              {MODE_OPTIONS.map((option, i) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  aria-pressed={mode === option.value}
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

          <div className="progression-scroll max-w-full overflow-x-auto overflow-y-hidden pl-2 pr-5 pt-6 pb-4">
          <div className="flex h-[104px] w-max items-start gap-3 pr-3">
            {progression.map((c, i) => {
  const degree = getDegree(c.chord, key)
  const canMoveLeft = i > 0
  const canMoveRight = i < progression.length - 1

  return (
    <div key={i} className="flex flex-col items-center gap-2">

      <div className="relative">
        <button
          type="button"
          className={`relative px-6 py-3 text-xl font-extrabold rounded-full border-2 border-[var(--ink)] shadow cursor-pointer flex items-center gap-3 transition ${chordColor(c.chord, key)} ${i === selectedIndex ? "ring-4 ring-[var(--ink)]/70" : ""}`}
          onClick={() => selectChord(i)}
          aria-pressed={i === selectedIndex}
          aria-label={`Select ${c.chord}`}
        >
          <span className="text-xl tracking-tight">{c.chord}</span>

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
          aria-label={`Remove ${c.chord}`}
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
          aria-label={`Move ${c.chord} left`}
          className={`control-button text-sm font-bold px-3 py-2 rounded-full ${canMoveLeft ? "" : "cursor-not-allowed opacity-45"}`}
        >
          {"\u2190"}
        </button>

        <button
          type="button"
          onClick={() => moveChord(i, 1)}
          disabled={!canMoveRight}
          aria-label={`Move ${c.chord} right`}
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
                  onKeyDown={(e) => {
                    if(e.key === "Enter") addChord()
                  }}
                  placeholder="Type chord . . ."
                  aria-label="Chord name"
                  className="h-11 w-64 rounded-2xl border border-[var(--line-soft)] bg-[var(--control-soft)]/65 px-4 text-[15px] font-bold text-[var(--ink)] shadow-inner outline-none transition placeholder:text-[var(--ink-soft)]/55 focus:border-[var(--control)] focus:bg-[var(--control-soft)]/80 focus:placeholder:text-transparent focus:ring-4 focus:ring-[var(--control)]/20"
                />
                <button
                  type="button"
                  onClick={addChord}
                  disabled={!canAddChord}
                  aria-label="Add chord"
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
                  className={`control-button h-11 w-11 rounded-full ${canResolveForward ? "" : "cursor-not-allowed opacity-45"}`}
                >
                  {"\u2192"}
                </button>
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
                    <button type="button" key={s} onClick={() => addSuggestion(s)} aria-label={`Add ${s}`} className={`${chordColor(s, key)} ${i === 4 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl px-2 py-2 text-[15px] font-black shadow-sm border border-[var(--ink)]/15 hover:brightness-95 flex items-center justify-center gap-1.5 min-w-0 transition`}>
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
                    <button type="button" key={s} onClick={() => addSuggestion(s)} aria-label={`Add ${s}`} className={`${chordColor(s, key)} ${i === 3 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl px-3 py-2 text-base font-black shadow-sm border border-[var(--ink)]/15 hover:brightness-95 flex items-center justify-center gap-2 min-w-0 transition`}>
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
                    <button type="button" key={s} onClick={() => addSuggestion(s)} aria-label={`Add ${s}`} className={`${chordColor(s, key)} ${i === 3 ? "col-start-2" : ""} col-span-2 min-h-10 rounded-2xl px-3 py-2 text-base font-black shadow-sm border border-[var(--ink)]/15 hover:brightness-95 flex items-center justify-center gap-2 min-w-0 transition`}>
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
              <div className={`text-3xl font-extrabold mb-3 px-5 py-2 rounded-2xl shadow-sm ${chordColor(current.chord, key)}`}>{current.chord}</div>

              <div className="flex flex-wrap items-end gap-3 mb-3 text-base font-bold">
                <div>
                  <div className="label-text text-sm font-extrabold mb-2">Voicing</div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateVoicingIndex(voicingIndex - 1)}
                      disabled={!canStepVoicingBackward}
                      aria-label="Previous voicing"
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
                      className={`px-5 py-2 rounded-full text-base font-extrabold shadow-sm ${
                        highlightScale
                          ? "bg-[var(--ink)] text-[#fff8ec]"
                          : "control-button"
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
                    <div key={i} className={`w-[88px] h-[88px] rounded-full p-2 flex flex-col items-center justify-center shadow-[0_2px_7px_rgba(47,33,24,0.18)] ${f ? noteColor(f.note, key) : "bg-[var(--surface-muted)]"}`}>
                      <div className="text-xs font-extrabold tracking-wide text-[var(--ink)] mb-1.5">{s} ({STRING_NO[i]})</div>
                      <div className={`min-w-[54px] rounded-full px-3 py-1 text-xs font-extrabold leading-none text-center shadow-sm ${f ? "bg-[#fffaf0]/90 text-[var(--ink)]" : "bg-[var(--muted-badge)] text-[var(--muted-badge-text)]"}`}>
                        {f ? `Fret ${f.fret}` : "x"}
                      </div>
                      <div className={`mt-2 min-w-[28px] rounded-full px-3 py-1 text-xs font-bold leading-none text-center shadow-sm ${f ? "bg-[var(--ink)]/15 text-[var(--ink)]" : "bg-[var(--ink)]/10 text-[var(--ink-soft)]"}`}>
                        {f ? f.note : "\u2014"}
                      </div>
                    </div>
                  )
                })}
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
                          const isActive = active?.fret === fret
                          const isScaleNote = scaleNotes.has(note)
                          const showNote = showAllNotes || isActive || (highlightScale && isScaleNote)
                          const noteMarkerColor = noteColor(note, key)

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
                                  className={`absolute z-10 rounded-full shadow-md flex items-center justify-center font-extrabold leading-none text-[var(--ink)] ${noteMarkerColor} ${
                                    isActive
                                      ? "w-9 h-9 text-base border-[3px] border-[#fffaf0]"
                                      : `w-7 h-7 text-xs ${
                                          highlightScale && isScaleNote
                                            ? "border-[3px] border-[#fffaf0] ring-2 ring-[var(--ink)]/45"
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

        <div className="surface-panel p-4">
          <div className="mb-3 text-lg font-black text-[var(--ink)]">Fretboard</div>

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
            {f ? f.note : "\u2014"}
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
