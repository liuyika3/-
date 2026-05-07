import type {
  CaseConfig,
  CardState,
  TimeSlot,
  ToolLogStep,
  ToolMeta,
} from './types'

export const TIME_SLOTS: TimeSlot[] = ['07:30', '09:00', '12:30', '18:30', '20:30', '21:00']

export const toolsRegistry: Record<string, ToolMeta> = {
  choose: {
    id: 'choose',
    layer: 'base',
    what: 'Render a small set of single-choice options for the user.',
    why: 'Lets the coach ask the user to pick one path (e.g. Full/Short/Rest, person A/B/C).',
    inputExample: { options: ['Full', 'Short', 'Rest'] },
    outputExample: { choice: 'Full' },
    risk: 'low',
    needsConfirm: false,
    examples: [
      'Ask the user to pick a workout length.',
      'Let the user choose one role card to focus on.',
    ],
  },
  confirm: {
    id: 'confirm',
    layer: 'base',
    what: 'Ask for a clear yes/no approval before a sensitive action.',
    why: 'Wraps outbound actions like sending messages or opening external flows.',
    inputExample: { actionSummary: 'Send LinkedIn DM to hiring manager?' },
    outputExample: { approved: true },
    risk: 'medium',
    needsConfirm: false,
    examples: [
      'Confirm before sending a drafted outreach message.',
      'Confirm before opening a bank or brokerage signup page.',
    ],
  },
  'timeline.query': {
    id: 'timeline.query',
    layer: 'base',
    what: 'Query past timeline events for this user.',
    why: 'Helps the coach see history and adapt today’s plan.',
    inputExample: { range: 'last_7_days', filters: ['case_id'] },
    outputExample: { events: [{ at: '2026-02-23T21:00:00Z', label: 'daily_summary' }] },
    risk: 'low',
    needsConfirm: false,
    examples: [
      'Fetch all Career case events from the last week.',
      'Look up yesterday’s Strength effort logs.',
      'Get today-only events to build a daily summary.',
      'Read back proof events after a Strength or BBox session.',
    ],
  },
  'timeline.append': {
    id: 'timeline.append',
    layer: 'base',
    what: 'Append a new structured event to the user timeline.',
    why: 'Keeps a durable history of what the coach and user did.',
    inputExample: { timeSlot: '18:30', caseId: 'career', kind: 'message_sent' },
    outputExample: { ok: true, eventId: 'evt_123' },
    risk: 'low',
    needsConfirm: false,
    examples: [
      'Record that a LinkedIn message was approved and sent.',
      'Store a Strength RPE and pain rating.',
      'Append a Money leak fix result for funnel analytics.',
      'Append a “proof” event when the user uploads photo/audio/video.',
    ],
  },
  'session.get': {
    id: 'session.get',
    layer: 'base',
    what: 'Read short-lived session state for the current user.',
    why: 'Lets later steps reuse choices like selected role or person.',
    inputExample: { keys: ['today_roles'] },
    outputExample: { today_roles: ['Role A', 'Role B', 'Role C'] },
    risk: 'low',
    needsConfirm: false,
    examples: [
      'Retrieve which Career roles were shortlisted this morning.',
      'Get the currently selected Social contact.',
    ],
  },
  'session.set': {
    id: 'session.set',
    layer: 'base',
    what: 'Store short-lived keys for this coaching day.',
    why: 'Allows later cards to pick up context from earlier choices.',
    inputExample: { today_roles: ['Role A', 'Role B'] },
    outputExample: { ok: true },
    risk: 'low',
    needsConfirm: false,
    examples: [
      'Store the role chosen at 09:00 for later resume edits.',
      'Save Strength workout variant for the evening summary.',
      'Mark that a Start/Proof overlay has been handled so it does not re-open.',
    ],
  },
  'doc.read': {
    id: 'doc.read',
    layer: 'base',
    what: 'Read coaching documents, drafts, or snippets.',
    why: 'Lets the coach reuse prepared tips or drafts.',
    inputExample: { docId: 'career_resume_bullets' },
    outputExample: { sections: ['Impact bullet examples...'] },
    risk: 'low',
    needsConfirm: false,
    examples: [
      'Fetch the pre-written BBox practice tips.',
      'Load Money guide scripts for negotiation calls.',
    ],
  },
  'doc.write': {
    id: 'doc.write',
    layer: 'base',
    what: 'Generate or update a coach-facing document.',
    why: 'Stores drafts, summaries, or tips produced by the agent.',
    inputExample: { kind: 'daily_summary', content: 'Win / Blocker / Tomorrow...' },
    outputExample: { ok: true, docId: 'summary_2026-02-24' },
    risk: 'medium',
    needsConfirm: false,
    examples: [
      'Write a short daily summary of Career actions.',
      'Save two BBox technique fixes after an upload.',
    ],
  },
  'doc.patch': {
    id: 'doc.patch',
    layer: 'base',
    what: 'Apply a focused patch to an existing document.',
    why: 'Cleanly inserts or replaces a small part of a resume or script.',
    inputExample: { docId: 'resume_v3', op: 'replace_bullet', bulletIndex: 2 },
    outputExample: { ok: true, version: 4 },
    risk: 'medium',
    needsConfirm: false,
    examples: [
      'Swap a weak bullet for a metric-driven one.',
      'Tweak a Money negotiation script line.',
    ],
  },
  'sandbox.exec': {
    id: 'sandbox.exec',
    layer: 'base',
    what: 'Run constrained code for scoring, calculations, or timers.',
    why: 'Supports things like funnel math, RPE load calc, or rhythm games.',
    inputExample: { kind: 'funnel', inputs: { sent: 5, replied: 1 } },
    outputExample: { funnelScore: 0.2, recommendations: ['Increase top-of-funnel'] },
    risk: 'medium',
    needsConfirm: false,
    examples: [
      'Check STAR structure quality of a resume bullet.',
      'Compute Strength load from RPE and sets.',
      'Run a BBox metronome or Beat Match scoring.',
      'Score a Social interaction or job funnel after proof is logged.',
    ],
  },
  'schedule.create': {
    id: 'schedule.create',
    layer: 'base',
    what: 'Create scheduled follow-ups or future time slots.',
    why: 'Keeps the coach timeline stitched across days and weeks.',
    inputExample: { when: '2026-02-27T18:30:00Z', label: 'follow_up_message' },
    outputExample: { ok: true, scheduleId: 'sched_123' },
    risk: 'low',
    needsConfirm: false,
    examples: [
      'Schedule a +3d follow-up message.',
      'Create a weekly Money Date habit.',
      'Set a reminder to come back for a Proof overlay after a Start decision.',
    ],
  },
  'policy.check': {
    id: 'policy.check',
    layer: 'base',
    what: 'Run safety and policy checks on outbound content.',
    why: 'Ensures drafted messages stay within guidelines before sending.',
    inputExample: { channel: 'linkedin', text: 'Draft message here...' },
    outputExample: { allowed: true, reasons: [] },
    risk: 'low',
    needsConfirm: false,
    examples: [
      'Check if a Social DM is respectful.',
      'Verify Money scripts avoid giving regulated advice.',
      'Gate any permission overlay before sending through an external MCP.',
    ],
  },
  'web.search': {
    id: 'web.search',
    layer: 'builtin',
    what: 'Search the open web for fresh information.',
    why: 'Finds live job postings, salary ranges, or reference content.',
    inputExample: { query: 'Senior PM NYC LinkedIn jobs' },
    outputExample: { results: [{ title: 'Senior PM', url: 'https://...' }] },
    risk: 'medium',
    needsConfirm: false,
    examples: [
      'Search LinkedIn and Indeed for roles.',
      'Fetch examples for a Money rule of thumb.',
    ],
  },
  'web.fetch': {
    id: 'web.fetch',
    layer: 'builtin',
    what: 'Fetch a specific URL and extract key content.',
    why: 'Used to pull recipes, docs, or guides for the user.',
    inputExample: { url: 'https://example.com/high-protein-dinners' },
    outputExample: { title: 'Quick dinners', sections: ['Option A', 'Option B'] },
    risk: 'medium',
    needsConfirm: false,
    examples: [
      'Load a page with high-protein dinner ideas.',
      'Fetch a specific guide for opening a savings account.',
    ],
  },
  'browser.open': {
    id: 'browser.open',
    layer: 'builtin',
    what: 'Open a URL in the user’s browser.',
    why: 'Lets the user do sensitive steps (like banking) themselves.',
    inputExample: { url: 'https://bank.example.com/auto-save-setup' },
    outputExample: { ok: true },
    risk: 'medium',
    needsConfirm: true,
    examples: [
      'Open a step-by-step bank guide for Money leaks.',
      'Take the user to a product help center article.',
    ],
  },
  'ask_user': {
    id: 'ask_user',
    layer: 'base',
    what: 'Ask the user directly for text, number, or an upload.',
    why: 'Collects ground-truth clips, metrics, or personal lines.',
    inputExample: { kind: 'video', prompt: 'Upload a 10-second squat clip.' },
    outputExample: { uploadedUrl: 'https://uploads.example.com/clip.mp4' },
    risk: 'low',
    needsConfirm: false,
    examples: [
      'Ask for a 10s form check video.',
      'Collect a self-rating or 1-sentence reflection.',
    ],
  },
  'mcp.plaid.read': {
    id: 'mcp.plaid.read',
    layer: 'external',
    what: 'Read-only access to Plaid-linked financial data.',
    why: 'Detects spending “leaks” without making any changes.',
    inputExample: { scope: 'read_only', windowDays: 30 },
    outputExample: { merchants: [{ name: 'Subscription X', amount: 9.99 }] },
    risk: 'high',
    needsConfirm: true,
    examples: [
      'Scan last 30 days of card transactions.',
      'Identify a recurring subscription to cancel.',
    ],
  },
  'mcp.google_workspace.send': {
    id: 'mcp.google_workspace.send',
    layer: 'external',
    what: 'Send emails via Google Workspace on the user’s behalf.',
    why: 'Lets the coach ship approved messages without manual copy/paste.',
    inputExample: { to: 'hiring@company.com', subject: 'Follow-up', body: '...' },
    outputExample: { ok: true, messageId: 'msg_123' },
    risk: 'high',
    needsConfirm: true,
    examples: [
      'Send an approved outreach email.',
      'Deliver a follow-up after an interview.',
    ],
  },
  'mcp.linkedin.send': {
    id: 'mcp.linkedin.send',
    layer: 'external',
    what: 'Send LinkedIn DMs or connection requests.',
    why: 'Automates approved outreach while keeping a human-like tone.',
    inputExample: { toProfile: 'https://linkedin.com/in/example', text: '...' },
    outputExample: { ok: true },
    risk: 'high',
    needsConfirm: true,
    examples: [
      'Send a pre-approved DM with a personal line.',
      'Trigger a follow-up DM +3 days later.',
    ],
  },
  'mcp.gmail.send': {
    id: 'mcp.gmail.send',
    layer: 'external',
    what: 'Send emails via Gmail.',
    why: 'Used in Money flows to confirm actions or send scripts.',
    inputExample: { to: 'support@provider.com', subject: 'Cancel subscription', body: '...' },
    outputExample: { ok: true, id: 'gmail_123' },
    risk: 'high',
    needsConfirm: true,
    examples: [
      'Send a cancellation email for a leak.',
      'Email a bank about setting up auto-save.',
    ],
  },
  'mcp.twilio.send': {
    id: 'mcp.twilio.send',
    layer: 'external',
    what: 'Send SMS messages via Twilio.',
    why: 'Supports Social nudges or Money alerts over SMS.',
    inputExample: { to: '+15551234567', text: 'Quick check-in.' },
    outputExample: { ok: true, sid: 'SM123' },
    risk: 'high',
    needsConfirm: true,
    examples: [
      'Send a Social nudge via SMS.',
      'Confirm a Money reminder is on its way.',
    ],
  },
  'mcp.instagram.send': {
    id: 'mcp.instagram.send',
    layer: 'external',
    what: 'Send Instagram DMs.',
    why: 'Lets Social coach ship approved DMs on IG.',
    inputExample: { toHandle: '@friend', text: '...' },
    outputExample: { ok: true },
    risk: 'high',
    needsConfirm: true,
    examples: [
      'Send a warm IG DM with a personal line.',
      'Follow up after a story reply.',
    ],
  },
  'mcp.instacart.add_to_cart': {
    id: 'mcp.instacart.add_to_cart',
    layer: 'external',
    what: 'Add suggested groceries to the user’s Instacart cart.',
    why: 'Bridges Strength dinner suggestions into real groceries.',
    inputExample: { items: [{ name: 'Chicken breast', quantity: 2 }] },
    outputExample: { ok: true, cartUrl: 'https://instacart.com/cart/123' },
    risk: 'high',
    needsConfirm: true,
    examples: [
      'Propose a high-protein dinner set and pre-fill the cart.',
      'Offer a light dinner kit ready to confirm.',
    ],
  },
}

