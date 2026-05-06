export type AudioDirection = "down" | "up"
export type AudioSpeed = "quick" | "tight" | "easy" | "slow"
export type AudioPlaybackMode = "strum" | "chord"
export type AudioStrokeDirection = AudioDirection | "bass"
export type AudioStrumPattern = "P1" | "P2" | "P3" | "P4"

export type AudioPatternStroke = {
  direction: AudioStrokeDirection
  target?: "all" | "rest"
  gapMultiplier?: number
  gridPosition?: number
  spreadMultiplier?: number
  accent?: number
}

export type TimelineNote = {
  note: string
  stringIndex: number
}

export type ScheduledAudioEvent<TNote extends TimelineNote = TimelineNote> = {
  note: TNote
  timeOffset: number
  duration: number
  velocity: number
}

export type StrokeTimeline<TNote extends TimelineNote = TimelineNote> = {
  stroke: AudioPatternStroke
  notes: TNote[]
  events: ScheduledAudioEvent<TNote>[]
  availableWindowMs: number
  durationMs: number
  perStringDelayMs: number
  strokeDurationMs: number
}

export type PatternTimeline<TNote extends TimelineNote = TimelineNote> = {
  timeline: Array<StrokeTimeline<TNote> & { strokeIndex: number; strokeStartMs: number }>
  events: ScheduledAudioEvent<TNote>[]
  durationMs: number
  patternEndMs: number
}

type StringIndexed = {
  string?: number
  stringIndex?: number
}

type TimelineOptions = {
  availableWindowMs?: number
  isMultiStrokePattern?: boolean
  noteLengthMs?: number
  patternTempo?: number
  releaseTailMs?: number
  rhythmStepMs?: number
}

export const AUDIO_STRUM_PATTERN_OPTIONS = ["P1", "P2", "P3", "P4"] as const

export const AUDIO_STRUM_PATTERNS: Record<AudioStrumPattern, AudioPatternStroke[]> = {
  P1: [
    { direction: "down", gridPosition: 0, spreadMultiplier: 1, accent: 0.04 }
  ],
  P2: [
    { direction: "down", gridPosition: 0, spreadMultiplier: 1, accent: 0.04 },
    { direction: "up", gridPosition: 0.75, spreadMultiplier: 1, accent: -0.03 }
  ],
  P3: [
    { direction: "down", gridPosition: 0, spreadMultiplier: 1, accent: 0.04 },
    { direction: "down", gridPosition: 0.85, spreadMultiplier: 1, accent: 0.02 }
  ],
  P4: [
    { direction: "bass", gridPosition: 0, spreadMultiplier: 0, accent: 0.06 },
    { direction: "down", gridPosition: 0.6, spreadMultiplier: 1, accent: 0.03 }
  ]
}

export const AUDIO_STRUM_PATTERN_SPEEDS: Record<AudioStrumPattern, number> = {
  P1: 1,
  P2: 1,
  P3: 1,
  P4: 1
}

const AUDIO_STRING_STEP_MS: Record<AudioSpeed, number> = {
  quick: 60,
  tight: 90,
  easy: 130,
  slow: 185
}

const AUDIO_RHYTHM_STEP_MS: Record<AudioSpeed, number> = {
  quick: 520,
  tight: 720,
  easy: 960,
  slow: 1320
}

const AUDIO_STRUM_NOTE_LENGTH_MS: Record<AudioSpeed, number> = {
  quick: 480,
  tight: 650,
  easy: 860,
  slow: 1120
}

const AUDIO_STRUM_RELEASE_TAIL_MS: Record<AudioSpeed, number> = {
  quick: 360,
  tight: 480,
  easy: 620,
  slow: 800
}

const MULTI_STROKE_NOTE_LENGTH_SCALE = 0.82

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, value))
}

function stringIndexOf(entry: StringIndexed) {
  return typeof entry.stringIndex === "number" ? entry.stringIndex : entry.string
}

