/* Deterministic self-test for the PrivScan rules engine (no LLM). */
import { runDeterministicChecks, RULESET_VERSION } from './privacyscan'

let pass = 0
let fail = 0
function assert(name: string, cond: boolean) {
  if (cond) {
    pass++
    console.log('  PASS ' + name)
  } else {
    fail++
    console.log('  FAIL ' + name)
  }
}

// PS-1: PII + no consent -> both detected
const pii = runDeterministicChecks({
  website_url: 'https://example.com',
  data_practices: 'we collect email and payment card',
  user_region: 'EU only',
})
assert('PII detected (PRIV-001)', pii.hits.some((h) => h.id === 'PRIV-001'))
assert('consent gap detected (PRIV-003)', pii.hits.some((h) => h.id === 'PRIV-003'))

// PS-2: cross-border transfer detected
const xb = runDeterministicChecks({
  website_url: 'https://example.com',
  data_practices: 'we transfer data to the united states',
  user_region: 'Global',
})
assert('cross-border transfer detected (PRIV-002)', xb.hits.some((h) => h.id === 'PRIV-002'))

// PS-3: DPIA + breach notification detected (deepen pass)
const hi = runDeterministicChecks({
  website_url: 'https://example.com',
  data_practices: 'large scale special category biometric profiling',
  user_region: 'EU only',
})
assert('DPIA required detected (PRIV-012)', hi.hits.some((h) => h.id === 'PRIV-012'))
assert('breach notification detected (PRIV-013)', hi.hits.some((h) => h.id === 'PRIV-013'))

// PS-4: ruleset version + hits shape
assert('ruleset version current', RULESET_VERSION === 'privacyscan@2026-07-21')
assert('hits carry remediation + ref where present', pii.hits.every((h) => !!h.remediation))

console.log(`\nSELFTEST ${fail === 0 ? 'ALL PASS' : 'HAS FAILURES'} — pass=${pass} fail=${fail}`)
if (fail > 0) process.exit(1)
