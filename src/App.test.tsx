import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const summary = {
  total: 3,
  byStatus: { OPEN: 1, INVESTIGATING: 1, RESOLVED: 1 },
  bySeverity: { LOW: 0, MEDIUM: 1, HIGH: 1, CRITICAL: 1 },
}
const incident = (id: number, status: string, severity = 'HIGH') => ({
  id, title: `Incident ${id}`, description: 'desc', severity, status, createdAt: '2026-10-01T10:00:00Z',
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
