export type DraftFret = number | "x"

export type DraftVoicingEntry = {
  string: number
  fret: DraftFret
  note: string
  role: string
}

export function sortVoicingByString<T extends { string: number }>(voicing: T[]) {
  return [...voicing].sort((a, b) => a.string - b.string)
}

export function addDraftFretNote<T extends DraftVoicingEntry>({
  voicing,
  tuning,
  stringIndex,
  fret,
  role = "1",
  replaceExisting = false,
  noteForFret
}:{
  voicing: T[]
  tuning: string[]
  stringIndex: number
  fret: number
  role?: string
  replaceExisting?: boolean
  noteForFret: (open: string, fret: number) => string
}) {
  if(!replaceExisting && voicing.some(entry => entry.string === stringIndex)) return null

  const next = replaceExisting
    ? voicing.filter(entry => entry.string !== stringIndex)
    : voicing.slice()

  next.push({
    string: stringIndex,
    fret,
    note: noteForFret(tuning[stringIndex], fret),
    role
  } as T)

  return sortVoicingByString(next)
}

export function numericDraftVoicing<T extends DraftVoicingEntry>(voicing: T[]) {
  return sortVoicingByString(voicing)
    .filter(entry => typeof entry.fret === "number")
}
