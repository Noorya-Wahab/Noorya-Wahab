import { Fragment, type ReactElement } from 'react'
import {
  getLevel,
  getLevelThresholds,
  getMonthLabels,
  type ContributionData,
  type Level,
} from '../lib/contributions'

/**
 * SVG-native port of the original Tailwind/HTML component. The same component is
 * rendered by Vite in the browser and by react-dom/server into the standalone SVG,
 * so there is one source of truth. Tailwind classes were translated 1:1:
 *   bg-pink-200/70      -> solid colour blended over #07070b (so glows stay accurate)
 *   shadow-[0_0_12px..] -> SVG gaussian-blur filter (sigma = blur radius / 2)
 *   text-shadow         -> SVG filter on the text
 */

// Perfectly spaced across 52 columns!
const MEOW_PIXELS = new Set([
  // M (Cols 5-9)
  '5,1', '5,2', '5,3', '5,4', '5,5',
  '6,2',
  '7,3',
  '8,2',
  '9,1', '9,2', '9,3', '9,4', '9,5',

  // E (Cols 13-16)
  '13,1', '13,2', '13,3', '13,4', '13,5',
  '14,1', '14,3', '14,5',
  '15,1', '15,3', '15,5',
  '16,1', '16,3', '16,5',

  // O (Cols 20-23)
  '20,2', '20,3', '20,4',
  '21,1', '21,5',
  '22,1', '22,5',
  '23,2', '23,3', '23,4',

  // W (Cols 27-31)
  '27,1', '27,2', '27,3', '27,4',
  '28,5',
  '29,3', '29,4',
  '30,5',
  '31,1', '31,2', '31,3', '31,4',

  // ! (Col 35)
  '35,1', '35,2', '35,3', '35,5',

  // <3 Heart (Cols 40-44)
  '41,2', '43,2', // top bumps
  '40,3', '41,3', '42,3', '43,3', '44,3', // thick middle
  '41,4', '42,4', '43,4', // tapering down
  '42,5', // bottom point
])

/* ---------- Palette (Tailwind pink-200 / pink-500 + the custom glow pink) ---------- */
const BG = '#07070b'
const PINK_200 = '#fbcfe8'
const PINK_500 = '#ec4899'
const GLOW = '#f43fa6' // rgb(244,63,166)

function over(fg: string, alpha: number, bg = BG): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const mix = (i: number) => Math.round(ch(fg, i) * alpha + ch(bg, i) * (1 - alpha))
  return '#' + [0, 1, 2].map((i) => mix(i).toString(16).padStart(2, '0')).join('')
}

/* ---------- Layout (px, taken from the original) ---------- */
const CELL = 10
const GAP = 3
const STEP = CELL + GAP
const COLS = 52
const ROWS = 7
const PAD_X = 42
const PAD_Y = 38
const LABEL_W = 26
const LABEL_GAP = 12
const GRID_X = PAD_X + LABEL_W + LABEL_GAP
const GRID_Y = 145
const GRID_W = COLS * STEP - GAP // 673, same as the original w-[673px]
const WIDTH = GRID_X + GRID_W + PAD_X
const HEIGHT = GRID_Y + ROWS * STEP - GAP + PAD_Y

const FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/* ---------- Intensity ---------- */
// Real counts -> level (see lib). Each level maps to a weight inside the original
// threshold bands, so the original thresholds and the "adjacent = weight * 0.3"
// shadow rule below are used exactly as authored.
const LEVEL_WEIGHT: Record<Level, number> = { 0: 0, 1: 0.35, 2: 0.55, 3: 0.75, 4: 0.95 }

type GlowKey = 'meow' | 'high' | 'mid'
const GLOWS: Record<GlowKey, { sigma: number; opacity: number }> = {
  meow: { sigma: 6, opacity: 1 }, //   0 0 12px rgba(244,63,166,1)
  high: { sigma: 5, opacity: 0.8 }, // 0 0 10px rgba(244,63,166,0.8)
  mid: { sigma: 3, opacity: 0.5 }, //  0 0 6px  rgba(244,63,166,0.5)
}

function cellStyle(weight: number): { fill: string; glow: GlowKey | null } {
  if (weight > 0.85) return { fill: PINK_200, glow: 'high' }
  if (weight > 0.65) return { fill: over(PINK_200, 0.7), glow: 'mid' }
  if (weight > 0.45) return { fill: over(PINK_200, 0.4), glow: null }
  if (weight > 0.25) return { fill: over(PINK_200, 0.15), glow: null }
  return { fill: over(PINK_500, 0.05), glow: null }
}

/* ---------- SVG filter helpers ---------- */
const REGION = { filterUnits: 'userSpaceOnUse' as const, x: 0, y: 0, width: WIDTH, height: HEIGHT }

/** Outputs only the glow (cells are drawn on top), like a CSS box-shadow. */
function GlowFilter({ id, sigma, opacity }: { id: string; sigma: number; opacity: number }) {
  return (
    <filter id={id} {...REGION}>
      <feGaussianBlur in="SourceAlpha" stdDeviation={sigma} result="blur" />
      <feFlood floodColor={GLOW} floodOpacity={opacity} />
      <feComposite in2="blur" operator="in" />
    </filter>
  )
}