function strokeDirection(stroke: AudioPatternStroke): AudioDirection {
  return stroke.direction === "up" ? "up" : "down"
}

function notesForStroke<TNote extends TimelineNote>(notes: TNote[], stroke: AudioPatternStroke) {
  if(notes.length === 0) return []
  if(stroke.direction === "bass") return [orderNotesForStroke(notes, "down")[0]]
  if(stroke.target === "rest") return orderNotesForStroke(notes, "down").slice(1)
  return notes
}

function strumNoteDurationMs(
  speed: AudioSpeed,
  playedStringsCount: number,
  direction: AudioDirection,
  stringIndex: number,
  availableWindowMs: number,
  isMultiStrokePattern: boolean
) {
  const denseFactor = playedStringsCount >= 6
    ? 0.82
    : playedStringsCount === 5
      ? 0.88
      : playedStringsCount === 4
        ? 0.94
        : 1
  const directionFactor = direction === "up" ? 0.86 : 1
  const lowStringFactor = playedStringsCount >= 5 && stringIndex <= 1 ? 0.82 : 1
  const patternFactor = isMultiStrokePattern ? MULTI_STROKE_NOTE_LENGTH_SCALE : 1
  const rawDurationMs = AUDIO_STRUM_NOTE_LENGTH_MS[speed] * denseFactor * directionFactor * lowStringFactor * patternFactor
  const windowLimitMs = Number.isFinite(availableWindowMs)
    ? availableWindowMs * (isMultiStrokePattern ? 0.52 : 1)
    : AUDIO_STRUM_NOTE_LENGTH_MS[speed]
  const minimumDurationMs = isMultiStrokePattern ? 150 : 220

  return clamp(minimumDurationMs / 1000, AUDIO_STRUM_NOTE_LENGTH_MS[speed] / 1000, Math.min(rawDurationMs, windowLimitMs) / 1000)
}

function strumVelocity(
  note: TimelineNote,
  direction: AudioDirection,
  noteIndex: number,
  playedStringsCount: number,
  stroke: AudioPatternStroke
) {
  const progress = playedStringsCount > 1 ? noteIndex / (playedStringsCount - 1) : 0
  const densityScale = clamp(0.72, 1, 1 - Math.max(0, playedStringsCount - 3) * 0.05)
  const directionWeight = direction === "down" ? 0.05 : -0.07
  const travelAccent = direction === "down"
    ? (1 - progress) * 0.035
    : (1 - progress) * 0.012
  const lowBuildUpTrim = playedStringsCount >= 5 && note.stringIndex <= 1 ? -0.085 : 0
  const highUpstrokeTrim = direction === "up" && note.stringIndex >= 4 ? -0.045 : 0

  return clamp(
    0.38,
    0.82,
    0.67 * densityScale + directionWeight + travelAccent + lowBuildUpTrim + highUpstrokeTrim + (stroke.accent ?? 0)
  )
}

export function getPlayedStrings<T extends StringIndexed>(voicing: T[]) {
  return [...new Set(voicing
    .map((entry) => stringIndexOf(entry))
    .filter((value): value is number => typeof value === "number"))]
    .sort((a, b) => a - b)
}

export function getStringSpan<T extends StringIndexed>(voicing: T[]) {
  const playedStrings = getPlayedStrings(voicing)
  if(playedStrings.length <= 1) return 0
  return playedStrings[playedStrings.length - 1] - playedStrings[0]
}

export function orderNotesForStroke<T extends TimelineNote>(notes: T[], direction: AudioDirection) {
  const stringOrdered = [...notes].sort((a, b) => a.stringIndex - b.stringIndex)
  return direction === "down" ? stringOrdered : stringOrdered.reverse()
}

