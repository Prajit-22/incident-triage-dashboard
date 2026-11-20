import { useState } from 'react'
import { ApiError, createIncident } from '../api'
import { SEVERITIES, dayEndIso } from '../types'
import type { Incident, Severity } from '../types'

const TITLE_MAX = 120
const DESC_MAX = 2000

export function IncidentForm({ onCreated }: { onCreated: (i: Incident) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>('MEDIUM')
  const [due, setDue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    // Mirror the backend's @NotBlank so obvious mistakes never hit the network.
    const local: Record<string, string> = {}
    if (!title.trim()) local.title = 'Title is required'
    if (!description.trim()) local.description = 'Description is required'
    if (Object.keys(local).length) return setFieldErrors(local)

    setBusy(true)
    try {
      const created = await createIncident({
        title: title.trim(),
        description: description.trim(),
        severity,
        // The backend accepts a null deadline; a chosen day means end of that day (UTC).
        dueAt: due ? dayEndIso(due) : null,
      })
      setTitle('')
      setDescription('')
      setSeverity('MEDIUM')
      setDue('')
      onCreated(created)
    } catch (err) {
      if (err instanceof ApiError) {
        // Server-side per-field messages take precedence over the generic one.
        setFieldErrors(err.fields)
        setError(Object.keys(err.fields).length ? null : err.message)
      } else setError('Could not reach the API. Is the backend running?')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h3>Report an incident</h3>
      <label>
        Title
        <input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} />
        <small>{title.length}/{TITLE_MAX}</small>
        {fieldErrors.title && <span role="alert" className="field-error">{fieldErrors.title}</span>}
      </label>
      <label>
        Description
        <textarea rows={3} value={description} maxLength={DESC_MAX} onChange={(e) => setDescription(e.target.value)} />
        {fieldErrors.description && <span role="alert" className="field-error">{fieldErrors.description}</span>}
      </label>
      <label>
        Severity
        <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
          {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {fieldErrors.severity && <span role="alert" className="field-error">{fieldErrors.severity}</span>}
      </label>
      <label>
        Due date (optional)
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <small>due at the end of that day, your local time</small>
      </label>
      {error && <p role="alert" className="field-error">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create incident'}</button>
    </form>
  )
}
