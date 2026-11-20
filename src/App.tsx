import { useCallback, useEffect, useState } from 'react'
import { getSummary, listIncidents } from './api'
import { IncidentForm } from './components/IncidentForm'
import { IncidentList } from './components/IncidentList'
import { Summary } from './components/Summary'
import { dayEndIso, dayStartIso } from './types'
import type { Incident, Page, Severity, Status, Summary as SummaryData } from './types'

const PAGE_SIZE = 10

export default function App() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [page, setPage] = useState<Page<Incident> | null>(null)
  const [status, setStatus] = useState<Status | ''>('')
  const [severity, setSeverity] = useState<Severity | ''>('')
  const [dueAfter, setDueAfter] = useState('')
  const [dueBefore, setDueBefore] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [pageNo, setPageNo] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getSummary(),
      listIncidents({
        status: status || undefined,
        severity: severity || undefined,
        // A picked day bounds the whole UTC day, matching the API's inclusive windows.
        dueAfter: dueAfter ? dayStartIso(dueAfter) : undefined,
        dueBefore: dueBefore ? dayEndIso(dueBefore) : undefined,
        overdue: overdueOnly || undefined,
        page: pageNo,
        size: PAGE_SIZE,
      }),
    ])
      .then(([s, p]) => {
        if (cancelled) return
        // Changing filters or statuses can leave us past the last page; step back.
        if (p.content.length === 0 && pageNo > 0) setPageNo(Math.max(p.totalPages - 1, 0))
        setSummary(s)
        setPage(p)
        setError(null)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [status, severity, dueAfter, dueBefore, overdueOnly, pageNo, tick])

  return (
    <main>
      <header>
        <h1>Incident Triage Dashboard</h1>
        <p>Frontend for the Incident Triage API.</p>
      </header>
      {error && <p role="alert" className="banner">Could not load data: {error}</p>}
      {summary && <Summary data={summary} />}
      <div className="layout">
        <IncidentForm onCreated={() => { setPageNo(0); refresh() }} />
        {page && (
          <IncidentList
            page={page}
            status={status}
            severity={severity}
            dueAfter={dueAfter}
            dueBefore={dueBefore}
            overdueOnly={overdueOnly}
            onFilter={(f) => {
              setStatus(f.status)
              setSeverity(f.severity)
              setDueAfter(f.dueAfter)
              setDueBefore(f.dueBefore)
              setOverdueOnly(f.overdueOnly)
              setPageNo(0)
            }}
            onPage={setPageNo}
            onChanged={refresh}
          />
        )}
      </div>
    </main>
  )
}
