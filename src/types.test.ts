import { allowedTransitions, dayEndIso, dayStartIso, isOverdue } from './types'

describe('allowedTransitions', () => {
  it('lets an open incident move to any other status', () => {
    expect(allowedTransitions('OPEN')).toEqual(['INVESTIGATING', 'RESOLVED'])
  })
  it('never offers a way to reopen a resolved incident', () => {
    expect(allowedTransitions('RESOLVED')).toEqual([])
  })
})

describe('isOverdue', () => {
  const now = new Date('2026-11-20T12:00:00Z')
  it('flags an open incident past its deadline', () => {
    expect(isOverdue({ dueAt: '2026-11-19T00:00:00Z', status: 'OPEN' }, now)).toBe(true)
    expect(isOverdue({ dueAt: '2026-11-19T00:00:00Z', status: 'INVESTIGATING' }, now)).toBe(true)
  })
  it('does not flag a resolved incident even when past its deadline', () => {
    expect(isOverdue({ dueAt: '2026-11-19T00:00:00Z', status: 'RESOLVED' }, now)).toBe(false)
  })
  it('does not flag an incident with no deadline or a future one', () => {
    expect(isOverdue({ dueAt: null, status: 'OPEN' }, now)).toBe(false)
    expect(isOverdue({ dueAt: '2026-11-21T00:00:00Z', status: 'OPEN' }, now)).toBe(false)
  })
})

describe('day bounds', () => {
  it('turns a date input value into inclusive bounds of the local day', () => {
    // Constructed with local-time arguments so the expectation holds in any time zone.
    expect(dayStartIso('2026-12-01')).toBe(new Date(2026, 11, 1, 0, 0, 0, 0).toISOString())
    expect(dayEndIso('2026-12-01')).toBe(new Date(2026, 11, 1, 23, 59, 59, 999).toISOString())
  })
})
