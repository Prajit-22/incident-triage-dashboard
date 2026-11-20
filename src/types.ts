export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED'] as const

export type Severity = (typeof SEVERITIES)[number]
export type Status = (typeof STATUSES)[number]

export interface Incident {
  id: number
  title: string
  description: string
  severity: Severity
  status: Status
  createdAt: string
  resolvedAt: string | null
  dueAt: string | null
}

export interface Page<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface Summary {
  total: number
  byStatus: Record<Status, number>
  bySeverity: Record<Severity, number>
  averageResolutionSeconds: number | null
  overdueOpen: number
}

export interface NewIncident {
  title: string
  description: string
  severity: Severity
  dueAt?: string | null
}

export interface ListFilters {
  status?: Status
  severity?: Severity
  dueAfter?: string
  dueBefore?: string
  overdue?: boolean
  page: number
  size: number
}

/** Rule enforced by the backend: a RESOLVED incident cannot be reopened (409). */
export function allowedTransitions(current: Status): Status[] {
  return current === 'RESOLVED' ? [] : STATUSES.filter((s) => s !== current)
}

/** Mirrors the backend: overdue means past its deadline and not resolved; no deadline is never overdue. */
export function isOverdue(i: Pick<Incident, 'dueAt' | 'status'>, now: Date = new Date()): boolean {
  return i.dueAt !== null && i.status !== 'RESOLVED' && new Date(i.dueAt).getTime() < now.getTime()
}

/** Inclusive ISO bounds of a whole day in the viewer's local time zone, for a date input value. */
export function dayStartIso(day: string): string {
  return new Date(`${day}T00:00:00`).toISOString()
}
export function dayEndIso(day: string): string {
  return new Date(`${day}T23:59:59.999`).toISOString()
}
