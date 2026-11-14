import { Fragment, type ReactElement } from 'react'
import {
  getLevel,
  getLevelThresholds,
  getMonthLabels,
  type ContributionData,
  type Level,
} from '../lib/contributions'

const MEOW_PIXELS = new Set([
  '5,1',
  '5,2',
  '5,3',
  '5,4',
  '5,5',
  '6,2',
  '7,3',
  '8,2',
  '9,1',
  '9,2',
  '9,3',
  '9,4',
  '9,5',
  '13,1',
  '13,2',
  '13,3',
  '13,4',
  '13,5',
  '14,1',
  '14,3',
  '14,5',
  '15,1',
  '15,3',
  '15,5',
  '16,1',
  '16,3',
  '16,5',
  '20,2',
  '20,3',
  '20,4',
  '21,1',
  '21,5',
  '22,1',
  '22,5',
  '23,2',
  '23,3',
  '23,4',
  '27,1',
  '27,2',
  '27,3',
  '27,4',
  '28,5',
  '29,3',
  '29,4',
  '30,5',
  '31,1',
  '31,2',
  '31,3',
  '31,4',
  '35,1',
  '35,2',
  '35,3',
  '35,5',
  '41,2',
  '43,2',
  '40,3',
  '41,3',
  '42,3',
  '43,3',
  '44,3',
  '41,4',
  '42,4',
  '43,4',
  '42,5',
])

const GLOW = '#ff3fae'
const GLOW_SOFT = '#ff7acb'
const PINK_LIGHT = '#ffc9e8'
const PINK_LINE = '#ff8ccf'
const ART = '#FCDDF8'
const LABEL = '#f391c9'
const FOOTER = '#e59ac8'

const TRIM = 100

const WIDTH = 2009
const HEIGHT = 783 - TRIM
const CELL = 25.3
const STEP = 30.15
const COLS = 52
const ROWS = 7
const GRID_X = 273
const GRID_Y = 356 - TRIM
const CARD = { x: 68, y: 65, w: 1874, h: 652 - TRIM, r: 76 }
const FOOT_Y = 655 - TRIM

const FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const LEVEL_WEIGHT: Record<Level, number> = {
  0: 0,
  1: 0.35,
  2: 0.55,
  3: 0.75,
  4: 0.95,
}

type GlowKey = 'high' | 'mid' | 'low' | 'lower' | 'lowest'
const GLOWS: Record<
  GlowKey,
  { sigma: number; opacity: number; color: string }
> = {
  high: { sigma: 11, opacity: 1, color: '#ff5cbeac' },
  mid: { sigma: 8, opacity: 0.75, color: '#ff5cbe74' },
  low: { sigma: 6, opacity: 0.6, color: '#ff5cbe5f' },
  lower: { sigma: 4, opacity: 0.55, color: '#ff5cbe25' },
  lowest: { sigma: 2, opacity: 0.45, color: '#ff5cbe06' },
}

const HALO_DIM = 0.6

function cellStyle(weight: number): { fill: string; glow: GlowKey | null } {
  if (weight > 0.85) return { fill: '#ff5cbeac', glow: 'high' }
  if (weight > 0.65) return { fill: '#ff5cbe74', glow: 'mid' }
  if (weight > 0.45) return { fill: '#ff5cbe5f', glow: 'low' }
  if (weight > 0.25) return { fill: '#ff5cbe25', glow: 'lower' }
  return { fill: '#ff5cbe06', glow: 'lowest' }
}

const REGION = {
  filterUnits: 'userSpaceOnUse' as const,
  x: 0,
  y: 0,
  width: WIDTH,
  height: HEIGHT,
}

function GlowFilter({
  id,
  sigma,
  opacity,
  color = GLOW,
}: {
  id: string
  sigma: number
  opacity: number
  color?: string
}) {
  return (
    <filter id={id} {...REGION}>
      <feGaussianBlur in="SourceAlpha" stdDeviation={sigma} result="blur" />
      <feFlood floodColor={color} floodOpacity={opacity} />
      <feComposite in2="blur" operator="in" />
    </filter>
  )
}

