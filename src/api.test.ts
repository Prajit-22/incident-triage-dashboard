import { ApiError, createIncident, listIncidents, updateStatus } from './api'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

afterEach(() => vi.restoreAllMocks())

describe('api client', () => {
  it('builds the list query with filters, paging and no empty params', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { content: [] }))
    await listIncidents({ status: 'OPEN', page: 2, size: 10 })
    expect(spy.mock.calls[0][0]).toBe('/api/incidents?page=2&size=10&status=OPEN')
  })

  it('builds due-window and overdue params, decoded back to the sent values', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { content: [] }))
    await listIncidents({
      dueAfter: '2026-11-01T00:00:00Z',
      dueBefore: '2026-11-30T23:59:59.999Z',
      overdue: true,
      page: 0,
      size: 10,
    })
    const params = new URLSearchParams(String(spy.mock.calls[0][0]).split('?')[1])
    expect(params.get('due_after')).toBe('2026-11-01T00:00:00Z')
    expect(params.get('due_before')).toBe('2026-11-30T23:59:59.999Z')
    expect(params.get('overdue')).toBe('true')
  })

  it('PATCHes /status with the new status', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, {}))
    await updateStatus(7, 'RESOLVED')
    expect(spy.mock.calls[0][0]).toBe('/api/incidents/7/status')
    expect(spy.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: '{"status":"RESOLVED"}' })
  })

  it('exposes per-field validation errors from a 400', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json(400, { error: 'Invalid incident payload', fields: { title: 'size must be between 0 and 120' } }),
    )
    const err = await createIncident({ title: 'x', description: 'y', severity: 'LOW' }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(400)
    expect(err.fields.title).toMatch(/120/)
  })

  it('surfaces the 409 message when reopening a resolved incident', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(409, { message: 'Resolved incidents cannot be reopened' }))
    await expect(updateStatus(1, 'OPEN')).rejects.toThrow('Resolved incidents cannot be reopened')
  })
})
