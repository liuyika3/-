export type Mode = '教' | '做' | '教做一体'
export type Layer = 'base' | 'builtin' | 'external'
export type Risk = 'low' | 'medium' | 'high'
export type InteractionType = 'choose' | 'ask_user' | 'confirm' | 'tap'
export type TimeSlot = '07:30' | '09:00' | '12:30' | '18:30' | '20:30' | '21:00'
export type OverlayKind = 'start' | 'proof' | 'permission' | 'choose' | 'input' | 'media' | 'yesno'

export interface ToolMeta {
  id: string // e.g. "choose", "mcp.plaid"
  layer: Layer
  what: string
  why: string
  inputExample: object
  outputExample: object
  risk: Risk
  needsConfirm: boolean
  examples: string[]
}

export interface ToolLogStep {
  mode: Mode
  toolId: string
  summary: string
  payloadExample?: object
}

export interface CardCopy {
  coachName: string
  statusPill: 'Today' | 'Scheduled' | 'Waiting' | 'Done'
  title: string
  subtitle: string
  microChips?: string[] // up to 3
  primaryCta: string
  secondaryCta?: string // "Skip" / "Not today"
}

export interface InteractionOption {
  id: string
  label: string
  hint?: string
}

export interface InteractionSchema {
  kind: 'text' | 'number' | 'file' | 'audio' | 'video'
  placeholder?: string
}

export interface InteractionSpec {
  type: InteractionType
  prompt: string
  options?: InteractionOption[]
  schema?: InteractionSchema
  confirmText?: string
}

export interface OverlaySpec {
  kind: OverlayKind
  title: string
  prompt: string
  interactionType: InteractionType
  options?: InteractionOption[]
  schema?: InteractionSchema
  primaryActionLabel: string
  snoozeOptions: string[]
  secondaryActionLabel: string
}

export interface CardState {
  time: TimeSlot
  card: CardCopy
  interaction: InteractionSpec
  agentLogs: ToolLogStep[]
  displayCard?: CardCopy
  overlay?: OverlaySpec
  overlayLogs?: ToolLogStep[]
}

export interface OnboardingField {
  id: string
  label: string
  required: boolean
  type: 'choose' | 'text' | 'number' | 'file' | 'oauth'
  example?: string
}

export type Spectrum = 'doing-heavy' | 'middle' | 'learning-heavy'

export interface CaseConfig {
  caseId: string
  title: string
  spectrum: Spectrum
  todayGoal: string
  externalSkills: string[] // toolIds
  onboardingFields: OnboardingField[]
  timeline: Record<TimeSlot, CardState>
}