/** Like CSS text-shadow: shadows are listed top-most first. */
function TextGlowFilter({
  id,
  shadows,
}: {
  id: string
  shadows: { sigma: number; opacity: number; color: string }[]
}) {
  return (
    <filter id={id} {...REGION}>
      {shadows.map((s, i) => (
        <Fragment key={i}>
          <feGaussianBlur in="SourceAlpha" stdDeviation={s.sigma} result={`b${i}`} />
          <feFlood floodColor={s.color} floodOpacity={s.opacity} />
          <feComposite in2={`b${i}`} operator="in" result={`s${i}`} />
        </Fragment>
      ))}
      <feMerge>
        {[...shadows.keys()].reverse().map((i) => (
          <feMergeNode key={i} in={`s${i}`} />
        ))}
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}

function Contributions({ data }: { data: ContributionData }) {
  const thresholds = getLevelThresholds(data)

  const glowLayers: Record<GlowKey, ReactElement[]> = { meow: [], high: [], mid: [] }
  const cells: ReactElement[] = []
  const meowCells: ReactElement[] = []

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const x = GRID_X + col * STEP
      const y = GRID_Y + row * STEP
      const key = `${col},${row}`

      const isMeow = MEOW_PIXELS.has(key)

      // Check if this pixel is exactly 1 block away from any MEOW pixel
      let isAdjacent = false
      if (!isMeow) {
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (MEOW_PIXELS.has(`${col + dc},${row + dr}`)) {
              isAdjacent = true
            }
          }
        }
      }

      if (isMeow) {
        // Permanent artwork: max brightness + glow, scaled 1.15 around its centre
        const s = CELL * 1.15
        const o = (s - CELL) / 2
        const rect = { x: x - o, y: y - o, width: s, height: s, rx: 2 * 1.15 }
        glowLayers.meow.push(<rect key={key} {...rect} fill="#000" />)
        meowCells.push(<rect key={key} {...rect} fill={PINK_200} />)
        continue
      }

      // Real activity instead of the old pseudo-random weight
      const day = data.weeks[col]?.[row] ?? null
      const level = day ? getLevel(day.count, thresholds) : 0
      const weight = LEVEL_WEIGHT[level]

      // Dim the adjacent blocks by dropping their weight to 30%, making a natural shadow!
      const effectiveWeight = isAdjacent ? weight * 0.3 : weight
      const style = cellStyle(effectiveWeight)

      const rect = { x, y, width: CELL, height: CELL, rx: 2 }
      if (style.glow) glowLayers[style.glow].push(<rect key={key} {...rect} fill="#000" />)
      cells.push(<rect key={key} {...rect} fill={style.fill} />)
    }
  }

  const heading = `${data.total.toLocaleString('en-US')} CONTRIBUTION${data.total === 1 ? '' : 'S'}!`
  const labelColor = over(PINK_200, 0.6)
  const rowCenter = (row: number) => GRID_Y + row * STEP + CELL / 2 + 11 * 0.35

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={`${heading} GitHub contribution graph for the last 52 weeks`}
      fontFamily={FONT}
    >
      <title>{heading}</title>
      <defs>
        <GlowFilter id="gc-glow-meow" {...GLOWS.meow} />
        <GlowFilter id="gc-glow-high" {...GLOWS.high} />
        <GlowFilter id="gc-glow-mid" {...GLOWS.mid} />
        <TextGlowFilter id="gc-text-eyebrow" shadows={[{ sigma: 5, opacity: 0.5, color: GLOW }]} />
        <TextGlowFilter
          id="gc-text-heading"
          shadows={[
            { sigma: 7.5, opacity: 0.4, color: '#ffffff' },
            { sigma: 15, opacity: 0.6, color: GLOW },
          ]}
        />
        <TextGlowFilter id="gc-text-labels" shadows={[{ sigma: 4, opacity: 0.4, color: GLOW }]} />
      </defs>

      {/* Card */}
      <rect
        x={0.5}
        y={0.5}
        width={WIDTH - 1}
        height={HEIGHT - 1}
        rx={19.5}
        fill={BG}
        stroke={PINK_500}
        strokeOpacity={0.18}
      />

      {/* Header */}
      <text
        x={PAD_X}
        y={52.3}
        fontSize={13}
        fontWeight={600}
        letterSpacing={2}
        fill={over(PINK_200, 0.8)}
        filter="url(#gc-text-eyebrow)"
      >
        CONTRIBUTION
      </text>
      <text
        x={PAD_X}
        y={82.8}
        fontSize={18}
        fontWeight={800}
        letterSpacing={0.45}
        fill={PINK_200}
        filter="url(#gc-text-heading)"
      >
        {heading}
      </text>

      {/* Day + month labels */}
      <g fontSize={11} fontWeight={500} fill={labelColor} filter="url(#gc-text-labels)">
        {[
          [1, 'Mon'],
          [3, 'Wed'],
          [5, 'Fri'],
        ].map(([row, label]) => (
          <text key={label} x={PAD_X} y={rowCenter(row as number)}>
            {label}
          </text>
        ))}
        {getMonthLabels(data).map(({ col, label }) => (
          <text key={`${col}-${label}`} x={GRID_X + col * STEP} y={132.6}>
            {label}
          </text>
        ))}
      </g>

      {/* Contribution cells (glows sit underneath) */}
      {glowLayers.high.length > 0 && <g filter="url(#gc-glow-high)">{glowLayers.high}</g>}
      {glowLayers.mid.length > 0 && <g filter="url(#gc-glow-mid)">{glowLayers.mid}</g>}
      <g>{cells}</g>

      {/* MEOW artwork: always on top of the data */}
      <g filter="url(#gc-glow-meow)">{glowLayers.meow}</g>
      <g>{meowCells}</g>
    </svg>
  )
}

export { MEOW_PIXELS }
export default Contributions
