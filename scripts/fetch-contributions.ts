/**
 * Fetches the contribution calendar from the GitHub GraphQL API and writes
 * public/contributions.json. Runs in Node only, so the token never reaches the browser.
 *
 *   GH_TOKEN     classic personal access token with `read:user`
 *   GH_USERNAME  the GitHub login to fetch
 */
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildContributionData, type RawCalendarWeek } from '../src/lib/contributions'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'))

const token = process.env.GH_TOKEN
const username = process.env.GH_USERNAME

if (!token || !username) {
  console.error('Missing GH_TOKEN and/or GH_USERNAME.')
  console.error('Locally: copy .env.example to .env and fill it in. See README.md.')
  console.error('To test the renderer without a token, run: npm run generate:mock')
  process.exit(1)
}

const QUERY = /* GraphQL */ `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              weekday
            }
          }
        }
      }
    }
  }
`

const to = new Date()
const from = new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000)

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'github-contributions-svg',
  },
  body: JSON.stringify({
    query: QUERY,
    variables: { login: username, from: from.toISOString(), to: to.toISOString() },
  }),
})

if (!res.ok) {
  console.error(`GitHub API responded ${res.status} ${res.statusText}`)
  if (res.status === 401) console.error('The token is invalid or expired.')
  process.exit(1)
}

const json = (await res.json()) as {
  data?: { user: { contributionsCollection: { contributionCalendar: { weeks: RawCalendarWeek[] } } } | null }
  errors?: { message: string }[]
}

if (json.errors?.length) {
  console.error('GraphQL errors:', json.errors.map((e) => e.message).join('; '))
  process.exit(1)
}
if (!json.data?.user) {
  console.error(`No GitHub user found for "${username}".`)
  process.exit(1)
}

const calendar = json.data.user.contributionsCollection.contributionCalendar
const data = buildContributionData(calendar.weeks, { source: 'github', username })

const out = resolve(root, 'public/contributions.json')
await mkdir(dirname(out), { recursive: true })
await writeFile(out, JSON.stringify(data, null, 2) + '\n')

console.log(`Fetched ${data.total} contributions for @${username} (${data.weeks.length} weeks) -> public/contributions.json`)