const makeLogs = (steps: ToolLogStep[]): ToolLogStep[] => steps

const careerTimeline: Record<TimeSlot, CardState> = {
  '07:30': {
    time: '07:30',
    card: {
      coachName: 'Career Coach',
      statusPill: 'Today',
      title: '今天目标：锁定 1 个岗位 + 发出 1 封联系',
      subtitle: '职位我已经帮你筛好，我们一起快速过一遍。',
      microChips: ['每天 2 个机会', '来源：LinkedIn / 招聘网站', '已按匹配度排序'],
      primaryCta: '开始',
      secondaryCta: '今天先不做',
    },
    interaction: {
      type: 'choose',
      prompt: '先看几个职位？',
      options: [
        { id: '3', label: '3 个，更快', hint: '聚焦一点' },
        { id: '5', label: '5 个，多一点', hint: '多看几个备选' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教做一体',
        toolId: 'timeline.query',
        summary: 'Look at your last 7 days of career funnel.',
      },
      {
        mode: '教做一体',
        toolId: 'web.search',
        summary: 'Collect LinkedIn + Indeed roles that match your profile.',
      },
      {
        mode: '教做一体',
        toolId: 'sandbox.exec',
        summary: 'Score each role for match and missing skills.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Save today’s shortlisted roles.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Block a 09:00 slot to pick one role.',
      },
    ]),
  },
  '09:00': {
    time: '09:00',
    card: {
      coachName: 'Career Coach',
      statusPill: 'Scheduled',
      title: '选出今天要冲的 1 个岗位',
      subtitle: '已找到 3 个匹配岗位。',
      microChips: ['匹配度', '薪资区间', '通勤 / 远程', '公司品牌'],
      primaryCta: '选择岗位',
      secondaryCta: '跳过',
    },
    interaction: {
      type: 'choose',
      prompt: '选出今天想主攻的那个岗位，我会帮你改简历和私信。',
      options: [
        { id: 'roleA', label: '岗位 A · 匹配度 82%' },
        { id: 'roleB', label: '岗位 B · 匹配度 76%' },
        { id: 'roleC', label: '岗位 C · 匹配度 71%' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'session.get',
        summary: 'Load the shortlist of roles saved this morning.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Draft today’s role brief: 3 strengths + 1 risk for the focused role.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Store the focus role so later cards can stay aligned.',
      },
    ]),
  },
  '12:30': {
    time: '12:30',
    card: {
      coachName: 'Career Coach',
      statusPill: 'Scheduled',
      title: '打磨一条简历经历',
      subtitle: '已准备好 2 个版本，选一个再加数字。',
      microChips: ['只改一条', '重点是量化成果'],
      primaryCta: '开始修改',
      secondaryCta: '暂时跳过',
    },
    interaction: {
      type: 'choose',
      prompt: '在 A/B 里选一个，再补充一个“数字”，让这条经历更有说服力。',
      options: [
        { id: 'A', label: '版本 A' },
        { id: 'B', label: '版本 B' },
      ],
      schema: {
        kind: 'text',
        placeholder: '加一个具体数字，例如 “+18% 转化率 / 3 次上线”…',
      },
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'doc.read',
        summary: 'Load your current resume bullets for the chosen role.',
      },
      {
        mode: '教',
        toolId: 'sandbox.exec',
        summary: 'Check if the new bullet follows STAR and is specific.',
      },
      {
        mode: '教',
        toolId: 'doc.patch',
        summary: 'Patch the chosen bullet with your new metric.',
      },
      {
        mode: '教',
        toolId: 'timeline.append',
        summary: 'Record that one measurable resume upgrade was done.',
      },
    ]),
  },
  '18:30': {
    time: '18:30',
    card: {
      coachName: 'Career Coach',
      statusPill: 'Waiting',
      title: '发出 1 封高质量私信',
      subtitle: '一份模板，同时生成 LinkedIn + 邮件草稿。',
      microChips: ['LinkedIn + 邮件', '1–2 句即可', '避免像群发广告'],
      primaryCta: '现在生成',
      secondaryCta: '今晚不发',
    },
    overlay: {
      kind: 'permission',
      title: '现在发送今天的私信吗？',
      prompt: '确认后会帮你打开 LinkedIn / 邮箱草稿，也可以选择稍后提醒。',
      interactionType: 'confirm',
      options: [
        { id: 'linkedin', label: 'LinkedIn 私信' },
        { id: 'email', label: '邮件' },
      ],
      primaryActionLabel: '确认发送',
      secondaryActionLabel: '改天再说',
      snoozeOptions: ['30 分钟', '今晚', '明天'],
    },
    interaction: {
      type: 'choose',
      prompt: '先选渠道，再补充一句个人化信息，最后确认发送。',
      options: [
        { id: 'linkedin', label: 'LinkedIn 私信' },
        { id: 'email', label: '邮件' },
      ],
      schema: {
        kind: 'text',
        placeholder: '写一句个人化信息，例如最近看的文章 / 演讲 / 产品更新…',
      },
      confirmText: '确认发送这条消息？',
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'policy.check',
        summary: 'Run safety + tone checks on the drafted message.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Generate 2 message variants for review.',
      },
      {
        mode: '做',
        toolId: 'mcp.google_workspace.send',
        summary: 'Send via email if you approve and picked Email.',
      },
      {
        mode: '做',
        toolId: 'mcp.linkedin.send',
        summary: 'Send via LinkedIn DM if you approve and picked LinkedIn.',
      },
      {
        mode: '教做一体',
        toolId: 'timeline.append',
        summary: 'Record that outreach was sent and on which channel.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Create a +3d follow-up slot for this contact.',
      },
    ]),
    overlayLogs: makeLogs([
      {
        mode: '教',
        toolId: 'policy.check',
        summary: 'Run policy + tone checks before sending from the permission overlay.',
      },
      {
        mode: '教',
        toolId: 'confirm',
        summary: 'Ask for explicit yes/no approval to send now.',
      },
      {
        mode: '做',
        toolId: 'mcp.linkedin.send',
        summary: 'If approved and LinkedIn chosen, send via LinkedIn DM.',
      },
      {
        mode: '做',
        toolId: 'mcp.google_workspace.send',
        summary: 'If approved and Email chosen, send via Google Workspace.',
      },
      {
        mode: '教做一体',
        toolId: 'timeline.append',
        summary: 'Append a proof-like event that outreach was sent or snoozed.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Schedule a +3d reminder for follow-up or proof.',
      },
    ]),
  },
  '20:30': {
    time: '20:30',
    card: {
      coachName: 'Career Coach',
      statusPill: 'Waiting',
      title: 'Log outcome',
      subtitle: 'So I adjust tomorrow’s plan.',
      microChips: ['Funnel updates', 'Difficulty adapts'],
      primaryCta: 'Log',
      secondaryCta: 'Skip',
    },
    interaction: {
      type: 'choose',
      prompt: 'What happened with today’s outreach?',
      options: [
        { id: 'sent', label: 'Sent' },
        { id: 'not_sent', label: 'Not sent' },
        { id: 'replied', label: 'Replied' },
        { id: 'interview', label: 'Interview' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教做一体',
        toolId: 'timeline.append',
        summary: 'Record today’s outreach outcome.',
      },
      {
        mode: '教做一体',
        toolId: 'sandbox.exec',
        summary: 'Recompute your funnel and spot leaks.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Save an adjustment flag for tomorrow (easier/harder).',
      },
    ]),
  },
  '21:00': {
    time: '21:00',
    card: {
      coachName: 'Career Coach',
      statusPill: 'Today',
      title: 'Daily Summary',
      subtitle: 'Win / Blocker / Tomorrow',
      microChips: ['Win: 1', 'Next: 1 action'],
      primaryCta: 'Confirm tomorrow plan',
      secondaryCta: 'Edit',
    },
    interaction: {
      type: 'confirm',
      prompt: 'Review your daily summary. Does tomorrow’s plan look right?',
      confirmText: 'Confirm tomorrow’s plan',
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'timeline.query',
        summary: 'Pull everything you did today in Career.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Draft a short summary with 1 win and 1 blocker.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Create the next action slot for tomorrow.',
      },
    ]),
  },
}

