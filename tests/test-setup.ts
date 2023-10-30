import { afterEach } from 'vitest'
import { FixtureTestContext } from './utils/fixture'

// cleanup after each test as a fallback if someone forgot to call it
afterEach<FixtureTestContext>(async ({ cleanup }) => {
  if (typeof cleanup === 'function') {
    await cleanup()
  }
})