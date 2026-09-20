import { randomUUID } from 'crypto'

// GDPR / PII readiness workflow (collect → detect → classify → report).
export type StepId = 'collect' | 'detect' | 'classify' | 'report'
export type RunStatus = 'running' | 'awaiting_confirm' | 'done' | 'failed'

export type RunState = {
  runId: string
  step: StepId
  inputs: Record<string, string>
  artifacts: Record<string, unknown>
  status: RunStatus
  pipelineId: string
  rulesetVersion?: string
  createdAt: string
  updatedAt: string
  error?: string
}

export const PIPELINE_ID = 'privacyscan-gdpr-v1'

export const STEP_ORDER: StepId[] = ['collect', 'detect', 'classify', 'report']

export const STEP_LABELS: Record<StepId, string> = {
  collect: 'Step 1/4 · Collect site & data info',
  detect: 'Step 2/4 · Detect PII & gaps',
  classify: 'Step 3/4 · Map GDPR articles',
  report: 'Step 4/4 · Readiness report',
}

export function createRun(inputs: Record<string, string>, pipelineId: string): RunState {
  const now = new Date().toISOString()
  return {
    runId: randomUUID(),
    step: 'collect',
    inputs,
    artifacts: {},
    status: 'running',
    pipelineId,
    createdAt: now,
    updatedAt: now,
  }
}

export function assertTransition(from: StepId, to: StepId) {
  const i = STEP_ORDER.indexOf(from)
  const j = STEP_ORDER.indexOf(to)
  if (j !== i + 1) {
    throw new Error(`Invalid step transition: ${from} → ${to}`)
  }
}

export function advance(state: RunState, to: StepId): RunState {
  assertTransition(state.step, to)
  return { ...state, step: to, updatedAt: new Date().toISOString() }
}
