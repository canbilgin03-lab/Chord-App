import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const helperPath = resolve(rootDir, "app/lib/suggestionPresentation.ts")
const source = readFileSync(helperPath, "utf8")
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
})

const helperModule = { exports: {} }
new Function("exports", "require", "module", "__filename", "__dirname", outputText)(
  helperModule.exports,
  require,
  helperModule,
  helperPath,
  dirname(helperPath)
)

const {
  pickGlobalStar,
  presentSuggestionCategory,
  randomnessForSuggestionContext
} = helperModule.exports

const debugItems = [
  { symbol: "A", score: 100, breakdown: { tiers: { harmonicCorrectness: 80 } } },
  { symbol: "B", score: 96, breakdown: { tiers: { harmonicCorrectness: 79 } } },
  { symbol: "C", score: 95, breakdown: { tiers: { harmonicCorrectness: 79 } } },
  { symbol: "D", score: 20, breakdown: { tiers: { harmonicCorrectness: 10 } } }
]

test("category highlight only selects from the top three scoring symbols", () => {
  const result = presentSuggestionCategory({
    symbols: ["D", "C", "B", "A"],
    debugItems,
    rng: () => 0.99
  })

  assert.deepEqual(result.topThree, ["A", "B", "C"])
  assert.ok(result.topThree.includes(result.highlightedSymbol))
  assert.equal(result.symbols[0], result.highlightedSymbol)
  assert.notEqual(result.highlightedSymbol, "D")
})

test("category highlight becomes deterministic at final resolution", () => {
  const result = presentSuggestionCategory({
    symbols: ["D", "C", "B", "A"],
    debugItems,
    context: { phrasePosition: "cadential", slotsToResolution: 1 },
    rng: () => 0.99
  })

  assert.equal(randomnessForSuggestionContext({ phrasePosition: "cadential", slotsToResolution: 1 }), 0)
  assert.equal(result.highlightedSymbol, "A")
})

test("global star compares only simple and complex candidates", () => {
  const result = pickGlobalStar({
    simpleSymbol: "A",
    complexSymbol: "B",
    debugItems: [
      ...debugItems,
      { symbol: "KeyOnly", score: 999, breakdown: { tiers: { harmonicCorrectness: 999 } } }
    ],
    rng: () => 0
  })

  assert.notEqual(result.symbol, "KeyOnly")
  assert.ok(["A", "B"].includes(result.symbol))
})

test("global star boost cannot override a clear harmonic-correctness gap", () => {
  const result = pickGlobalStar({
    simpleSymbol: "Safe",
    complexSymbol: "Risky",
    debugItems: [
      { symbol: "Safe", score: 100, breakdown: { tiers: { harmonicCorrectness: 80 } } },
      { symbol: "Risky", score: 101, breakdown: { tiers: { harmonicCorrectness: 70 } } }
    ],
    rng: () => 0.99
  })

  assert.equal(result.symbol, "Safe")
  assert.equal(result.category, "simple")
})