const strengthTimeline: Record<TimeSlot, CardState> = {
  '07:30': {
    time: '07:30',
    card: {
      coachName: 'Strength Coach',
      statusPill: 'Today',
      title: 'Today’s Goal: 12-min session + 1 form check',
      subtitle: 'Pick Full/Short/Rest. I’ll scale it.',
      microChips: ['Streak: 3', 'Time: 12m', 'Form: 1 clip'],
      primaryCta: 'Start',
      secondaryCta: 'Not today',
    },
    interaction: {
      type: 'choose',
      prompt: 'How do you want today’s strength session to feel?',
      options: [
        { id: 'full', label: 'Full' },
        { id: 'short', label: 'Short' },
        { id: 'rest', label: 'Rest' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'timeline.query',
        summary: 'Look at your last few strength sessions.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Store today’s workout template (Full / Short / Rest).',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Block a 09:00 prep slot for warm-up + intent.',
      },
    ]),
  },
  '09:00': {
    time: '09:00',
    card: {
      coachName: 'Strength Coach',
      statusPill: 'Scheduled',
      title: 'Prep (5 min)',
      subtitle: 'Warm-up checklist + set intent.',
      microChips: ['Energy check', 'Warm-up 3 steps'],
      primaryCta: 'View prep',
      secondaryCta: 'Skip',
    },
    overlay: {
      kind: 'start',
      title: 'Start today’s prep?',
      prompt: 'Commit to doing the 5-min warm-up now or later.',
      interactionType: 'confirm',
      primaryActionLabel: 'Do it now',
      secondaryActionLabel: 'Skip',
      snoozeOptions: ['30m', 'Tonight', 'Tomorrow'],
    },
    interaction: {
      type: 'choose',
      prompt: 'How is your energy right now?',
      options: [
        { id: 'low', label: 'Low' },
        { id: 'ok', label: 'OK' },
        { id: 'high', label: 'High' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Generate a 3-step warm-up and intention script.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Save today’s planned intensity based on energy.',
      },
    ]),
    overlayLogs: makeLogs([
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Mark that today’s warm-up has a Start overlay decision.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'If snoozed, set a reminder to come back for warm-up.',
      },
    ]),
  },
  '12:30': {
    time: '12:30',
    card: {
      coachName: 'Strength Coach',
      statusPill: 'Waiting',
      title: 'Form check: upload 10s',
      subtitle: 'I’ll give 2 fixes only.',
      microChips: ['10s clip', '2 fixes max'],
      primaryCta: 'Upload',
      secondaryCta: 'Self-rate instead',
    },
    overlay: {
      kind: 'proof',
      title: 'Proof: today’s form check',
      prompt: 'Upload a 10s clip or self-rate your form so we can update your plan.',
      interactionType: 'ask_user',
      schema: {
        kind: 'video',
        placeholder: 'Upload 10s form clip or choose self-rate…',
      },
      options: [
        { id: 'self_rate_good', label: 'Self-rate: solid', hint: 'No upload, just a quick check' },
      ],
      primaryActionLabel: 'Submit proof',
      secondaryActionLabel: 'Skip',
      snoozeOptions: ['30m', 'Tonight', 'Tomorrow'],
    },
    interaction: {
      type: 'ask_user',
      prompt: 'Upload a 10-second clip of your key lift, or self-rate instead.',
      schema: {
        kind: 'video',
        placeholder: 'Upload 10s form clip...',
      },
      options: [
        { id: 'self_rate', label: 'Self-rate instead', hint: 'No video, just your own score.' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'ask_user',
        summary: 'Collect either a 10s video or a self-rating.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Produce exactly two concrete form fixes.',
      },
      {
        mode: '教',
        toolId: 'timeline.append',
        summary: 'Attach form feedback to today’s Strength timeline.',
      },
    ]),
    overlayLogs: makeLogs([
      {
        mode: '教',
        toolId: 'ask_user',
        summary: 'Collect either a 10s video clip or a self-rating as proof.',
      },
      {
        mode: '教做一体',
        toolId: 'timeline.append',
        summary: 'Append a proof event with clip metadata or self-rating.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Update next-step difficulty based on proof quality.',
      },
    ]),
  },
  '18:30': {
    time: '18:30',
    card: {
      coachName: 'Strength Coach',
      statusPill: 'Scheduled',
      title: 'Log effort',
      subtitle: 'RPE + pain. I’ll adjust tomorrow.',
      microChips: ['RPE 1–10', 'Pain 0–3'],
      primaryCta: 'Log',
      secondaryCta: 'Skip',
    },
    interaction: {
      type: 'choose',
      prompt: 'Log your effort (RPE) and any pain.',
      options: [
        { id: 'rpe_4', label: 'RPE ~4 (easy)' },
        { id: 'rpe_7', label: 'RPE ~7 (solid)' },
        { id: 'rpe_9', label: 'RPE ~9 (near max)' },
        { id: 'pain_0', label: 'Pain 0–1' },
        { id: 'pain_2', label: 'Pain 2–3' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教做一体',
        toolId: 'timeline.append',
        summary: 'Append effort and pain scores for this session.',
      },
      {
        mode: '做',
        toolId: 'sandbox.exec',
        summary: 'Calculate training load from RPE and volume.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Save adjustment for tomorrow (lighter / heavier).',
      },
    ]),
  },
  '20:30': {
    time: '20:30',
    card: {
      coachName: 'Strength Coach',
      statusPill: 'Scheduled',
      title: 'Dinner suggestion',
      subtitle: 'Pick: High-protein / Balanced / Light',
      microChips: ['10-min meals', 'Optional Instacart'],
      primaryCta: 'Choose',
      secondaryCta: 'Not today',
    },
    interaction: {
      type: 'choose',
      prompt: 'What kind of dinner fits tonight?',
      options: [
        { id: 'high_protein', label: 'High-protein' },
        { id: 'balanced', label: 'Balanced' },
        { id: 'light', label: 'Light' },
      ],
      confirmText: 'Add suggested items to Instacart cart?',
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'web.fetch',
        summary: 'Fetch 10-min recipes matching your choice.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Summarize 2–3 simple dinner options.',
      },
      {
        mode: '做',
        toolId: 'mcp.instacart.add_to_cart',
        summary: 'Optionally pre-fill an Instacart cart for you to confirm.',
      },
    ]),
  },
  '21:00': {
    time: '21:00',
    card: {
      coachName: 'Strength Coach',
      statusPill: 'Today',
      title: 'Daily Summary',
      subtitle: 'Win/Blocker/Tomorrow',
      microChips: ['Tomorrow auto-scaled'],
      primaryCta: 'Confirm',
    },
    interaction: {
      type: 'confirm',
      prompt: 'Confirm today’s Strength summary and tomorrow’s auto-scaled plan.',
      confirmText: 'Confirm and schedule tomorrow',
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'timeline.query',
        summary: 'Pull today’s Strength events.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Draft a one-line Strength summary.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Schedule tomorrow’s scaled workout.',
      },
    ]),
  },
}

