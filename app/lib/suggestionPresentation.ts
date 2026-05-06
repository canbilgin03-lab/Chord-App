export type SuggestionContext = {
  phrasePosition?: string
  slotsToResolution?: number
  resolutionDue?: boolean
  harmonicNeed?: string
}

export type SuggestionDebugItem = {
  symbol: string
  score: number
  theoryNote?: string
  resolutionNote?: string
  context?: SuggestionContext
  breakdown?: {
    tiers?: {
      harmonicCorrectness?: number
    }
  }
}

export type PresentedSuggestionCategory = {
  symbols: string[]
  highlightedSymbol: string | null
  topThree: string[]
}

export type GlobalStarSelection = {
  symbol: string | null
  category: "simple" | "complex" | null
}

const GLOBAL_STAR_BOOST_MAX = 5
const COMPLEX_BOOST_BIAS = 1.18
const HARMONIC_CORRECTNESS_GUARD = 4

function uniqueSymbols(symbols: string[]) {
  const seen = new Set<string>()
  return symbols.filter((symbol) => {
    if(seen.has(symbol)) return false
    seen.add(symbol)
    return true
  })
}

function debugMapFor(debugItems: SuggestionDebugItem[]) {
  const map = new Map<string, SuggestionDebugItem>()

  for(const item of debugItems) {
    const current = map.get(item.symbol)
    if(!current || item.score > current.score) {
      map.set(item.symbol, item)
    }
  }

  return map
}

function scoreForSymbol(symbol: string, debugBySymbol: Map<string, SuggestionDebugItem>) {
  return debugBySymbol.get(symbol)?.score ?? Number.NEGATIVE_INFINITY
}

function harmonicCorrectnessFor(item: SuggestionDebugItem | undefined) {
  return item?.breakdown?.tiers?.harmonicCorrectness ?? 0
}

export function randomnessForSuggestionContext(context?: SuggestionContext | null) {
  if(!context) return 1
  if(context.resolutionDue) return 0
  if(context.phrasePosition === "cadential" || context.slotsToResolution === 1) return 0
  if(context.phrasePosition === "preCadential" || context.slotsToResolution === 2) return 0.25
  if(context.harmonicNeed === "resolution" && (context.slotsToResolution ?? 4) <= 3) return 0.35
  if(context.slotsToResolution === 3) return 0.55

  return 1
}

function pickTopThreeSymbol(topThree: string[], randomness: number, rng: () => number) {
  if(topThree.length === 0) return null
  if(randomness <= 0) return topThree[0]
  if(rng() > randomness) return topThree[0]

  const roll = rng()
  if(roll < 0.5 || topThree.length === 1) return topThree[0]
  if(roll < 0.82 || topThree.length === 2) return topThree[1]
  return topThree[2]
}

export function presentSuggestionCategory({
  symbols,
  debugItems,
  context,
  rng = Math.random
}:{
  symbols: string[]
  debugItems: SuggestionDebugItem[]
  context?: SuggestionContext | null
  rng?: () => number
}): PresentedSuggestionCategory {
  const unique = uniqueSymbols(symbols)
  const debugBySymbol = debugMapFor(debugItems)
  const ranked = unique
    .map((symbol, index) => ({ symbol, index, score: scoreForSymbol(symbol, debugBySymbol) }))
    .sort((a, b) => {
      if(b.score !== a.score) return b.score - a.score
      return a.index - b.index
    })
    .map((item) => item.symbol)
  const topThree = ranked.slice(0, 3)
  const highlightedSymbol = pickTopThreeSymbol(
    topThree,
    randomnessForSuggestionContext(context),
    rng
  )

  if(!highlightedSymbol) {
    return {
      symbols: unique,
      highlightedSymbol,
      topThree
    }
  }

  return {
    symbols: [
      highlightedSymbol,
      ...unique.filter((symbol) => symbol !== highlightedSymbol)
    ],
    highlightedSymbol,
    topThree
  }
}

function candidateForGlobalStar(
  category: "simple" | "complex",
  symbol: string | null,
  debugBySymbol: Map<string, SuggestionDebugItem>
) {
  if(!symbol) return null
  const debug = debugBySymbol.get(symbol)

  return {
    category,
    symbol,
    score: debug?.score ?? 0,
    harmonicCorrectness: harmonicCorrectnessFor(debug)
  }
}

export function pickGlobalStar({
  simpleSymbol,
  complexSymbol,
  debugItems,
  context,
  rng = Math.random
}:{
  simpleSymbol: string | null
  complexSymbol: string | null
  debugItems: SuggestionDebugItem[]
  context?: SuggestionContext | null
  rng?: () => number
}): GlobalStarSelection {
  const debugBySymbol = debugMapFor(debugItems)
  const candidates = [
    candidateForGlobalStar("simple", simpleSymbol, debugBySymbol),
    candidateForGlobalStar("complex", complexSymbol, debugBySymbol)
  ].filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))

  if(candidates.length === 0) return { symbol: null, category: null }
  if(candidates.length === 1) {
    return {
      symbol: candidates[0].symbol,
      category: candidates[0].category
    }
  }
  if(candidates[0].symbol === candidates[1].symbol) {
    return {
      symbol: candidates[0].symbol,
      category: candidates[0].category
    }
  }

  const randomness = randomnessForSuggestionContext(context)
  const scored = candidates.map((candidate) => {
    const bias = candidate.category === "complex" ? COMPLEX_BOOST_BIAS : 1
    return {
      ...candidate,
      adjustedScore: candidate.score + (rng() * GLOBAL_STAR_BOOST_MAX * randomness * bias)
    }
  }).sort((a, b) => b.adjustedScore - a.adjustedScore)

  let winner = scored[0]
  const other = scored[1]

  if(winner.harmonicCorrectness + HARMONIC_CORRECTNESS_GUARD < other.harmonicCorrectness) {
    winner = other
  }

  return {
    symbol: winner.symbol,
    category: winner.category
  }
}
