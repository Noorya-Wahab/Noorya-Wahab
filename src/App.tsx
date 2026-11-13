import { useEffect, useState } from 'react'
import Contributions from './components/Contributions'
import { createMockData, type ContributionData } from './lib/contributions'

export default function App() {
  // Starts with mock data so the renderer works without any token.
  const [data, setData] = useState<ContributionData>(() => createMockData())

  // `npm run fetch` writes public/contributions.json; if it exists we use real data.
  useEffect(() => {
    fetch('/contributions.json')
      .then((r) => r.json())
      .then((json: ContributionData) => json?.weeks?.length && setData(json))
      .catch(() => {}) // no file -> keep mock data
  }, [])

  return (
    <main className="page">
      <Contributions data={data} />
      <p className="note">
        {data.source === 'mock'
          ? 'Showing mock data. Run "npm run fetch" to use your real contributions.'
          : `Live data for @${data.username}`}
      </p>
    </main>
  )
}
