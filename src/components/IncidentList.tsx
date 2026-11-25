import { useState } from 'react'
import { ApiError, updateStatus } from '../api'
import { SEVERITIES, STATUSES, allowedTransitions, isOverdue } from '../types'
import type { Incident, Page, Severity, Status } from '../types'

interface FilterValues {
  status: Status | ''
  severity: Severity | ''
  query: string
  dueAfter: string
  dueBefore: string
  overdueOnly: boolean
}

interface Props {
  page: Page<Incident>
  status: Status | ''
  severity: Severity | ''
  query?: string
  dueAfter?: string
  dueBefore?: string
  overdueOnly?: boolean
  onFilter: (f: FilterValues) => void
  onPage: (p: number) => void
  onChanged: () => void
}

function StatusControl({ incident, onChanged }: { incident: Incident; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const options = allowedTransitions(incident.status)

  async function change(next: Status) {
    setError(null)
    try {
      await updateStatus(incident.id, next)
      onChanged()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed')
      onChanged() // refetch: someone else may have changed it first
    }
  }

  if (options.length === 0) return <span className="locked" title="Resolved incidents cannot be reopened">Locked</span>
  return (
    <>
      <select aria-label={`Change status of incident ${incident.id}`} value="" onChange={(e) => change(e.target.value as Status)}>
        <option value="" disabled>Move to…</option>
        {options.map((s) => <option key={s}>{s}</option>)}
      </select>
      {error && <span role="alert" className="field-error">{error}</span>}
    </>
  )
}

export function IncidentList({ page, status, severity, query = '', dueAfter = '', dueBefore = '', overdueOnly = false, onFilter, onPage, onChanged }: Props) {
  const current: FilterValues = { status, severity, query, dueAfter, dueBefore, overdueOnly }
  return (
    <section aria-label="Incidents">
      <div className="toolbar">
        <h3>Incidents</h3>
        <label>
          Search
          <input
            type="search"
            value={query}
            placeholder="Title or description"
            onChange={(e) => onFilter({ ...current, query: e.target.value })}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => onFilter({ ...current, status: e.target.value as Status | '' })}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Severity
          <select value={severity} onChange={(e) => onFilter({ ...current, severity: e.target.value as Severity | '' })}>
            <option value="">All</option>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Due after
          <input type="date" value={dueAfter} onChange={(e) => onFilter({ ...current, dueAfter: e.target.value })} />
        </label>
        <label>
          Due before
          <input type="date" value={dueBefore} onChange={(e) => onFilter({ ...current, dueBefore: e.target.value })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => onFilter({ ...current, overdueOnly: e.target.checked })} />
          Overdue only
        </label>
      </div>

      {page.content.length === 0 ? (
        <p className="empty">No incidents match these filters.</p>
      ) : (
        <div className="table-scroll">
        <table>
          <thead>
            <tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Reported</th><th>Due</th><th>Action</th></tr>
          </thead>
          <tbody>
            {page.content.map((i) => (
              <tr key={i.id}>
                <td>#{i.id}</td>
                <td>
                  <strong>{i.title}</strong>
                  <div className="desc">{i.description}</div>
                </td>
                <td><span className={`badge sev-${i.severity}`}>{i.severity}</span></td>
                <td><span className={`badge status-${i.status}`}>{i.status}</span></td>
                <td>{new Date(i.createdAt).toLocaleString()}</td>
                <td>
                  {i.dueAt ? (
                    <>
                      {new Date(i.dueAt).toLocaleDateString()}
                      {isOverdue(i) && <span className="badge overdue">Overdue</span>}
                    </>
                  ) : '—'}
                </td>
                <td><StatusControl incident={i} onChanged={onChanged} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <div className="pager">
        <button disabled={page.first} onClick={() => onPage(page.number - 1)}>Previous</button>
        <span>Page {page.number + 1} of {Math.max(page.totalPages, 1)} ({page.totalElements} incidents)</span>
        <button disabled={page.last} onClick={() => onPage(page.number + 1)}>Next</button>
      </div>
    </section>
  )
}
