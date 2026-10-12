import { useState } from 'react'
import { ApiError, updateStatus } from '../api'
import { SEVERITIES, STATUSES, allowedTransitions } from '../types'
import type { Incident, Page, Severity, Status } from '../types'

interface Props {
  page: Page<Incident>
  status: Status | ''
  severity: Severity | ''
  onFilter: (f: { status: Status | ''; severity: Severity | '' }) => void
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

export function IncidentList({ page, status, severity, onFilter, onPage, onChanged }: Props) {
  return (
    <section aria-label="Incidents">
      <div className="toolbar">
        <h3>Incidents</h3>
        <label>
          Status
          <select value={status} onChange={(e) => onFilter({ status: e.target.value as Status | '', severity })}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Severity
          <select value={severity} onChange={(e) => onFilter({ status, severity: e.target.value as Severity | '' })}>
            <option value="">All</option>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {page.content.length === 0 ? (
        <p className="empty">No incidents match these filters.</p>
      ) : (
        <table>
          <thead>
            <tr><th>ID</th><th>Title</th><th>Severity</th><th>Status</th><th>Reported</th><th>Action</th></tr>
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
                <td><StatusControl incident={i} onChanged={onChanged} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pager">
        <button disabled={page.first} onClick={() => onPage(page.number - 1)}>Previous</button>
        <span>Page {page.number + 1} of {Math.max(page.totalPages, 1)} ({page.totalElements} incidents)</span>
        <button disabled={page.last} onClick={() => onPage(page.number + 1)}>Next</button>
      </div>
    </section>
  )
}
