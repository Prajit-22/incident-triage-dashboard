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
}

export interface NewIncident {
  title: string
  description: string
  severity: Severity
}

export interface ListFilters {
  status?: Status
  severity?: Severity
  page: number
  size: number
}

/** Rule enforced by the backend: a RESOLVED incident cannot be reopened (409). */
export function allowedTransitions(current: Status): Status[] {
  return current === 'RESOLVED' ? [] : STATUSES.filter((s) => s !== current)
}
