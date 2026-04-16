import { describe, it, expect } from 'vitest'
import { AdminApiError } from '../admin-api'

describe('AdminApiError', () => {
  it('extends Error', () => {
    const err = new AdminApiError('test error', 404)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AdminApiError)
  })

  it('sets name to AdminApiError', () => {
    const err = new AdminApiError('test error', 404)
    expect(err.name).toBe('AdminApiError')
  })

  it('sets message', () => {
    const err = new AdminApiError('request failed', 500)
    expect(err.message).toBe('request failed')
  })

  it('sets status code', () => {
    const err = new AdminApiError('unauthorized', 401)
    expect(err.status).toBe(401)
  })

  it('preserves status 0 for network errors', () => {
    const err = new AdminApiError('network error', 0)
    expect(err.status).toBe(0)
  })

  it('can be caught as AdminApiError', () => {
    function throwIt() {
      throw new AdminApiError('forbidden', 403)
    }

    expect(() => throwIt()).toThrow(AdminApiError)
    expect(() => throwIt()).toThrow('forbidden')
  })
})