function SoftFilter({ id, sigma }: { id: string; sigma: number }) {
  return (
    <filter id={id} x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation={sigma} result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}

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
          <feGaussianBlur
            in="SourceAlpha"
            stdDeviation={s.sigma}
            result={`b${i}`}
          />
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

function sparkPath(cx: number, cy: number, r: number) {
  const k = r * 0.16
  return `M ${cx} ${cy - r} Q ${cx + k} ${cy - k} ${cx + r} ${cy} Q ${cx + k} ${cy + k} ${cx} ${cy + r} Q ${cx - k} ${cy + k} ${cx - r} ${cy} Q ${cx - k} ${cy - k} ${cx} ${cy - r} Z`
}

function heartPath(s: number) {
  const p = (n: number) => +(n * s).toFixed(2)
  return `M 0 ${p(0.95)} C ${p(-1.3)} ${p(-0.1)} ${p(-0.95)} ${p(-1)} ${p(-0.4)} ${p(-1)} C ${p(-0.15)} ${p(-1)} 0 ${p(-0.85)} 0 ${p(-0.65)} C 0 ${p(-0.85)} ${p(0.15)} ${p(-1)} ${p(0.4)} ${p(-1)} C ${p(0.95)} ${p(-1)} ${p(1.3)} ${p(-0.1)} 0 ${p(0.95)} Z`
}
const TOP_Y = 108

const SPARKLES: [number, number, number][] = [
  [190, 112, 20],
  [662, 108, 15],
  [1000, 116, 9],
  [1265, 108, 11],
  [1530, 112, 9],
  [1655, 116, 5],
  [1795, 112, 24],
  [1892, 238, 12],
  [1700, 318, 6],
  [1884, 392, 8],
  [127, 222, 4],

  // bottom band (on the footer line)
  [125, FOOT_Y, 13],
  [260, FOOT_Y, 10],
  [777, FOOT_Y, 14],
  [1231, FOOT_Y, 14],
  [1750, FOOT_Y, 10],
  [1885, FOOT_Y, 13],
]

const HEARTS: [number, number, number, number][] = []

const DOTS: [number, number, number][] = [
  [1060, 92, 1.5],
  [1445, 98, 1.8],
  [1340, 150, 1.8],
  [113, 407, 1.5],
  [229, 501, 1.5],
  [1635, 470, 1.5],
  [1704, 532, 1.5],
  [1905, 330, 1.6],
  [1590, 160, 1.5],
]

function Contributions({ data }: { data: ContributionData }) {
  const thresholds = getLevelThresholds(data)

  const glowLayers: Record<GlowKey, ReactElement[]> = {
    high: [],
    mid: [],
    low: [],
    lower: [],
    lowest: [],
  }
  const cells: ReactElement[] = []
  const meowCells: ReactElement[] = []
  const meowShapes: ReactElement[] = []

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const x = GRID_X + col * STEP
      const y = GRID_Y + row * STEP
      const key = `${col},${row}`
      const isMeow = MEOW_PIXELS.has(key)

      let isAdjacent = false
      if (!isMeow) {
        for (let dc = -1; dc <= 1; dc++)
          for (let dr = -1; dr <= 1; dr++)
            if (MEOW_PIXELS.has(`${col + dc},${row + dr}`)) isAdjacent = true
      }

      if (isMeow) {
        const s = CELL * 1.06
        const o = (s - CELL) / 2
        const rect = { x: x - o, y: y - o, width: s, height: s, rx: 3.2 }
        meowShapes.push(<rect key={key} {...rect} fill="#000" />)
        meowCells.push(<rect key={key} {...rect} fill={ART} />)
        continue
      }

      const day = data.weeks[col]?.[row] ?? null
      const level = day ? getLevel(day.count, thresholds) : 0
      const weight = LEVEL_WEIGHT[level]
      const style = cellStyle(isAdjacent ? weight * HALO_DIM : weight)

      const rect = { x, y, width: CELL, height: CELL, rx: 3 }
      if (style.glow)
        glowLayers[style.glow].push(<rect key={key} {...rect} fill="#000" />)
      cells.push(<rect key={key} {...rect} fill={style.fill} />)
    }
  }

  const heading = `${data.total.toLocaleString('en-US')} CONTRIBUTIONS!`
  const rowCenter = (row: number) => GRID_Y + row * STEP + CELL / 2 + 9.5
  const cardCorner = CARD.y + CARD.h

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
        <GlowFilter
          id="gc-bloom-wide"
          sigma={48}
          opacity={0.55}
          color="#ff1f9e"
        />
        <GlowFilter id="gc-bloom" sigma={26} opacity={0.95} color="#ff3cb7" />
        <GlowFilter id="gc-halo" sigma={10} opacity={0.5} color="#ff35ab" />
        <GlowFilter id="gc-halo2" sigma={20} opacity={0.5} color="#ff35ab" />
        <GlowFilter id="gc-tight" sigma={3.5} opacity={0.9} color="#ffb3e0" />
        <GlowFilter id="gc-glow-high" {...GLOWS.high} />
        <GlowFilter id="gc-glow-mid" {...GLOWS.mid} />
        <GlowFilter id="gc-glow-low" {...GLOWS.low} />
        <GlowFilter id="gc-glow-lower" {...GLOWS.lower} />
        <GlowFilter id="gc-glow-lowest" {...GLOWS.lowest} />
        <SoftFilter id="gc-soft" sigma={10} />
        <SoftFilter id="gc-soft-sm" sigma={3} />
        <GlowFilter id="gc-inner-glow" sigma={14} opacity={0.35} color={GLOW} />

        <TextGlowFilter
          id="gc-text-heading"
          shadows={[
            { sigma: 30, opacity: 2, color: '#ff2e9e' },
            { sigma: 10, opacity: 5, color: '#ff2e9e' },
            { sigma: 10, opacity: 5, color: '#ff2e9e' },
          ]}
        />
        <TextGlowFilter
          id="gc-text-labels"
          shadows={[
            { sigma: 5, opacity: 0.6, color: GLOW },
            { sigma: 10, opacity: 2, color: '#ff2e9e' },
          ]}
        />

        <clipPath id="gc-card-clip">
          <rect
            x={CARD.x}
            y={CARD.y}
            width={CARD.w}
            height={CARD.h}
            rx={CARD.r}
          />
        </clipPath>

        <linearGradient
          id="gc-foot-l"
          gradientUnits="userSpaceOnUse"
          x1={315}
          y1={0}
          x2={745}
          y2={0}
        >
          <stop offset="0" stopColor={PINK_LINE} stopOpacity={0} />
          <stop offset="1" stopColor={PINK_LINE} stopOpacity={0.7} />
        </linearGradient>
        <linearGradient
          id="gc-foot-r"
          gradientUnits="userSpaceOnUse"
          x1={1265}
          y1={0}
          x2={1700}
          y2={0}
        >
          <stop offset="0" stopColor={PINK_LINE} stopOpacity={0.7} />
          <stop offset="1" stopColor={PINK_LINE} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Card */}
      <rect
        x={CARD.x}
        y={CARD.y}
        width={CARD.w}
        height={CARD.h}
        rx={CARD.r}
        fill="url(#gc-card-fill)"
      />

      <g clipPath="url(#gc-card-clip)">
        <rect
          x={CARD.x}
          y={CARD.y}
          width={CARD.w}
          height={CARD.h}
          fill="url(#gc-corner-bl)"
        />
        <rect
          x={CARD.x}
          y={CARD.y}
          width={CARD.w}
          height={CARD.h}
          fill="url(#gc-corner-br)"
        />
        <rect
          x={CARD.x}
          y={CARD.y}
          width={CARD.w}
          height={CARD.h}
          fill="url(#gc-corner-tl)"
        />
        <rect
          x={CARD.x}
          y={CARD.y}
          width={CARD.w}
          height={CARD.h}
          fill="url(#gc-corner-tr)"
        />
      </g>

      {SPARKLES.map(([cx, cy, r]) => (
        <g key={`${cx}-${cy}`}>
          <path
            d={sparkPath(cx, cy, r)}
            fill="#ff6fc4"
            filter="url(#gc-soft)"
          />
          <path d={sparkPath(cx, cy, r * 0.6)} fill="#ffe0f3" />
        </g>
      ))}

      {HEARTS.map(([x, y, s, rot]) => (
        <g
          key={`${x}-${y}`}
          transform={`translate(${x} ${y}) rotate(${rot})`}
          filter="url(#gc-soft-sm)"
        >
          <path
            d={heartPath(s)}
            fill="#ff4fa8"
            fillOpacity={0.18}
            stroke={PINK_LINE}
            strokeWidth={Math.max(2, s / 7)}
            strokeLinejoin="round"
          />
        </g>
      ))}

      {DOTS.map(([cx, cy, r]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={r}
          fill={PINK_LINE}
          opacity={0.7}
        />
      ))}

      {/* Day + month labels */}
      <g
        fontSize={26}
        fontWeight={500}
        fill={LABEL}
        filter="url(#gc-text-labels)"
      >
        {[
          [1, 'Mon'],
          [3, 'Wed'],
          [5, 'Fri'],
        ].map(([row, label]) => (
          <text key={label} x={180} y={rowCenter(row as number)}>
            {label}
          </text>
        ))}
        {getMonthLabels(data).map(({ col, label }) => (
          <text
            key={`${col}-${label}`}
            x={GRID_X + col * STEP + 3}
            y={GRID_Y - 26}
          >
            {label}
          </text>
        ))}
      </g>

      {glowLayers.high.length > 0 && (
        <g filter="url(#gc-glow-high)">{glowLayers.high}</g>
      )}
      {glowLayers.mid.length > 0 && (
        <g filter="url(#gc-glow-mid)">{glowLayers.mid}</g>
      )}
      {glowLayers.low.length > 0 && (
        <g filter="url(#gc-glow-low)">{glowLayers.low}</g>
      )}
      {glowLayers.lower.length > 0 && (
        <g filter="url(#gc-glow-lower)">{glowLayers.lower}</g>
      )}
      {glowLayers.lowest.length > 0 && (
        <g filter="url(#gc-glow-lowest)">{glowLayers.lowest}</g>
      )}

      <g>{cells}</g>

      <g filter="url(#gc-bloom-wide)">{meowShapes}</g>
      <g filter="url(#gc-bloom)">{meowShapes}</g>
      <g filter="url(#gc-halo)">{meowShapes}</g>
      <g filter="url(#gc-halo)">{meowShapes}</g>
      <g filter="url(#gc-halo2)">{meowShapes}</g>
      <g filter="url(#gc-tight)">{meowShapes}</g>
      <g>{meowCells}</g>

      {/* Footer */}
      <line
        x1={315}
        y1={FOOT_Y}
        x2={745}
        y2={FOOT_Y}
        stroke="url(#gc-foot-l)"
        strokeWidth={1.5}
      />
      <line
        x1={1265}
        y1={FOOT_Y}
        x2={1700}
        y2={FOOT_Y}
        stroke="url(#gc-foot-r)"
        strokeWidth={1.5}
      />
      <text
        x={830}
        y={FOOT_Y + 10}
        fontSize={30}
        fontWeight={600}
        letterSpacing={0.5}
        fill={FOOTER}
        filter="url(#gc-text-heading)"
      >
        {heading}
      </text>
    </svg>
  )
}

export { MEOW_PIXELS }
export default Contributions