const moneyTimeline: Record<TimeSlot, CardState> = {
  '07:30': {
    time: '07:30',
    card: {
      coachName: 'Money Coach',
      statusPill: 'Today',
      title: 'Today’s Goal: Fix 1 leak (10 min)',
      subtitle: 'Auto (Plaid) or Manual.',
      microChips: ['Mode: Auto/Manual', 'Read-only by default'],
      primaryCta: 'Start',
      secondaryCta: 'Not today',
    },
    interaction: {
      type: 'choose',
      prompt: 'How do you want to find today’s money leak?',
      options: [
        { id: 'auto', label: 'Auto (Plaid)' },
        { id: 'manual', label: 'Manual review' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教做一体',
        toolId: 'mcp.plaid.read',
        summary: 'Read-only scan of recent transactions (no changes).',
      },
      {
        mode: '做',
        toolId: 'sandbox.exec',
        summary: 'Classify likely “leaks” by category and pattern.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Save today’s candidate action (cancel / negotiate / auto-save).',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Hold a 12:30 slot to actually fix 1 leak.',
      },
    ]),
  },
  '09:00': {
    time: '09:00',
    card: {
      coachName: 'Money Coach',
      statusPill: 'Scheduled',
      title: 'Money skill (5 min)',
      subtitle: 'One rule you’ll use today.',
      microChips: ['Rule + example'],
      primaryCta: 'View',
      secondaryCta: 'Skip',
    },
    interaction: {
      type: 'choose',
      prompt: 'Did this rule land, or do you want an example?',
      options: [
        { id: 'got_it', label: 'Got it' },
        { id: 'need_example', label: 'Need example' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'web.fetch',
        summary: 'Fetch a clear description of one Money rule.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Summarize the rule + one concrete example for today.',
      },
    ]),
  },
  '12:30': {
    time: '12:30',
    card: {
      coachName: 'Money Coach',
      statusPill: 'Waiting',
      title: 'Fix 1 leak',
      subtitle: 'Cancel / Negotiate / Auto-save (approval required).',
      microChips: ['Steps ready', 'Approval required'],
      primaryCta: 'View steps',
      secondaryCta: 'Not today',
    },
    overlay: {
      kind: 'permission',
      title: 'Approve today’s money action?',
      prompt:
        'Approve sending a negotiation / cancellation email or opening a bank guide in your browser.',
      interactionType: 'confirm',
      options: [
        { id: 'cancel', label: 'Cancel subscription' },
        { id: 'negotiate', label: 'Negotiate price' },
        { id: 'auto_save', label: 'Set up auto-save' },
      ],
      primaryActionLabel: 'Approve',
      secondaryActionLabel: 'Skip',
      snoozeOptions: ['30m', 'Tonight', 'Tomorrow'],
    },
    interaction: {
      type: 'choose',
      prompt: 'Pick how you want to handle this leak, then approve actions.',
      options: [
        { id: 'cancel', label: 'Cancel' },
        { id: 'negotiate', label: 'Negotiate' },
        { id: 'auto_save', label: 'Auto-save' },
      ],
      confirmText: 'Approve using browser + email/SMS helpers?',
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Prepare steps + scripts for your chosen option.',
      },
      {
        mode: '做',
        toolId: 'browser.open',
        summary: 'Open the provider’s guide so you do sensitive steps yourself.',
      },
      {
        mode: '做',
        toolId: 'mcp.gmail.send',
        summary: 'Send an approval-based email if you choose that path.',
      },
      {
        mode: '做',
        toolId: 'mcp.twilio.send',
        summary: 'Optionally text a script to yourself for later.',
      },
      {
        mode: '教',
        toolId: 'timeline.append',
        summary: 'Record which leak you tackled and how.',
      },
    ]),
    overlayLogs: makeLogs([
      {
        mode: '教',
        toolId: 'policy.check',
        summary: 'Check scripts for compliance before any outbound email / SMS.',
      },
      {
        mode: '教',
        toolId: 'confirm',
        summary: 'Ask for approval to proceed with the chosen money action.',
      },
      {
        mode: '做',
        toolId: 'browser.open',
        summary: 'If approved, open the provider/bank guide in the user’s browser.',
      },
      {
        mode: '做',
        toolId: 'mcp.gmail.send',
        summary: 'Optionally send a prepared negotiation/cancellation email.',
      },
      {
        mode: '做',
        toolId: 'mcp.twilio.send',
        summary: 'Optionally send a supporting SMS to the user.',
      },
      {
        mode: '教做一体',
        toolId: 'timeline.append',
        summary: 'Append a proof-style event of what action was taken or snoozed.',
      },
    ]),
  },
  '18:30': {
    time: '18:30',
    card: {
      coachName: 'Money Coach',
      statusPill: 'Scheduled',
      title: 'Did you do it?',
      subtitle: 'Done / Not today / Need help',
      microChips: ['Difficulty adapts'],
      primaryCta: 'Log',
      secondaryCta: 'Skip',
    },
    interaction: {
      type: 'choose',
      prompt: 'How did the leak-fix go?',
      options: [
        { id: 'done', label: 'Done' },
        { id: 'not_today', label: 'Not today' },
        { id: 'need_help', label: 'Need help' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'timeline.append',
        summary: 'Append the outcome of today’s leak action.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Mark if tomorrow should be easier or more advanced.',
      },
    ]),
  },
  '20:30': {
    time: '20:30',
    card: {
      coachName: 'Money Coach',
      statusPill: 'Scheduled',
      title: 'Set Weekly Money Date',
      subtitle: 'Pick a weekly 15-min slot.',
      microChips: ['Weekly habit'],
      primaryCta: 'Choose time',
      secondaryCta: 'Skip',
    },
    interaction: {
      type: 'choose',
      prompt: 'Pick a day + time for your weekly 15-min money date.',
      options: [
        { id: 'sun_pm', label: 'Sunday PM' },
        { id: 'mon_morning', label: 'Monday morning' },
        { id: 'fri_pm', label: 'Friday PM' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教做一体',
        toolId: 'schedule.create',
        summary: 'Create a recurring weekly event for your Money Date.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Draft a simple 3-step weekly Money Date plan.',
      },
    ]),
  },
  '21:00': {
    time: '21:00',
    card: {
      coachName: 'Money Coach',
      statusPill: 'Today',
      title: 'Daily Summary',
      subtitle: 'Win/Blocker/Tomorrow',
      primaryCta: 'Confirm',
    },
    interaction: {
      type: 'confirm',
      prompt: 'Confirm today’s Money summary and tomorrow’s next step.',
      confirmText: 'Confirm and schedule next money action',
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'timeline.query',
        summary: 'Fetch today’s Money actions and outcomes.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Write a short summary and one tomorrow step.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Schedule the next money action for tomorrow.',
      },
    ]),
  },
}

