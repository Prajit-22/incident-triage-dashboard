import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const summary = {
  total: 3,
  byStatus: { OPEN: 1, INVESTIGATING: 1, RESOLVED: 1 },
  bySeverity: { LOW: 0, MEDIUM: 1, HIGH: 1, CRITICAL: 1 },
  averageResolutionSeconds: 3600,
  overdueOpen: 1,
}
const incident = (id: number, status: string, severity = 'HIGH') => ({
  id, title: `Incident ${id}`, description: 'desc', severity, status,
  createdAt: '2026-10-01T10:00:00Z', resolvedAt: null, dueAt: null,
})
const page = (content: unknown[]) => ({
  content, number: 0, size: 10, totalElements: content.length, totalPages: 1, first: true, last: true,
})
const ok = (b: unknown) => new Response(JSON.stringify(b), { status: 200 })

afterEach(() => vi.restoreAllMocks())

describe('App', () => {
  it('shows summary figures and incidents from the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('/summary') ? ok(summary) : ok(page([incident(1, 'OPEN'), incident(2, 'RESOLVED')])),
    )
    render(<App />)
    expect(await screen.findByText('Incident 1')).toBeInTheDocument()
    expect(screen.getByTestId('total')).toHaveTextContent('3')
    expect(screen.getByTestId('unresolved')).toHaveTextContent('2') // total minus RESOLVED
    expect(screen.getByTestId('urgent')).toHaveTextContent('2') // HIGH + CRITICAL
    expect(screen.getByTestId('overdue')).toHaveTextContent('1')
    expect(screen.getByText('Locked')).toBeInTheDocument() // resolved row cannot be reopened
  })

  it('re-queries with the status filter applied', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('/summary') ? ok(summary) : ok(page([incident(1, 'OPEN')])),
    )
    render(<App />)
    await screen.findByText('Incident 1')
    const toolbar = screen.getByRole('region', { name: 'Incidents' })
    await userEvent.selectOptions(within(toolbar).getByLabelText('Status'), 'OPEN')
    await vi.waitFor(() => expect(spy.mock.calls.some(([u]) => String(u).includes('status=OPEN'))).toBe(true))
  })

  it('re-queries with the due window applied as inclusive UTC day bounds', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('/summary') ? ok(summary) : ok(page([incident(1, 'OPEN')])),
    )
    render(<App />)
    await screen.findByText('Incident 1')
    const toolbar = screen.getByRole('region', { name: 'Incidents' })
    await userEvent.type(within(toolbar).getByLabelText('Due after'), '2026-11-01')
    await userEvent.type(within(toolbar).getByLabelText('Due before'), '2026-11-30')
    await vi.waitFor(() => {
      const urls = spy.mock.calls.map(([u]) => decodeURIComponent(String(u)))
      // Local-day bounds, expressed as ISO instants (the API's windows are inclusive).
      expect(urls.some((u) => u.includes(`due_after=${new Date(2026, 10, 1, 0, 0, 0, 0).toISOString()}`))).toBe(true)
      expect(urls.some((u) => u.includes(`due_before=${new Date(2026, 10, 30, 23, 59, 59, 999).toISOString()}`))).toBe(true)
    })
  })

  it('sends overdue=true when the overdue-only box is checked', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('/summary') ? ok(summary) : ok(page([incident(1, 'OPEN')])),
    )
    render(<App />)
    await screen.findByText('Incident 1')
    const toolbar = screen.getByRole('region', { name: 'Incidents' })
    await userEvent.click(within(toolbar).getByLabelText(/Overdue only/))
    await vi.waitFor(() =>
      expect(spy.mock.calls.some(([u]) => decodeURIComponent(String(u)).includes('overdue=true'))).toBe(true),
    )
  })

  it('marks only the unresolved incident past its deadline as overdue', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('/summary')
        ? ok(summary)
        : ok(page([
            { ...incident(1, 'OPEN'), dueAt: '2020-01-01T00:00:00Z' },
            { ...incident(2, 'RESOLVED'), dueAt: '2020-01-01T00:00:00Z' },
          ])),
    )
    render(<App />)
    await screen.findByText('Incident 1')
    // The open row gets the badge; the resolved row past its deadline does not.
    expect(screen.getAllByText('Overdue')).toHaveLength(1)
  })

  it('sends the optional due date as the end of the picked day when creating an incident', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (String(url).includes('/summary')) return ok(summary)
      if (init?.method === 'POST') return ok({ ...incident(9, 'OPEN'), dueAt: '2026-12-01T23:59:59.999Z' })
      return ok(page([]))
    })
    render(<App />)
    await screen.findByText('No incidents match these filters.')
    await userEvent.type(screen.getByLabelText(/Title/), 'A title')
    await userEvent.type(screen.getByLabelText(/Description/), 'A description')
    await userEvent.type(screen.getByLabelText(/Due date/), '2026-12-01')
    await userEvent.click(screen.getByRole('button', { name: 'Create incident' }))
    await vi.waitFor(() => {
      const post = spy.mock.calls.find(([, i]) => i?.method === 'POST')
      expect(post).toBeTruthy()
      expect(JSON.parse(String(post![1]?.body)).dueAt).toBe(new Date(2026, 11, 1, 23, 59, 59, 999).toISOString())
    })
  })

  it('blocks submitting an empty form without calling the API', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).includes('/summary') ? ok(summary) : ok(page([])),
    )
    render(<App />)
    await screen.findByText('No incidents match these filters.')
    const calls = spy.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: 'Create incident' }))
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(spy.mock.calls.length).toBe(calls)
  })

  it('shows a banner when the API is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch'))
    render(<App />)
    expect(await screen.findByText(/Could not load data/)).toBeInTheDocument()
  })
})
