import { useEffect, useMemo, useState, type ReactElement } from 'react'
import './index.css'
import type {
  CaseConfig,
  CardState,
  InteractionSpec,
  Mode,
  Spectrum,
  TimeSlot,
  ToolLogStep,
  ToolMeta,
} from './types'
import { CASE_ORDER, TIME_SLOTS, casesById, toolsRegistry } from './demoData'

type View = 'case' | 'tools'
type DrawerTab = 'interaction' | 'tools'

interface SelectedCardRef {
  caseId: string
  time: TimeSlot
}

const SPECTRUM_LABEL: Record<Spectrum, string> = {
  'doing-heavy': '偏做',
  middle: '教与做平衡',
  'learning-heavy': '偏学',
}

const MODE_BADGE_CLASSES: Record<Mode, string> = {
  教: 'bg-teal-100 text-teal-800',
  做: 'bg-amber-100 text-amber-800',
  教做一体: 'bg-purple-100 text-purple-800',
}

const STATUS_PILL_CLASSES: Record<CardState['card']['statusPill'], string> = {
  Today: 'bg-blue-100 text-blue-700',
  Scheduled: 'bg-gray-100 text-gray-700',
  Waiting: 'bg-amber-100 text-amber-800',
  Done: 'bg-emerald-100 text-emerald-800',
}

const LAYER_LABEL: Record<ToolMeta['layer'], string> = {
  base: 'Base',
  builtin: 'Builtin',
  external: 'External MCP',
}