const bboxTimeline: Record<TimeSlot, CardState> = {
  '07:30': {
    time: '07:30',
    card: {
      coachName: 'BBox Coach',
      statusPill: 'Today',
      title: 'Today’s Goal: 1 sound + 10s recording',
      subtitle: 'One tiny win.',
      microChips: ['Sound: Kick', 'Time: 10m'],
      primaryCta: 'Start',
      secondaryCta: 'Not today',
    },
    interaction: {
      type: 'choose',
      prompt: 'Pick today’s focus sound.',
      options: [
        { id: 'kick', label: 'Kick' },
        { id: 'hihat', label: 'Hi-hat' },
        { id: 'snare', label: 'Snare' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'timeline.query',
        summary: 'Check recent BBox drills and wins.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Save today’s target sound and pattern.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Prepare 1–2 focus tips for that sound.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Block a 12:30 drill slot.',
      },
    ]),
  },
  '09:00': {
    time: '09:00',
    card: {
      coachName: 'BBox Coach',
      statusPill: 'Scheduled',
      title: '1 key tip',
      subtitle: 'What to focus on today.',
      microChips: ['2 fixes only'],
      primaryCta: 'View',
      secondaryCta: 'Skip',
    },
    interaction: {
      type: 'tap',
      prompt: 'Tap to view today’s key BBox tip.',
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'doc.read',
        summary: 'Read the stored BBox tips for today’s sound.',
      },
      {
        mode: '教',
        toolId: 'timeline.append',
        summary: 'Mark that you viewed today’s tip.',
      },
    ]),
  },
  '12:30': {
    time: '12:30',
    card: {
      coachName: 'BBox Coach',
      statusPill: 'Waiting',
      title: '10-min drill (timer)',
      subtitle: '30s on / 15s rest.',
      primaryCta: 'Start',
      secondaryCta: 'Skip',
    },
    overlay: {
      kind: 'start',
      title: 'Start 10-min drill?',
      prompt: 'Kick off a 10-min timer block now or snooze it.',
      interactionType: 'confirm',
      primaryActionLabel: 'Start now',
      secondaryActionLabel: 'Skip',
      snoozeOptions: ['30m', 'Tonight', 'Tomorrow'],
    },
    interaction: {
      type: 'tap',
      prompt: 'Tap to start a 10-min drill timer.',
    },
    agentLogs: makeLogs([
      {
        mode: '做',
        toolId: 'sandbox.exec',
        summary: 'Run a simple metronome + work/rest timer.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Schedule a +10m reminder to record a clip.',
      },
    ]),
    overlayLogs: makeLogs([
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Mark that a BBox drill Start overlay has been handled.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'If snoozed, schedule a reminder for later today.',
      },
    ]),
  },
  '18:30': {
    time: '18:30',
    card: {
      coachName: 'BBox Coach',
      statusPill: 'Waiting',
      title: 'Record 10 seconds',
      subtitle: 'I’ll give 2 fixes only.',
      primaryCta: 'Upload',
      secondaryCta: 'Skip',
    },
    overlay: {
      kind: 'proof',
      title: 'Proof: 10s audio',
      prompt: 'Upload a 10s audio clip so I can score and give 2 fixes.',
      interactionType: 'ask_user',
      schema: {
        kind: 'audio',
        placeholder: 'Upload 10s audio…',
      },
      primaryActionLabel: 'Submit audio',
      secondaryActionLabel: 'Skip',
      snoozeOptions: ['30m', 'Tonight', 'Tomorrow'],
    },
    interaction: {
      type: 'ask_user',
      prompt: 'Record and upload a 10s clip of today’s pattern.',
      schema: {
        kind: 'audio',
        placeholder: 'Upload 10s audio...',
      },
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'ask_user',
        summary: 'Collect your 10s audio clip.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Generate exactly 2 focused fixes.',
      },
      {
        mode: '教',
        toolId: 'timeline.append',
        summary: 'Append score and notes to today’s BBox timeline.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Store a simple “game pattern” for Beat Match.',
      },
    ]),
    overlayLogs: makeLogs([
      {
        mode: '教',
        toolId: 'ask_user',
        summary: 'Collect a 10s audio clip as proof.',
      },
      {
        mode: '教做一体',
        toolId: 'timeline.append',
        summary: 'Append a proof event with audio reference and score.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Update BBox pattern difficulty based on proof quality.',
      },
    ]),
  },
  '20:30': {
    time: '20:30',
    card: {
      coachName: 'BBox Coach',
      statusPill: 'Scheduled',
      title: 'Game: Beat Match',
      subtitle: 'Copy A-A-B-A.',
      primaryCta: 'Record',
      secondaryCta: 'Skip',
    },
    interaction: {
      type: 'ask_user',
      prompt: 'Try to copy A-A-B-A and upload your attempt.',
      schema: {
        kind: 'audio',
        placeholder: 'Upload Beat Match attempt...',
      },
    },
    agentLogs: makeLogs([
      {
        mode: '教做一体',
        toolId: 'sandbox.exec',
        summary: 'Run Beat Match scoring on your clip.',
      },
      {
        mode: '教',
        toolId: 'timeline.append',
        summary: 'Store game score and a short note.',
      },
    ]),
  },
  '21:00': {
    time: '21:00',
    card: {
      coachName: 'BBox Coach',
      statusPill: 'Today',
      title: 'Daily Summary',
      subtitle: 'Win/Blocker/Tomorrow',
      primaryCta: 'Confirm',
    },
    interaction: {
      type: 'confirm',
      prompt: 'Confirm today’s BBox win and tomorrow’s tiny target.',
      confirmText: 'Confirm summary',
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'timeline.query',
        summary: 'Pull today’s BBox events and clips.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Write a tiny win + next target summary.',
      },
    ]),
  },
}

