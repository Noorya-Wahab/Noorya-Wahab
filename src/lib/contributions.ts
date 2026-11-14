/**
 * Pure data helpers. No Node or browser APIs in here, so it is safe to import
 * from the Vite app, the fetch script and the SVG generator alike.
 */

export interface ContributionDay {
  date: string // YYYY-MM-DD
  count: number
}

/** Always 7 entries, indexed by weekday (0 = Sunday). `null` = no such day (future / before the range). */
export type ContributionWeek = (ContributionDay | null)[]

export interface ContributionData {
  source: 'github' | 'mock'
  username: string | null
  generatedAt: string
  /** GitHub's own "contributions in the last year" figure (or, for mock data, the sum of the displayed weeks) */
  total: number
  /** Exactly WEEKS_TO_SHOW columns, oldest first */
  weeks: ContributionWeek[]
}

/** Shape of `contributionCalendar.weeks` in the GitHub GraphQL API */
export interface RawCalendarWeek {
  contributionDays: { date: string; contributionCount: number; weekday: number }[]
}

export const WEEKS_TO_SHOW = 52

export type Level = 0 | 1 | 2 | 3 | 4

/** Turn the raw GraphQL calendar into the 52x7 grid the renderer expects. */
export function buildContributionData(
  rawWeeks: RawCalendarWeek[],
  meta: { source: ContributionData['source']; username: string | null; total?: number },
): ContributionData {
  // A 365-day range touches 53 week columns (partial first + last); keep the newest 52.
  const weeks: ContributionWeek[] = rawWeeks.slice(-WEEKS_TO_SHOW).map((week) => {
    const days: ContributionWeek = Array(7).fill(null)
    for (const d of week.contributionDays) {
      days[d.weekday] = { date: d.date, count: d.contributionCount }
    }
    return days
  })

  // Very new accounts: pad the left so the grid is always 52 columns wide.
  while (weeks.length < WEEKS_TO_SHOW) weeks.unshift(Array(7).fill(null))

  // GitHub's year window spans ~53 week columns but the grid shows 52, so prefer
  // the API's own total over summing the visible weeks.
  const total = meta.total ?? weeks.reduce((sum, w) => sum + w.reduce((s, d) => s + (d?.count ?? 0), 0), 0)

  return { source: meta.source, username: meta.username, generatedAt: new Date().toISOString(), total, weeks }
}

/**
 * GitHub-style quartiles over the non-zero days: the busiest quarter of active
 * days gets level 4, and so on. Returns null when there is no activity at all.
 */
export function getLevelThresholds(data: ContributionData): [number, number, number] | null {
  const counts = data.weeks
    .flat()
    .map((d) => d?.count ?? 0)
    .filter((c) => c > 0)
    .sort((a, b) => a - b)
  if (counts.length === 0) return null
  const q = (p: number) => counts[Math.max(0, Math.ceil(p * counts.length) - 1)]
  return [q(0.25), q(0.5), q(0.75)]
}

export function getLevel(count: number, thresholds: [number, number, number] | null): Level {
  if (count <= 0 || !thresholds) return 0
  if (count <= thresholds[0]) return 1
  if (count <= thresholds[1]) return 2
  if (count <= thresholds[2]) return 3
  return 4
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * A label sits above the first week column of each month. Dates are parsed from the
 * YYYY-MM-DD string (never via local time), so year boundaries and time zones can't shift them.
 * If two labels would be closer than 3 columns, the earlier one is dropped (as GitHub does).
 */
export function getMonthLabels(data: ContributionData): { col: number; label: string }[] {
  const raw: { col: number; label: string }[] = []
  let prev = -1
  data.weeks.forEach((week, col) => {
    const first = week.find((d) => d !== null)
    if (!first) return
    const month = Number(first.date.slice(5, 7)) - 1
    if (month !== prev) {
      raw.push({ col, label: MONTHS[month] })
      prev = month
    }
  })
  return raw.filter((l, i) => i === raw.length - 1 || raw[i + 1].col - l.col >= 3)
}

/* ------------------------------------------------------------------ */
/* Mock data (local development / testing without a token)             */
/* ------------------------------------------------------------------ */

const parts = (date: string) => date.split('-').map(Number) as [number, number, number]

function addDays(date: string, n: number): string {
  const [y, m, d] = parts(date)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function weekdayOf(date: string): number {
  const [y, m, d] = parts(date)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function mockCount(col: number, row: number): number {
  // Same deterministic hash the original design used for its pseudo-random look
  const n = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453
  const random = n - Math.floor(n)
  const weight = random * 0.6 + (col / 52) * 0.4 + Math.sin(col * 0.4) * 0.15
  const weekendDamp = row === 0 || row === 6 ? 0.35 : 1
  return Math.round(Math.max(0, weight - 0.2) * 20 * weekendDamp)
}

export function createMockData(today: string = new Date().toISOString().slice(0, 10)): ContributionData {
  const lastWeekStart = addDays(today, -weekdayOf(today))
  const weeks: RawCalendarWeek[] = []
  for (let col = 0; col < 53; col++) {
    const start = addDays(lastWeekStart, (col - 52) * 7)
    const contributionDays: RawCalendarWeek['contributionDays'] = []
    for (let weekday = 0; weekday < 7; weekday++) {
      const date = addDays(start, weekday)
      if (date > today) break
      contributionDays.push({ date, contributionCount: mockCount(col, weekday), weekday })
    }
    weeks.push({ contributionDays })
  }
  return buildContributionData(weeks, { source: 'mock', username: null })
}