function App() {
  const [view, setView] = useState<View>('case')
  const [casesState, setCasesState] = useState<Record<string, CaseConfig>>(casesById)
  const [selectedCaseId, setSelectedCaseId] = useState<string>('career')
  const [selectedTime, setSelectedTime] = useState<TimeSlot>('07:30')
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('interaction')
  const [playing, setPlaying] = useState(false)
  const [tooltipToolId, setTooltipToolId] = useState<string | null>(null)
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [activeOverlay, setActiveOverlay] = useState<SelectedCardRef | null>(null)

  const selectedCase = casesState[selectedCaseId]
  const selectedCard: CardState | null = selectedCase?.timeline[selectedTime] ?? null

  const handleSelectCase = (caseId: string) => {
    setView('case')
    setSelectedCaseId(caseId)
    setSelectedTime('07:30')
    setDrawerOpen(true)
    setDrawerTab('interaction')
  }

  const handleSelectCard = (ref: SelectedCardRef, focusInteraction = false) => {
    setView('case')
    setSelectedCaseId(ref.caseId)
    setSelectedTime(ref.time)
    setDrawerOpen(true)
    setDrawerTab(focusInteraction ? 'interaction' : 'interaction')
  }

  const handleSimulateCompletion = () => {
    if (!selectedCard) return
    setCasesState((prev) => {
      const next: Record<string, CaseConfig> = { ...prev }
      const caseCfg = next[selectedCaseId]
      if (!caseCfg) return prev
      const updatedTimeline: CaseConfig['timeline'] = { ...caseCfg.timeline }
      const slot = updatedTimeline[selectedTime]
      if (!slot) return prev
      updatedTimeline[selectedTime] = {
        ...slot,
        card: {
          ...slot.card,
          statusPill: 'Done',
        },
      }
      next[selectedCaseId] = { ...caseCfg, timeline: updatedTimeline }
      return next
    })
  }

  const isOverlayActive = (ref: SelectedCardRef) =>
    activeOverlay?.caseId === ref.caseId && activeOverlay?.time === ref.time

  const toggleOverlayFor = (ref: SelectedCardRef, slotHasOverlay: boolean) => {
    if (!slotHasOverlay) return
    setActiveOverlay((prev) =>
      prev && prev.caseId === ref.caseId && prev.time === ref.time ? null : ref,
    )
    setDrawerOpen(true)
    setDrawerTab('interaction')
  }

  const handlePlayTimeline = () => {
    if (playing) return
    setPlaying(true)
    const times = [...TIME_SLOTS]
    times.forEach((time, index) => {
      window.setTimeout(() => {
        setSelectedTime(time)
        if (index === times.length - 1) {
          setPlaying(false)
        }
      }, index * 900)
    })
  }

  const toolList = useMemo(() => Object.values(toolsRegistry), [])

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return toolList
    return toolList.filter((t) => {
      const haystack =
        `${t.id} ${t.what} ${t.why}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [searchQuery, toolList])

  const groupedTools = useMemo(() => {
    const groups: Record<'base' | 'builtin' | 'external', ToolMeta[]> = {
      base: [],
      builtin: [],
      external: [],
    }
    for (const t of filteredTools) {
      groups[t.layer].push(t)
    }
    return groups
  }, [filteredTools])

  const openToolInRegistry = (toolId: string) => {
    setSelectedToolId(toolId)
    setView('tools')
  }

  useEffect(() => {
    if (!selectedToolId && toolList.length) {
      setSelectedToolId(toolList[0].id)
    }
  }, [toolList, selectedToolId])

  const handleClickToolId = (toolId: string) => {
    setTooltipToolId((prev) => (prev === toolId ? null : toolId))
  }

  const renderStatusPill = (status: CardState['card']['statusPill']) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_PILL_CLASSES[status]}`}
    >
      {status}
    </span>
  )

  const renderModeBadge = (mode: Mode) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${MODE_BADGE_CLASSES[mode]}`}
    >
      {mode}
    </span>
  )

  const renderInteraction = (card: CardState, interaction: InteractionSpec) => {
    // 职业教练 · 09:00 · 岗位卡片
    if (card.card.coachName === 'Career Coach' && card.time === '09:00') {
      const roles = [
        {
          id: 'roleA',
          title: '高级产品经理',
          company: 'Acme 系统',
          match: '82% 匹配',
          salary: '￥年包 60–80 万（示例）',
          distance: '远程 · 团队在旧金山',
          brand: '头部科技公司',
          link: '#',
        },
        {
          id: 'roleB',
          title: '增长产品负责人',
          company: 'Northwind Labs',
          match: '76% 匹配',
          salary: '￥年包 50–70 万（示例）',
          distance: '混合办公 · 每周 2 天到岗',
          brand: '高速成长公司',
          link: '#',
        },
        {
          id: 'roleC',
          title: '产品总监（Group PM）',
          company: 'Brightline',
          match: '71% 匹配',
          salary: '￥年包 80–100 万（示例）',
          distance: '全职到岗 · 通勤 20 分钟',
          brand: '大众熟知品牌',
          link: '#',
        },
      ]
      return (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-700">{interaction.prompt}</p>
          <div className="grid gap-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex flex-col items-stretch rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-slate-300 hover:shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] font-semibold text-slate-900 line-clamp-1">
                    {role.title}
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {role.match}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-600 line-clamp-1">
                  {role.company}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-slate-600">
                  <span className="rounded-full bg-slate-50 px-2 py-0.5">{role.salary}</span>
                  <span className="rounded-full bg-slate-50 px-2 py-0.5">
                    {role.distance}
                  </span>
                  <span className="rounded-full bg-slate-50 px-2 py-0.5">{role.brand}</span>
                </div>
                <div className="mt-2 text-[11px]">
                  <span className="text-slate-500">在</span>{' '}
                  <span className="font-semibold text-sky-700">LinkedIn</span>{' '}
                  <span className="text-slate-500">查看岗位</span>
                </div>
                <details className="mt-1 text-[11px] text-slate-700">
                  <summary className="cursor-pointer text-sky-700">
                    查看岗位详情（示例）
                  </summary>
                  <div className="mt-1 space-y-1">
                    <p>
                      这里可以展示团队规模、汇报对象、关键指标等核心信息。
                    </p>
                    <p className="text-slate-500">
                      仅为演示：模拟 LinkedIn 岗位详情页面。
                    </p>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // 职业教练 · 12:30 · 简历 A/B
    if (card.card.coachName === 'Career Coach' && card.time === '12:30') {
      return (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-700">{interaction.prompt}</p>
          <div className="grid gap-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-[11px]">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-slate-900">版本 A（当前）</span>
                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  当前简历
                </span>
              </div>
              <p className="text-slate-700">
                负责每周产品例会，维护需求池和 Roadmap，但没有突出结果和影响。
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-[11px]">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-slate-900">版本 B（推荐）</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  推荐修改
                </span>
              </div>
              <p className="text-slate-800">
                主导每周产品评审，与 VP 协同决策，优化 Roadmap，带来 +18% 注册转化率提升，并推动 3 个核心功能上线。
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2 text-[11px]">
              <button
                type="button"
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 hover:border-slate-400"
              >
                Choose Version A
              </button>
              <button
                type="button"
                className="flex-1 rounded-md bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800"
              >
                Choose Version B
              </button>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                补充 1 个数字
              </label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="例如：+18% 点击率、3 次上线、+120 万新增流水…"
              />
            </div>
            <details className="text-[11px] text-slate-700">
              <summary className="cursor-pointer text-sky-700">
                    查看修改原因（示例）
              </summary>
              <div className="mt-1 space-y-1">
                <p>
                      B 比 A 更好：突出个人主导、给出清晰数字，并且一句话说清业务结果。
                </p>
                <p className="text-slate-500">
                      仅为演示：这里可以是带批注的简历对比视图。
                </p>
              </div>
            </details>
          </div>
        </div>
      )
    }

    // 职业教练 · 18:30 · 私信模版
    if (card.card.coachName === 'Career Coach' && card.time === '18:30') {
      return (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-700">{interaction.prompt}</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px]">
            <div className="mb-1 text-[12px] font-semibold text-slate-900">
              潜在公司 · Horizon Analytics
            </div>
            <p className="text-slate-700">
              B2B 数据分析 · C 轮 · 6 人产品团队 · 招聘经理：产品总监。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white hover:bg-slate-800"
            >
              生成 LinkedIn 私信
            </button>
            <button
              type="button"
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 hover:border-slate-400"
            >
              生成邮件草稿
            </button>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
              补充 1 句个人化信息
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              placeholder="例如：“很喜欢你在 X 的分享 / 一直在关注你们 Y 产品的更新…”"
            />
          </div>
          <div className="space-y-1 text-[11px]">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-800"
            >
              确认发送
            </button>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800 hover:border-slate-400"
            >
              只保存草稿
            </button>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            发送时会在你的 LinkedIn / 邮箱里打开草稿（演示环境不会真的发送）。
          </div>
          <details className="mt-2 text-[11px] text-slate-700">
            <summary className="cursor-pointer text-sky-700">
              Preview LinkedIn &amp; Email drafts
            </summary>
            <div className="mt-1 space-y-2">
              <div>
                <div className="text-[11px] font-semibold text-slate-900">
                  LinkedIn 私信（示例）
                </div>
                <p className="mt-0.5 text-slate-700">
                  嗨 {'{Name}'}, 最近看到你分享的 {'{Topic}'}，很有收获。我正在关注 {'{Role}'} 相关机会，很想了解你们团队是怎么思考 {'{Problem}'} 的。
                </p>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-900">
                  邮件草稿（示例）
                </div>
                <p className="mt-0.5 text-slate-700">
                  主题：想简单聊聊 {'{Company}'} 的 {'{Role}'} 职位
                </p>
                <p className="mt-0.5 text-slate-700">
                  嗨 {'{Name}'}, 谢谢你之前分享的 {'{Team}'} 情况。结合我在 {'{Example}'} 上的经验，我觉得可以在 {'{Outcome}'} 方面帮到团队，如果方便的话很期待约个 15 分钟聊一聊。
                </p>
              </div>
            </div>
          </details>
        </div>
      )
    }

    switch (interaction.type) {
      case 'choose':
        return (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-700">{interaction.prompt}</p>
            <div className="flex flex-wrap gap-2">
              {interaction.options?.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-800 hover:border-slate-400"
                >
                  {opt.label}
                  {opt.hint ? (
                    <span className="ml-1 text-[10px] text-slate-500">· {opt.hint}</span>
                  ) : null}
                </button>
              ))}
            </div>
            {interaction.schema ? (
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Extra input
                </label>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder={interaction.schema.placeholder}
                />
              </div>
            ) : null}
            <button
              type="button"
              className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Continue
            </button>
          </div>
        )
      case 'ask_user':
        return (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-700">{interaction.prompt}</p>
            {interaction.schema?.kind === 'text' || interaction.schema?.kind === 'number' ? (
              <input
                type={interaction.schema.kind === 'number' ? 'number' : 'text'}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder={interaction.schema.placeholder}
              />
            ) : interaction.schema?.kind === 'file' ||
              interaction.schema?.kind === 'audio' ||
              interaction.schema?.kind === 'video' ? (
              <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4">
                <p className="text-[11px] font-medium text-slate-700">
                  Upload{' '}
                  {interaction.schema.kind === 'audio'
                    ? 'audio (10s)'
                    : interaction.schema.kind === 'video'
                      ? 'video (10s)'
                      : 'file'}
                </p>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-slate-400"
                >
                  Choose file
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Submit
            </button>
          </div>
        )
      case 'confirm':
        return (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-700">{interaction.prompt}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {interaction.confirmText ?? 'Approve'}
              </button>
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      case 'tap':
        return (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-700">{interaction.prompt}</p>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Tap to start
            </button>
          </div>
        )
      default:
        return null
    }
  }

  const renderToolTooltip = (toolId: string) => {
    const meta = toolsRegistry[toolId]
    if (!meta) return null
    return (
      <div className="mt-2 rounded-md border border-slate-200 bg-white p-3 text-[11px] shadow-card">
        <div className="mb-1 text-[11px] font-semibold text-slate-900">{meta.id}</div>
        <div className="mb-1 text-[11px] text-slate-700">
          <span className="font-semibold">What:</span> {meta.what}
        </div>
        <div className="mb-1 text-[11px] text-slate-700">
          <span className="font-semibold">Why:</span> {meta.why}
        </div>
        <div className="mb-1 text-[11px] text-slate-700">
          <span className="font-semibold">Risk:</span> {meta.risk}{' '}
          {meta.needsConfirm ? '(needs confirm)' : ''}
        </div>
        <button
          type="button"
          onClick={() => openToolInRegistry(toolId)}
          className="mt-1 inline-flex items-center text-[11px] font-semibold text-slate-900 underline-offset-2 hover:underline"
        >
          Open in Tool Registry
        </button>
      </div>
    )
  }

  const layoutMainPaddingRight = drawerOpen ? 'pr-[420px]' : 'pr-0'

  return (
    <div className="min-h-screen app-bg text-slate-50">
      <div className="flex min-h-screen">
        <aside className="flex w-[260px] flex-col border-r border-slate-200 bg-white/95 backdrop-blur">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              产品演示
            </div>
            <div className="mt-1 text-[24px] font-bold text-slate-900 leading-7">
              职业教练日程 Demo
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              场景
            </div>
            <div className="space-y-1">
              {CASE_ORDER.map((id) => {
                const c = casesState[id]
                if (!c) return null
                const active = view === 'case' && selectedCaseId === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectCase(id)}
                    className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium ${
                      active ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`mr-1 h-5 w-0.5 rounded-full ${
                        active ? 'bg-slate-900' : 'bg-transparent'
                      }`}
                    />
                    <span>{c.title}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </aside>

        <main
          className={`flex-1 ${layoutMainPaddingRight} transition-[padding-right] duration-200`}
        >
          <div className="mx-auto flex max-w-[1440px] flex-col px-6 py-6">
            {view === 'case' && selectedCase ? (
              <>
                <CaseHeader
                  caseConfig={selectedCase}
                  onOpenOnboarding={() => setOnboardingOpen(true)}
                  onPlayTimeline={handlePlayTimeline}
                  playing={playing}
                />
                <section className="mt-4 flex h-[680px] flex-col">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      今日节奏 · 6 个时间点
                    </div>
                    <div className="text-[11px] font-medium text-slate-500">
                      07:30 → 09:00 → 12:30 → 18:30 → 20:30 → 21:00
                    </div>
                  </div>
                  <div className="relative flex-1 overflow-x-auto">
                    <div className="flex h-full items-center gap-6">
                      {TIME_SLOTS.map((time) => {
                        const card = selectedCase.timeline[time]
                        const isActive = time === selectedTime
                        const ref = { caseId: selectedCase.caseId, time }
                        const overlayActive = isOverlayActive(ref)
                        return (
                          <PhoneScreen
                            key={time}
                            time={time}
                            card={card}
                            active={isActive}
                            overlayActive={overlayActive}
                            onClick={() => handleSelectCard(ref)}
                            onPrimaryClick={() => handleSelectCard(ref, true)}
                            onToggleOverlay={() =>
                              toggleOverlayFor(ref, Boolean(card.overlay))
                            }
                            renderStatusPill={renderStatusPill}
                          />
                        )
                      })}
                    </div>
                  </div>
                </section>
              </>
            ) : null}

            {view === 'tools' ? (
              <section className="flex h-[776px] gap-4">
                <div className="flex w-[360px] flex-col rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3">
                    <div className="text-[18px] font-bold text-slate-900 leading-6">
                      Tool Registry
                    </div>
                    <p className="mt-1 text-[12px] text-slate-500">
                      Search across base, builtin, and external MCP tools.
                    </p>
                  </div>
                  <input
                    type="text"
                    placeholder="Search tools…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                  <div className="flex-1 space-y-4 overflow-y-auto pt-1">
                    {(Object.keys(groupedTools) as Array<keyof typeof groupedTools>).map(
                      (layer) => {
                        const list = groupedTools[layer]
                        if (!list.length) return null
                        return (
                          <div key={layer}>
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              {LAYER_LABEL[layer]}
                            </div>
                            <div className="space-y-1">
                              {list.map((tool) => {
                                const active = selectedToolId === tool.id
                                return (
                                  <button
                                    key={tool.id}
                                    type="button"
                                    onClick={() => setSelectedToolId(tool.id)}
                                    className={`flex w-full flex-col rounded-md px-3 py-2 text-left ${
                                      active
                                        ? 'bg-slate-100 text-slate-900'
                                        : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="text-[12px] font-semibold text-slate-900">
                                      {tool.id}
                                    </div>
                                    <div className="text-[11px] text-slate-600 line-clamp-1">
                                      {tool.what}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4">
                  {selectedToolId && toolsRegistry[selectedToolId] ? (
                    <ToolDetail meta={toolsRegistry[selectedToolId]} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[12px] text-slate-500">
                      Select a tool from the left to see details.
                    </div>
                  )}
                </div>
              </section>
            ) : null}
          </div>
        </main>

        {drawerOpen && selectedCard ? (
          <Drawer
            caseId={selectedCaseId}
            card={selectedCard}
            overlayActive={
              !!activeOverlay &&
              activeOverlay.caseId === selectedCaseId &&
              activeOverlay.time === selectedTime
            }
            statusPill={renderStatusPill(selectedCard.card.statusPill)}
            tab={drawerTab}
            onTabChange={setDrawerTab}
            onClose={() => setDrawerOpen(false)}
            renderInteraction={renderInteraction}
            renderModeBadge={renderModeBadge}
            onClickToolId={handleClickToolId}
            tooltipToolId={tooltipToolId}
            renderToolTooltip={renderToolTooltip}
            onSimulateCompletion={handleSimulateCompletion}
          />
        ) : null}

        {onboardingOpen && selectedCase ? (
          <OnboardingModal caseConfig={selectedCase} onClose={() => setOnboardingOpen(false)} />
        ) : null}
      </div>
    </div>
  )
}