const socialTimeline: Record<TimeSlot, CardState> = {
  '07:30': {
    time: '07:30',
    card: {
      coachName: 'Social Coach',
      statusPill: 'Today',
      title: 'Tiny social warm-up (1 min)',
      subtitle: 'Pick a tone for today.',
      primaryCta: 'Choose',
      secondaryCta: 'Not today',
    },
    interaction: {
      type: 'choose',
      prompt: 'What tone do you want to practice today?',
      options: [
        { id: 'warm', label: 'Warm' },
        { id: 'direct', label: 'Direct' },
        { id: 'boundary', label: 'Boundary' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Store today’s chosen tone.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Block a 09:00 slot to pick a person.',
      },
    ]),
  },
  '09:00': {
    time: '09:00',
    card: {
      coachName: 'Social Coach',
      statusPill: 'Scheduled',
      title: 'Choose 1 person',
      subtitle: 'From your list.',
      primaryCta: 'Choose',
      secondaryCta: 'Skip',
    },
    interaction: {
      type: 'choose',
      prompt: 'Pick one person from your list for today.',
      options: [
        { id: 'person_a', label: 'Person A' },
        { id: 'person_b', label: 'Person B' },
        { id: 'person_c', label: 'Person C' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'doc.read',
        summary: 'Read your saved contact list.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Store today’s chosen person.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Schedule a 12:30 drafting slot.',
      },
    ]),
  },
  '12:30': {
    time: '12:30',
    card: {
      coachName: 'Social Coach',
      statusPill: 'Waiting',
      title: 'Draft 1 message',
      subtitle: 'Add 1 personal line. Approval required.',
      primaryCta: 'Draft',
      secondaryCta: 'Skip',
    },
    overlay: {
      kind: 'permission',
      title: 'Send this message?',
      prompt:
        'Approve sending this IG DM / SMS / Email now, or snooze it and we’ll remind you later.',
      interactionType: 'confirm',
      options: [
        { id: 'ig', label: 'Instagram DM' },
        { id: 'sms', label: 'SMS' },
        { id: 'email', label: 'Email' },
      ],
      primaryActionLabel: 'Approve & send',
      secondaryActionLabel: 'Skip',
      snoozeOptions: ['30m', 'Tonight', 'Tomorrow'],
    },
    interaction: {
      type: 'choose',
      prompt: 'Pick a style, add one personal line, then approve sending.',
      options: [
        { id: 'warm', label: 'Warm' },
        { id: 'direct', label: 'Direct' },
        { id: 'boundary', label: 'Boundary' },
      ],
      schema: {
        kind: 'text',
        placeholder: 'Add one personal line...',
      },
      confirmText: 'Approve sending via your chosen channel?',
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'policy.check',
        summary: 'Check the drafted message for tone and safety.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Draft 2–3 variants you can approve.',
      },
      {
        mode: '做',
        toolId: 'mcp.instagram.send',
        summary: 'Send via Instagram DM if that’s the right channel.',
      },
      {
        mode: '做',
        toolId: 'mcp.twilio.send',
        summary: 'Send as SMS via Twilio if that’s chosen.',
      },
      {
        mode: '做',
        toolId: 'mcp.google_workspace.send',
        summary: 'Send as email if you prefer.',
      },
      {
        mode: '教',
        toolId: 'timeline.append',
        summary: 'Log that a message was sent and how.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Schedule a 20:30 review slot.',
      },
    ]),
    overlayLogs: makeLogs([
      {
        mode: '教',
        toolId: 'policy.check',
        summary: 'Run policy and tone checks before any Social send.',
      },
      {
        mode: '教',
        toolId: 'confirm',
        summary: 'Ask for explicit approval to send the Social message.',
      },
      {
        mode: '做',
        toolId: 'mcp.instagram.send',
        summary: 'If IG chosen and approved, send via Instagram DM.',
      },
      {
        mode: '做',
        toolId: 'mcp.twilio.send',
        summary: 'If SMS chosen and approved, send via Twilio.',
      },
      {
        mode: '做',
        toolId: 'mcp.google_workspace.send',
        summary: 'If Email chosen and approved, send via Google Workspace.',
      },
      {
        mode: '教做一体',
        toolId: 'timeline.append',
        summary: 'Append a Social proof event for the sent or snoozed message.',
      },
    ]),
  },
  '18:30': {
    time: '18:30',
    card: {
      coachName: 'Social Coach',
      statusPill: 'Waiting',
      title: 'Nudge or wait',
      subtitle: 'If no reply, we’ll follow up tomorrow.',
      primaryCta: 'Log',
      secondaryCta: 'Skip',
    },
    interaction: {
      type: 'choose',
      prompt: 'What’s the status so far?',
      options: [
        { id: 'replied', label: 'Replied' },
        { id: 'no_reply', label: 'No reply yet' },
      ],
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'timeline.append',
        summary: 'Append today’s reply status.',
      },
      {
        mode: '教',
        toolId: 'session.set',
        summary: 'Save follow-up rule (nudge or let it rest).',
      },
    ]),
  },
  '20:30': {
    time: '20:30',
    card: {
      coachName: 'Social Coach',
      statusPill: 'Scheduled',
      title: 'Review (1 min)',
      subtitle: 'What happened?',
      primaryCta: 'Log',
      secondaryCta: 'Skip',
    },
    overlay: {
      kind: 'input',
      title: 'Quick review',
      prompt: 'Log how this interaction felt and one sentence of reflection.',
      interactionType: 'choose',
      options: [
        { id: 'no_reply', label: 'No reply' },
        { id: 'positive', label: 'Positive' },
        { id: 'awkward', label: 'Awkward' },
        { id: 'conflict', label: 'Conflict' },
      ],
      schema: {
        kind: 'text',
        placeholder: 'Optional: add 1 sentence about what felt hard or good…',
      },
      primaryActionLabel: 'Log review',
      secondaryActionLabel: 'Skip',
      snoozeOptions: ['30m', 'Tonight', 'Tomorrow'],
    },
    interaction: {
      type: 'choose',
      prompt: 'How did this interaction feel?',
      options: [
        { id: 'no_reply', label: 'No reply' },
        { id: 'positive', label: 'Positive' },
        { id: 'awkward', label: 'Awkward' },
        { id: 'conflict', label: 'Conflict' },
      ],
      schema: {
        kind: 'text',
        placeholder: 'Optionally add 1 sentence...',
      },
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'timeline.append',
        summary: 'Append a short review of the interaction.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Generate one knowledge tip + next step.',
      },
    ]),
    overlayLogs: makeLogs([
      {
        mode: '教做一体',
        toolId: 'timeline.append',
        summary: 'Append a short review event with feeling + optional text.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Turn the review into one simple knowledge tip and suggestion.',
      },
    ]),
  },
  '21:00': {
    time: '21:00',
    card: {
      coachName: 'Social Coach',
      statusPill: 'Today',
      title: 'Daily Summary',
      subtitle: 'Win/Blocker/Tomorrow',
      primaryCta: 'Confirm',
    },
    interaction: {
      type: 'confirm',
      prompt: 'Confirm today’s Social summary and next contact plan.',
      confirmText: 'Confirm and schedule next Social action',
    },
    agentLogs: makeLogs([
      {
        mode: '教',
        toolId: 'timeline.query',
        summary: 'Pull today’s Social events.',
      },
      {
        mode: '教',
        toolId: 'doc.write',
        summary: 'Write a short Social reflection and next action.',
      },
      {
        mode: '做',
        toolId: 'schedule.create',
        summary: 'Schedule the next Social touchpoint.',
      },
    ]),
  },
}

