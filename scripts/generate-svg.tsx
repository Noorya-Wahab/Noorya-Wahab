/**
 * Renders the *same* React component used in the browser to a standalone SVG file.
 *
 *   npm run generate        uses public/contributions.json (from `npm run fetch`)
 *   npm run generate:mock   uses deterministic-looking mock data
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import Contributions from '../src/components/Contributions'
import { createMockData, type ContributionData } from '../src/lib/contributions'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = resolve(root, 'public/contributions.json')
const outPath = resolve(root, 'public/github-contributions.svg')

let data: ContributionData
if (process.argv.includes('--mock')) {
  data = createMockData()
  console.log('Using MOCK data.')
} else if (existsSync(dataPath)) {
  data = JSON.parse(await readFile(dataPath, 'utf8'))
} else {
  // Deliberately no silent mock fallback here: the scheduled job must never publish fake data.
  console.error('public/contributions.json not found. Run "npm run fetch" first, or use "npm run generate:mock".')
  process.exit(1)
}

// No timestamps in the output, so an unchanged calendar produces a byte-identical file
// (that is what lets the workflow skip empty commits).
const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + renderToStaticMarkup(<Contributions data={data} />) + '\n'

await mkdir(dirname(outPath), { recursive: true })
await writeFile(outPath, svg)
console.log(`Wrote public/github-contributions.svg (${(svg.length / 1024).toFixed(1)} KB, total ${data.total})`)