export function buildStrokeTimeline<TNote extends TimelineNote>(
  stroke: AudioPatternStroke,
  notes: TNote[],
  speed: AudioSpeed,
  span: number,
  options: TimelineOptions = {}
): StrokeTimeline<TNote> {
  void span
  const strokeNotes = notesForStroke(notes, stroke)
  const direction = strokeDirection(stroke)
  const ordered = orderNotesForStroke(strokeNotes, direction)
  const playedStringsCount = getPlayedStrings(strokeNotes).length
  const availableWindowMs = Math.max(0, options.availableWindowMs ?? Infinity)
  const spreadMultiplier = Math.max(0, stroke.spreadMultiplier ?? 1)
  const perStringDelayMs = playedStringsCount > 1
    ? AUDIO_STRING_STEP_MS[speed] * Math.max(1, spreadMultiplier)
    : 0
  const strokeDurationMs = perStringDelayMs * Math.max(0, playedStringsCount - 1)
  const events = ordered.map((note, noteIndex) => {
    const timeOffsetMs = noteIndex * perStringDelayMs
    const noteDuration = options.noteLengthMs
      ? options.noteLengthMs / 1000
      : strumNoteDurationMs(
        speed,
        playedStringsCount,
        direction,
        note.stringIndex,
        availableWindowMs,
        Boolean(options.isMultiStrokePattern)
      )

    return {
      note,
      timeOffset: timeOffsetMs / 1000,
      duration: noteDuration,
      velocity: strumVelocity(note, direction, noteIndex, playedStringsCount, stroke)
    }
  })

  const lastNoteEndMs = events.reduce(
    (latest, event) => Math.max(latest, event.timeOffset * 1000 + event.duration * 1000),
    0
  )

  return {
    stroke,
    notes: ordered,
    events,
    availableWindowMs,
    durationMs: Math.round(lastNoteEndMs),
    perStringDelayMs,
    strokeDurationMs
  }
}

export function buildPatternTimeline<TNote extends TimelineNote>(
  pattern: AudioPatternStroke[],
  notes: TNote[],
  speed: AudioSpeed,
  span: number,
  options: TimelineOptions = {}
): PatternTimeline<TNote> {
  const rhythmStepMs = options.rhythmStepMs ?? AUDIO_RHYTHM_STEP_MS[speed] * (options.patternTempo ?? 1)
  const releaseTailMs = options.releaseTailMs ?? AUDIO_STRUM_RELEASE_TAIL_MS[speed]
  const timeline: Array<StrokeTimeline<TNote> & { strokeIndex: number; strokeStartMs: number }> = []
  const events: ScheduledAudioEvent<TNote>[] = []
  const strokeStarts = pattern.map((stroke, strokeIndex) => rhythmStepMs * (stroke.gridPosition ?? strokeIndex))

  pattern.forEach((stroke, strokeIndex) => {
    const strokeStartMs = strokeStarts[strokeIndex]
    const nextStrokeStartMs = strokeStarts
      .filter((start) => start > strokeStartMs)
      .sort((a, b) => a - b)[0]
    const availableWindowMs = nextStrokeStartMs !== undefined
      ? nextStrokeStartMs - strokeStartMs
      : rhythmStepMs
    const strokeTimeline = buildStrokeTimeline(stroke, notes, speed, span, {
      ...options,
      isMultiStrokePattern: pattern.length > 1,
      availableWindowMs
    })

    timeline.push({
      ...strokeTimeline,
      strokeIndex,
      strokeStartMs
    })

    strokeTimeline.events.forEach((event) => {
      events.push({
        ...event,
        timeOffset: (strokeStartMs + event.timeOffset * 1000) / 1000
      })
    })
  })

  events.sort((a, b) => a.timeOffset - b.timeOffset)

  const lastNoteStartMs = events.reduce(
    (latest, event) => Math.max(latest, event.timeOffset * 1000),
    0
  )
  const patternEndMs = events.length > 0 ? lastNoteStartMs + releaseTailMs : 0

  return {
    timeline,
    events,
    durationMs: Math.round(patternEndMs),
    patternEndMs: Math.round(patternEndMs)
  }
}

export function getChordEndDelay(patternDuration: number, minChordDelay: number) {
  return Math.max(patternDuration, minChordDelay)
}