interface CaseHeaderProps {
  caseConfig: CaseConfig
  onOpenOnboarding: () => void
  onPlayTimeline: () => void
  playing: boolean
}

function CaseHeader({ caseConfig, onOpenOnboarding, onPlayTimeline, playing }: CaseHeaderProps) {
  return (
    <header className="flex h-[96px] items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[24px] font-bold leading-7 text-slate-900">{caseConfig.title}</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {SPECTRUM_LABEL[caseConfig.spectrum]}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-slate-700">{caseConfig.todayGoal}</p>
          <div className="flex items-center gap-2">
            {caseConfig.externalSkills.map((skillId) => (
              <span
                key={skillId}
                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
              >
                {skillId}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-4">
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 hover:border-slate-400"
        >
          填写基础信息
        </button>
        <button
          type="button"
          onClick={onPlayTimeline}
          className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={playing}
        >
          {playing ? '播放中…' : '播放一天节奏'}
        </button>
      </div>
    </header>
  )
}

interface PhoneScreenProps {
  time: TimeSlot
  card: CardState
  active: boolean
  overlayActive: boolean
  onClick: () => void
  onPrimaryClick: () => void
  onToggleOverlay: () => void
  renderStatusPill: (status: CardState['card']['statusPill']) => ReactElement
}

function PhoneScreen({
  time,
  card,
  active,
  overlayActive,
  onClick,
  onPrimaryClick,
  onToggleOverlay,
  renderStatusPill,
}: PhoneScreenProps) {
  const phoneBorder = active
    ? 'border-sky-400/80 bg-slate-900/70 shadow-[0_18px_45px_rgba(15,23,42,0.9)] backdrop-blur-xl'
    : 'border-slate-700/60 bg-slate-900/50 shadow-[0_10px_30px_rgba(15,23,42,0.7)] backdrop-blur-lg'
  const dotBg = active ? 'bg-blue-500' : 'bg-slate-400'

  return (
    <div
      className={`flex h-[620px] w-[300px] cursor-pointer flex-col rounded-phone border-2 transition-all ${phoneBorder}`}
      onClick={onClick}
    >
      <div className="flex h-9 items-center justify-between border-b border-slate-100 px-4">
        <span className="text-[12px] font-semibold text-slate-800">{time}</span>
        <div className="flex items-center gap-2">
          {card.overlay ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleOverlay()
              }}
              className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:border-slate-400"
            >
              {overlayActive ? 'Hide overlay' : 'Show overlay'}
            </button>
          ) : null}
          <span className={`h-2 w-2 rounded-full ${dotBg}`} />
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 py-4">
        <div
          className="flex h-[420px] w-[268px] flex-col rounded-xl border border-white/10 bg-white/5 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.9)]"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          <div className="flex items-center justify-between text-[12px] font-semibold text-slate-800">
            <span>{card.card.coachName}</span>
            {renderStatusPill(card.card.statusPill)}
          </div>
          <div className="mt-3">
            <h2 className="line-clamp-2 text-[18px] font-bold leading-snug text-slate-900">
              {card.card.title}
            </h2>
          </div>
          <div className="mt-2 min-h-[40px]">
            <p className="line-clamp-2 text-[12px] font-medium text-slate-600">
              {card.card.subtitle}
            </p>
          </div>
          <div className="mt-2 min-h-[44px]">
            <div className="flex flex-wrap gap-1.5">
              {card.card.microChips?.slice(0, 3).map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-[14px] font-semibold text-white hover:bg-slate-800"
              onClick={(e) => {
                e.stopPropagation()
                onPrimaryClick()
              }}
            >
              {card.card.primaryCta}
            </button>
          </div>
          <div className="mt-2 text-right">
            {card.card.secondaryCta ? (
              <button
                type="button"
                className="text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {card.card.secondaryCta}
              </button>
            ) : null}
          </div>
        </div>
        {card.overlay && overlayActive ? (
          <div
            className="absolute inset-y-4 inset-x-4 flex items-center justify-center rounded-xl bg-slate-900/5 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-[252px] rounded-xl border border-slate-200 bg-white/95 px-3 py-3 shadow-card">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-slate-900 line-clamp-2">
                  {card.overlay.title}
                </div>
                <button
                  type="button"
                  onClick={onToggleOverlay}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-[11px] text-slate-500 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>
              <p className="mb-2 text-[11px] text-slate-700 line-clamp-3">
                {card.overlay.prompt}
              </p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
                >
                  {card.overlay.primaryActionLabel}
                </button>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-slate-400"
                >
                  {card.overlay.secondaryActionLabel}
                </button>
                {card.overlay.snoozeOptions?.length ? (
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-600 hover:border-slate-400"
                  >
                    Snooze: {card.overlay.snoozeOptions.join(' / ')}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface DrawerProps {
  caseId: string
  card: CardState
  overlayActive: boolean
  statusPill: ReactElement
  tab: DrawerTab
  onTabChange: (tab: DrawerTab) => void
  onClose: () => void
  renderInteraction: (card: CardState, spec: InteractionSpec) => ReactElement | null
  renderModeBadge: (mode: Mode) => ReactElement
  onClickToolId: (toolId: string) => void
  tooltipToolId: string | null
  renderToolTooltip: (toolId: string) => ReactElement | null
  onSimulateCompletion: () => void
}

function Drawer({
  caseId: _caseId,
  card,
  overlayActive,
  statusPill,
  tab,
  onTabChange,
  onClose,
  renderInteraction,
  renderModeBadge,
  onClickToolId,
  tooltipToolId,
  renderToolTooltip,
  onSimulateCompletion,
}: DrawerProps) {
  const interaction: InteractionSpec =
    overlayActive && card.overlay
      ? {
          type: card.overlay.interactionType,
          prompt: card.overlay.prompt,
          options: card.overlay.options,
          schema: card.overlay.schema,
          confirmText:
            card.overlay.interactionType === 'confirm'
              ? card.overlay.primaryActionLabel
              : undefined,
        }
      : card.interaction

  const logs: ToolLogStep[] =
    overlayActive && card.overlayLogs && card.overlayLogs.length
      ? card.overlayLogs
      : card.agentLogs

  return (
    <section className="fixed right-0 top-0 z-20 flex h-full w-[420px] flex-col border-l border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-slate-800">
              {card.card.coachName}
            </span>
            {statusPill}
          </div>
          <div className="mt-1 text-[13px] font-semibold leading-snug text-slate-900 line-clamp-2">
            {card.card.title}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2">{card.card.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[13px] text-slate-500 hover:bg-slate-50"
        >
          ✕
        </button>
      </header>
      <div className="border-b border-slate-200 px-4">
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => onTabChange('interaction')}
            className={`inline-flex flex-1 items-center justify-center border-b-2 px-3 pb-2 text-[12px] font-semibold ${
              tab === 'interaction'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            用户界面
          </button>
          <button
            type="button"
            onClick={() => onTabChange('tools')}
            className={`inline-flex flex-1 items-center justify-center border-b-2 px-3 pb-2 text-[12px] font-semibold ${
              tab === 'tools'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            工具调用
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'interaction' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <div className="font-semibold text-slate-800">卡片信息</div>
              <div className="mt-0.5">
                <span className="font-semibold">{card.card.coachName}</span> ·{' '}
                <span className="font-medium">{card.card.title}</span>
              </div>
              <div className="mt-0.5 line-clamp-2">{card.card.subtitle}</div>
              {overlayActive && card.overlay ? (
                <div className="mt-1 text-[10px] text-slate-500">
                  Overlay: {card.overlay.kind}
                </div>
              ) : null}
            </div>
            <div>{renderInteraction(card, interaction)}</div>
            <div className="pt-4">
              <button
                type="button"
                onClick={onSimulateCompletion}
                className="inline-flex items-center rounded-md border border-dashed border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 hover:border-emerald-400"
              >
                Simulate completion (demo)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((step, index) => (
              <div
                key={`${step.toolId}-${index}`}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px]"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  {renderModeBadge(step.mode)}
                  <button
                    type="button"
                    onClick={() => onClickToolId(step.toolId)}
                    className="text-[11px] font-semibold text-slate-900 underline-offset-2 hover:underline"
                  >
                    {step.toolId}
                  </button>
                </div>
                <div className="text-[11px] text-slate-700">{step.summary}</div>
                {step.payloadExample ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] font-semibold text-slate-600">
                      Payload example
                    </summary>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-[10px] text-slate-700">
                      {JSON.stringify(step.payloadExample, null, 2)}
                    </pre>
                  </details>
                ) : null}
                {tooltipToolId === step.toolId ? renderToolTooltip(step.toolId) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

interface ToolDetailProps {
  meta: ToolMeta
}

function ToolDetail({ meta }: ToolDetailProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3">
        <div className="text-[20px] font-bold leading-6 text-slate-900">{meta.id}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {meta.layer === 'base'
              ? 'Base'
              : meta.layer === 'builtin'
                ? 'Builtin'
                : 'External MCP'}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            Risk: {meta.risk}
          </span>
          {meta.needsConfirm ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              Needs confirm
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              No confirm needed
            </span>
          )}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-4 text-[12px]">
        <div className="space-y-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              What
            </div>
            <p className="mt-0.5 text-slate-800">{meta.what}</p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Why
            </div>
            <p className="mt-0.5 text-slate-800">{meta.why}</p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Examples
            </div>
            <ul className="mt-0.5 list-disc pl-4 text-[11px] text-slate-700">
              {meta.examples.map((ex) => (
                <li key={ex} className="mb-0.5">
                  {ex}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Input example (JSON)
            </div>
            <pre className="mt-0.5 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-[10px] text-slate-700">
              {JSON.stringify(meta.inputExample, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Output example (JSON)
            </div>
            <pre className="mt-0.5 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-[10px] text-slate-700">
              {JSON.stringify(meta.outputExample, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

interface OnboardingModalProps {
  caseConfig: CaseConfig
  onClose: () => void
}

function OnboardingModal({ caseConfig, onClose }: OnboardingModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/20">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[16px] font-bold text-slate-900">
              Onboarding Fields · {caseConfig.title}
            </div>
            <p className="mt-0.5 text-[12px] text-slate-600">
              Demo-only view of the information this coach would need.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-[13px] text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[360px] space-y-2 overflow-y-auto">
          {caseConfig.onboardingFields.map((field) => (
            <div
              key={field.id}
              className="flex items-start justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div>
                <div className="text-[12px] font-semibold text-slate-900">
                  {field.label}{' '}
                  {field.required ? (
                    <span className="text-[11px] font-normal text-rose-500">*</span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-600">
                  Type: {field.type}
                  {field.example ? ` · e.g. ${field.example}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App

