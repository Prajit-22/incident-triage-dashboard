import type { Incident, ListFilters, NewIncident, Page, Status, Summary } from './types'

const BASE = '/api/incidents'

export class ApiError extends Error {
  status: number
  fields: Record<string, string>
  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.ok) return (await res.json()) as T
  // The backend returns {error, fields} for validation failures and Spring's
  // {message} body for ResponseStatusException (404, 409, 400 on paging).
  let body: { error?: string; message?: string; fields?: Record<string, string> } = {}
  try {
    body = await res.json()
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(body.error ?? body.message ?? `Request failed (${res.status})`, res.status, body.fields)
}

export function listIncidents(f: ListFilters): Promise<Page<Incident>> {
  const q = new URLSearchParams({ page: String(f.page), size: String(f.size) })
  if (f.status) q.set('status', f.status)
  if (f.severity) q.set('severity', f.severity)
  return request(`${BASE}?${q}`)
}

export const getSummary = (): Promise<Summary> => request(`${BASE}/summary`)

export const createIncident = (body: NewIncident): Promise<Incident> =>
  request(BASE, { method: 'POST', body: JSON.stringify(body) })

export const updateStatus = (id: number, status: Status): Promise<Incident> =>
  request(`${BASE}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
