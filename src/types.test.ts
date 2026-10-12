import { allowedTransitions } from './types'

describe('allowedTransitions', () => {
  it('lets an open incident move to any other status', () => {
    expect(allowedTransitions('OPEN')).toEqual(['INVESTIGATING', 'RESOLVED'])
  })
  it('never offers a way to reopen a resolved incident', () => {
    expect(allowedTransitions('RESOLVED')).toEqual([])
  })
})
