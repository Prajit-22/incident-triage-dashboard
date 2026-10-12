import { SEVERITIES, STATUSES } from '../types'
import type { Summary as SummaryData } from '../types'

function Bar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track" aria-hidden="true">
        <div className={`bar-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-value">{value}</span>
    </div>
  )
}

export function Summary({ data }: { data: SummaryData }) {
  const unresolved = data.total - data.byStatus.RESOLVED
  const urgent = data.bySeverity.HIGH + data.bySeverity.CRITICAL
  return (
    <section aria-label="Summary" className="summary">
      <div className="stat-cards">
        <div className="card">
          <div className="card-value" data-testid="total">{data.total}</div>
          <div className="card-label">Total incidents</div>
        </div>
        <div className="card">
          <div className="card-value" data-testid="unresolved">{unresolved}</div>
          <div className="card-label">Unresolved</div>
        </div>
        <div className="card">
          <div className="card-value" data-testid="urgent">{urgent}</div>
          <div className="card-label">High + critical</div>
        </div>
      </div>
      <div className="charts">
        <div className="card">
          <h3>By status</h3>
          {STATUSES.map((s) => (
            <Bar key={s} label={s} value={data.byStatus[s]} total={data.total} tone={`status-${s}`} />
          ))}
        </div>
        <div className="card">
          <h3>By severity</h3>
          {SEVERITIES.map((s) => (
            <Bar key={s} label={s} value={data.bySeverity[s]} total={data.total} tone={`sev-${s}`} />
          ))}
        </div>
      </div>
    </section>
  )
}