export const casesById: Record<string, CaseConfig> = {
  career: {
    caseId: 'career',
    title: '职业教练',
    spectrum: 'middle',
    todayGoal: '今天完成：1 个目标岗位 + 1 次高质量私信。',
    externalSkills: ['mcp.linkedin.send', 'mcp.google_workspace.send'],
    onboardingFields: [
      {
        id: 'target_role',
        label: '目标岗位',
        required: true,
        type: 'text',
        example: '高级产品经理',
      },
      {
        id: 'target_location',
        label: '目标城市 / 地点',
        required: false,
        type: 'text',
        example: '上海 / 北京 / 远程',
      },
      {
        id: 'resume_file',
        label: '简历（PDF）',
        required: true,
        type: 'file',
        example: 'resume.pdf',
      },
      {
        id: 'linkedin_url',
        label: 'LinkedIn 主页',
        required: true,
        type: 'oauth',
        example: '连接 LinkedIn',
      },
    ],
    timeline: careerTimeline,
  },
  strength: {
    caseId: 'strength',
    title: 'Strength Coach',
    spectrum: 'doing-heavy',
    todayGoal: '12-min session, 1 form check, and dinner choice.',
    externalSkills: ['mcp.instacart.add_to_cart'],
    onboardingFields: [
      {
        id: 'equipment',
        label: 'Available equipment',
        required: true,
        type: 'text',
        example: 'Dumbbells, pull-up bar',
      },
      {
        id: 'injury_notes',
        label: 'Injuries or limits',
        required: false,
        type: 'text',
        example: 'Knee feels sensitive on deep squats',
      },
      {
        id: 'goal',
        label: 'Primary strength goal',
        required: true,
        type: 'choose',
        example: 'Muscle / Strength / Longevity',
      },
    ],
    timeline: strengthTimeline,
  },
  money: {
    caseId: 'money',
    title: 'Money Coach',
    spectrum: 'middle',
    todayGoal: 'Find and fix 1 money leak.',
    externalSkills: ['mcp.plaid.read'],
    onboardingFields: [
      {
        id: 'plaid_linked',
        label: 'Connect Plaid (read-only)',
        required: false,
        type: 'oauth',
        example: 'Link bank via Plaid (read-only)',
      },
      {
        id: 'income',
        label: 'Monthly after-tax income',
        required: false,
        type: 'number',
        example: '3200',
      },
      {
        id: 'money_stress',
        label: 'Money stress level (1–10)',
        required: false,
        type: 'number',
        example: '6',
      },
    ],
    timeline: moneyTimeline,
  },
  bbox: {
    caseId: 'bbox',
    title: 'BBox Coach',
    spectrum: 'learning-heavy',
    todayGoal: '1 sound, 10-min drill, and 10s clip.',
    externalSkills: [],
    onboardingFields: [
      {
        id: 'experience',
        label: 'Experience level',
        required: true,
        type: 'choose',
        example: 'Beginner / Intermediate / Advanced',
      },
      {
        id: 'recording_setup',
        label: 'Recording setup',
        required: false,
        type: 'text',
        example: 'Phone mic + headphones',
      },
    ],
    timeline: bboxTimeline,
  },
  social: {
    caseId: 'social',
    title: 'Social Coach',
    spectrum: 'learning-heavy',
    todayGoal: '1 tiny warm-up and 1 real message.',
    externalSkills: ['mcp.instagram.send', 'mcp.twilio.send', 'mcp.google_workspace.send'],
    onboardingFields: [
      {
        id: 'social_goal',
        label: 'Social goal',
        required: true,
        type: 'text',
        example: 'Reconnect with 3 friends in 2 weeks',
      },
      {
        id: 'channels',
        label: 'Main channels',
        required: false,
        type: 'text',
        example: 'Instagram, SMS, Email',
      },
      {
        id: 'contact_list',
        label: 'Upload simple contact list (optional)',
        required: false,
        type: 'file',
        example: 'CSV with 5–10 names',
      },
    ],
    timeline: socialTimeline,
  },
}

export const CASE_ORDER: string[] = ['career']

