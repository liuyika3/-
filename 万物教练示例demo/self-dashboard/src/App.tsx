import { useEffect, useMemo, useState } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts'
import './index.css'

type FieldKey = 'W' | 'A' | 'R' | 'P' | 'T' | 'E' | 'K'

interface FieldScores {
  W: number
  A: number
  R: number
  P: number
  T: number
  E: number
  K: number
}

interface DerivedScores {
  S: number
  GapNeed: number
  Gpos: number
  Gneg: number
  Pot: number
  Cap: number
}

interface QuestionOption {
  label: string
  text: string
  score: number
}

interface Question {
  id: string
  field: FieldKey
  prompt: string
  options: QuestionOption[]
}

interface DimensionConfig {
  id: string
  domainId: 'O' | 'I' | 'L'
  name: string
  definition: string
  scores: FieldScores
  derived: DerivedScores
  questionBank: Question[]
}

interface DomainConfig {
  id: 'O' | 'I' | 'L'
  name: string
  description: string
  color: string
  dimensions: DimensionConfig[]
}

interface AppState {
  domains: DomainConfig[]
}

type Page =
  | { type: 'home' }
  | { type: 'domain'; domainId: 'O' | 'I' | 'L' }
  | { type: 'dimension'; domainId: 'O' | 'I' | 'L'; dimId: string }
  | { type: 'wizard'; domainId: 'O' | 'I' | 'L'; dimId: string }

interface WizardAnswer {
  questionId: string
  field: FieldKey
  score: number
}

const STORAGE_KEY = 'self定位仪表盘_state_v1'

const defaultFieldScores: FieldScores = {
  W: 6,
  A: 5,
  R: 5,
  P: 5,
  T: 2,
  E: 3,
  K: 3,
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function computeDerived(scores: FieldScores): DerivedScores {
  const { W, A, R, P, T, E, K } = scores
  const S = Math.round(0.65 * A + 0.35 * R)

  const GapNeed = 0.55 * W + 0.35 * P + 0.1 * (T * 2) - S
  const Gpos = Math.max(0, GapNeed)
  const Gneg = Math.max(0, -GapNeed)

  const headroom = 10 - A
  const E_adjust = E <= 1 ? 0.6 : E <= 3 ? 0.8 : 1.0
  const Pot = Math.round(headroom * (K / 5) * E_adjust)
  const Cap = clamp(S + Pot, 0, 10)

  return {
    S,
    GapNeed: Math.round(GapNeed * 10) / 10,
    Gpos: Math.round(Gpos * 10) / 10,
    Gneg: Math.round(Gneg * 10) / 10,
    Pot,
    Cap,
  }
}

function median(nums: number[]) {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function buildDefaultState(): AppState {
  const mkDim = (
    id: string,
    name: string,
    definition: string,
    overrides?: Partial<FieldScores>,
    questionBank: Question[] = [],
  ): DimensionConfig => {
    const scores: FieldScores = { ...defaultFieldScores, ...overrides }
    return {
      id,
      domainId: 'O',
      name,
      definition,
      scores,
      derived: computeDerived(scores),
      questionBank,
    }
  }

  const qO1: Question[] = [
    {
      id: 'O1_W_1',
      field: 'W',
      prompt: '关于“财力”，哪句话更像你想要到达的状态？',
      options: [
        { label: 'A', text: '只要基本生活稳定即可', score: 4 },
        { label: 'B', text: '希望中产稳定，不太受单一风险影响', score: 6 },
        { label: 'C', text: '希望资产能供血自己的理想生活很多年', score: 8 },
        { label: 'D', text: '希望远超大多数人，几乎不被金钱限制', score: 9.5 },
      ],
    },
    {
      id: 'O1_A_1',
      field: 'A',
      prompt: '如果清零重来，你有多大把握在 5–10 年内重新搭起财力？',
      options: [
        { label: 'A', text: '完全没谱', score: 1 },
        { label: 'B', text: '大概有一些路径，但不确定', score: 4 },
        { label: 'C', text: '有清晰的可复制路径', score: 7 },
        { label: 'D', text: '高度确定，甚至可以更快重建', score: 9 },
      ],
    },
    {
      id: 'O1_R_1',
      field: 'R',
      prompt: '若未来一年没有收入，仅凭现有缓冲，你能稳定撑多久？',
      options: [
        { label: 'A', text: '不到 3 个月', score: 2 },
        { label: 'B', text: '3–6 个月', score: 4 },
        { label: 'C', text: '6–12 个月', score: 6.5 },
        { label: 'D', text: '一年以上不慌', score: 8.5 },
      ],
    },
    {
      id: 'O1_P_1',
      field: 'P',
      prompt: '提到“财力差距”，你心里的刺痛感大概是？',
      options: [
        { label: 'A', text: '几乎没有感觉', score: 1 },
        { label: 'B', text: '偶尔会想起，有点不舒服', score: 4 },
        { label: 'C', text: '经常会在心里敲打自己', score: 7 },
        { label: 'D', text: '强烈，已经影响到日常决策', score: 9 },
      ],
    },
  ]

  const defaultO1Scores: FieldScores = {
    W: 8.5,
    A: 5.5,
    R: 5.2,
    P: 8.5,
    T: 3.5,
    E: 4,
    K: 4,
  }

  const domains: DomainConfig[] = [
    {
      id: 'O',
      name: '外求 · Outer',
      description: '财富 / 权力 / 名望 / 资源 / 事业版图等向外生长的部分。',
      color: '#22c55e',
      dimensions: [
        mkDim('O1', '财力', '财富规模与供血能力。', defaultO1Scores, qO1),
        mkDim('O2', '安全确定', '抗波动能力与退路空间。'),
        mkDim('O3', '超越别人', '相对位置与竞争驱动。'),
        mkDim('O4', '权力控制', '规则制定与资源分配的话语权。'),
        mkDim('O5', '名望认可', '外部尊重与背书程度。'),
        mkDim('O6', '可调用资源', '你遇事时能调动的入口与节点。'),
        mkDim('O7', '事业版图', '从个人产出到系统产出的放大程度。'),
      ],
    },
    {
      id: 'I',
      name: '内求 · Inner',
      description: '健康 / 自由 / 成长 / 稳定 / 审美体验等向内沉淀。',
      color: '#38bdf8',
      dimensions: [],
    },
    {
      id: 'L',
      name: '链接 · Links',
      description: '亲密关系 / 可调用人脉 / 影响力 / 社群归属等人与人的连接。',
      color: '#eab308',
      dimensions: [],
    },
  ]

  return { domains }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildDefaultState()
    const parsed = JSON.parse(raw) as AppState
    // 保险起见，重新算一遍 derived
    parsed.domains.forEach((d) =>
      d.dimensions.forEach((dim) => {
        dim.derived = computeDerived(dim.scores)
      }),
    )
    return parsed
  } catch {
    return buildDefaultState()
  }
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function exportState(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'self-dashboard-state.json'
  a.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [page, setPage] = useState<Page>({ type: 'home' })
  const [wizardAnswers, setWizardAnswers] = useState<WizardAnswer[]>([])
  const [wizardStepIndex, setWizardStepIndex] = useState(0)

  useEffect(() => {
    saveState(state)
  }, [state])

  const currentDomain = useMemo(() => {
    if (page.type === 'home') return state.domains[0]
    return state.domains.find((d) => d.id === page.domainId) ?? state.domains[0]
  }, [page, state.domains])

  const currentDimension: DimensionConfig | undefined = useMemo(() => {
    if (page.type === 'dimension' || page.type === 'wizard') {
      const domain = state.domains.find((d) => d.id === page.domainId)
      return domain?.dimensions.find((dim) => dim.id === page.dimId)
    }
    return undefined
  }, [page, state.domains])

  const currentDomainForRadar = state.domains[0]

  const radarData = useMemo(() => {
    const dims = currentDomainForRadar.dimensions
    return dims.map((dim) => ({
      name: dim.name,
      S: dim.derived.S,
      W: dim.scores.W,
      Cap: dim.derived.Cap,
    }))
  }, [currentDomainForRadar])

  const sortedByGap = useMemo(() => {
    const dims = [...currentDomainForRadar.dimensions]
    return dims.sort((a, b) => b.derived.Gpos - a.derived.Gpos).slice(0, 3)
  }, [currentDomainForRadar])

  const sortedByPot = useMemo(() => {
    const dims = [...currentDomainForRadar.dimensions]
    return dims.sort((a, b) => b.derived.Pot - a.derived.Pot).slice(0, 3)
  }, [currentDomainForRadar])

  const onImportJson = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as AppState
        parsed.domains.forEach((d) =>
          d.dimensions.forEach((dim) => {
            dim.derived = computeDerived(dim.scores)
          }),
        )
        setState(parsed)
        setPage({ type: 'home' })
      } catch {
        alert('JSON 解析失败，请检查文件。')
      }
    }
    reader.readAsText(file)
  }

  const goHome = () => setPage({ type: 'home' })

  const openDomain = (domainId: 'O' | 'I' | 'L') => {
    setPage({ type: 'domain', domainId })
  }

  const openDimension = (domainId: 'O' | 'I' | 'L', dimId: string) => {
    setPage({ type: 'dimension', domainId, dimId })
  }

  const openWizard = (domainId: 'O' | 'I' | 'L', dimId: string) => {
    const domain = state.domains.find((d) => d.id === domainId)
    const dim = domain?.dimensions.find((d) => d.id === dimId)
    if (!dim || !dim.questionBank.length) {
      alert('这个维度的问卷还在准备中，可以先用默认值。')
      return
    }
    setWizardAnswers([])
    setWizardStepIndex(0)
    setPage({ type: 'wizard', domainId, dimId })
  }

  const handleWizardSelectOption = (q: Question, opt: QuestionOption) => {
    setWizardAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== q.id)
      return [
        ...filtered,
        { questionId: q.id, field: q.field, score: opt.score },
      ]
    })
  }

  const finishWizard = () => {
    if (page.type !== 'wizard' || !currentDimension) return
    const dim = currentDimension
    const byField: Record<FieldKey, number[]> = {
      W: [],
      A: [],
      R: [],
      P: [],
      T: [],
      E: [],
      K: [],
    }
    wizardAnswers.forEach((a) => {
      byField[a.field].push(a.score)
    })
    const newScores: FieldScores = { ...dim.scores }
    ;(['W', 'A', 'R', 'P', 'T', 'E', 'K'] as FieldKey[]).forEach((key) => {
      if (byField[key].length) {
        newScores[key] = Math.round(median(byField[key]) * 10) / 10
      }
    })

    const newDerived = computeDerived(newScores)

    setState((prev) => {
      const domains = prev.domains.map((d) => {
        if (d.id !== page.domainId) return d
        return {
          ...d,
          dimensions: d.dimensions.map((dd) =>
            dd.id === dim.id
              ? { ...dd, scores: newScores, derived: newDerived }
              : dd,
          ),
        }
      })
      return { ...prev, domains }
    })

    setPage({
      type: 'dimension',
      domainId: page.domainId,
      dimId: dim.id,
    })
  }

  const renderDomainOverview = () => {
    const d = currentDomainForRadar
    return (
      <div className="content">
        <section className="panel panel-main">
          <div className="panel-header">
            <div>
              <div className="section-title">
                外求总览 · <span className="text-lime-300">{d.name}</span>
              </div>
              <div className="muted mt-1">
                这张图帮你看清：现状形状 vs 目标形状 vs 可能上限。
              </div>
            </div>
          </div>
          <div style={{ width: '100%', height: 260, marginTop: 4 }}>
            <ResponsiveContainer>
              <RadarChart
                data={radarData}
                outerRadius="78%"
                margin={{ top: 16, right: 24, bottom: 8, left: 24 }}
              >
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <Radar
                  name="目标 W"
                  dataKey="W"
                  stroke="#f97316"
                  strokeWidth={1.2}
                  fill="none"
                />
                <Radar
                  name="现状 S"
                  dataKey="S"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.45}
                />
                <Radar
                  name="可能上限 Cap"
                  dataKey="Cap"
                  stroke="#a3e635"
                  fill="#a3e635"
                  fillOpacity={0.1}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="dimensions-list">
            {d.dimensions.map((dim) => (
              <button
                key={dim.id}
                className="dimension-row"
                onClick={() => openDimension('O', dim.id)}
              >
                <div>
                  <div className="dimension-name">{dim.name}</div>
                  <div className="dimension-def">{dim.definition}</div>
                </div>
                <div>
                  <div className="progress-bar">
                    {(() => {
                      const sPct = (dim.derived.S / 10) * 100
                      const capPct = (dim.derived.Cap / 10) * 100
                      const potWidth = Math.max(0, capPct - sPct)
                      return (
                        <>
                          <div
                            className="progress-bar-pot"
                            style={{
                              left: `${sPct}%`,
                              width: `${potWidth}%`,
                            }}
                          />
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${sPct}%` }}
                          />
                          <div
                            className="progress-bar-target-line"
                            style={{ left: `${(dim.scores.W / 10) * 100}%` }}
                          />
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className="value-chips">
                  <span className="value-chip-strong">
                    当前 {dim.derived.S.toFixed(1)}
                  </span>
                  <span>可能上限 {dim.derived.Cap.toFixed(1)}</span>
                  <span>目标 {dim.scores.W.toFixed(1)}</span>
                  {dim.derived.Gpos > 0.1 ? (
                    <span className="badge-gap-pos">
                      缺口 +{dim.derived.Gpos.toFixed(1)}
                    </span>
                  ) : dim.derived.Gneg > 0.1 ? (
                    <span className="badge-gap-neg">
                      超出 -{dim.derived.Gneg.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel panel-side">
          <div className="panel-header">
            <div>
              <div className="section-title">缺口 Top 3</div>
              <div className="muted">更“想要”但差距更大的地方。</div>
            </div>
          </div>
          <div className="dimensions-list">
            {sortedByGap.map((dim) => (
              <div
                key={dim.id}
                className="dimension-row"
                style={{
                  gridTemplateColumns: '1.8fr auto',
                  cursor: 'default',
                }}
              >
                <div>
                  <div className="dimension-name">{dim.name}</div>
                  <div className="dimension-def">{dim.definition}</div>
                </div>
                <div className="value-chips">
                  <span className="badge-gap-pos">
                目标缺口 +{dim.derived.Gpos.toFixed(1)}
                  </span>
              <span>目标 {dim.scores.W.toFixed(1)}</span>
              <span>当前 {dim.derived.S.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="panel-header" style={{ marginTop: 12 }}>
            <div>
              <div className="section-title">潜力 Top 3</div>
              <div className="muted">未来一年最容易拉升的维度。</div>
            </div>
          </div>
          <div className="dimensions-list">
            {sortedByPot.map((dim) => (
              <div
                key={dim.id}
                className="dimension-row"
                style={{
                  gridTemplateColumns: '1.8fr auto',
                  cursor: 'default',
                }}
              >
                <div>
                  <div className="dimension-name">{dim.name}</div>
                  <div className="dimension-def">{dim.definition}</div>
                </div>
                <div className="value-chips">
              <span className="badge-gap-pos">可挖空间 {dim.derived.Pot}</span>
              <span>当前 {dim.derived.S.toFixed(1)}</span>
              <span>可能上限 {dim.derived.Cap.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    )
  }

  const renderDimensionDetail = () => {
    if (!currentDimension || page.type !== 'dimension') return null
    const dim = currentDimension
    const d = currentDomain
    return (
      <div className="content">
        <section className="panel panel-main">
          <div className="panel-header">
            <div>
              <div className="section-title">
                {d.name} · <span className="text-lime-300">{dim.name}</span>
              </div>
              <div className="muted mt-1">{dim.definition}</div>
            </div>
            <div className="top-actions">
              <button className="btn-ghost" onClick={() => openDomain(d.id)}>
                返回 {d.name}
              </button>
              <button className="btn-primary" onClick={() => openWizard(d.id, dim.id)}>
                开始评估
              </button>
            </div>
          </div>

          <div className="dimensions-list" style={{ marginTop: 12 }}>
            <div className="dimension-row" style={{ gridTemplateColumns: '1.4fr 2.6fr auto' }}>
              <div>
                <div className="dimension-name">当前得分</div>
                <div className="dimension-def">
                  由【能力强度】和【资源强度】合成当前水平，结合其他字段给出诊断。
                </div>
              </div>
              <div>
                <div className="progress-bar">
                  {(() => {
                    const sPct = (dim.derived.S / 10) * 100
                    const capPct = (dim.derived.Cap / 10) * 100
                    const potWidth = Math.max(0, capPct - sPct)
                    return (
                      <>
                        <div
                          className="progress-bar-pot"
                          style={{
                            left: `${sPct}%`,
                            width: `${potWidth}%`,
                          }}
                        />
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${sPct}%` }}
                        />
                        <div
                          className="progress-bar-target-line"
                          style={{ left: `${(dim.scores.W / 10) * 100}%` }}
                        />
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="value-chips">
                <span className="value-chip-strong">
                  当前 {dim.derived.S.toFixed(1)}
                </span>
                <span>可能上限 {dim.derived.Cap.toFixed(1)}</span>
                <span>目标 {dim.scores.W.toFixed(1)}</span>
                {dim.derived.Gpos > 0.1 ? (
                  <span className="badge-gap-pos">
                    缺口 +{dim.derived.Gpos.toFixed(1)}
                  </span>
                ) : dim.derived.Gneg > 0.1 ? (
                  <span className="badge-gap-neg">
                    超出 -{dim.derived.Gneg.toFixed(1)}
                  </span>
                ) : (
                  <span>刚好贴近目标</span>
                )}
              </div>
            </div>
          </div>

          <div className="dimensions-list" style={{ marginTop: 16 }}>
            <div className="section-title">输入字段（本轮评估）</div>
            <div className="muted">
              这些是你刚才在问卷里给出的答案，会影响“当前水平 / 目标缺口 / 可挖空间”。
            </div>
            <div className="dimensions-list" style={{ marginTop: 10 }}>
              <div className="dimension-row" style={{ gridTemplateColumns: 'auto auto auto' }}>
                <div className="value-chips">
                  <span className="value-chip-strong">
                    目标 {dim.scores.W.toFixed(1)}
                  </span>
                  <span>你希望最终到达的程度</span>
                </div>
                <div className="value-chips">
                  <span className="value-chip-strong">
                    能力 {dim.scores.A.toFixed(1)}
                  </span>
                  <span>清零后仍能靠自己复现的本事</span>
                </div>
                <div className="value-chips">
                  <span className="value-chip-strong">
                    资源 {dim.scores.R.toFixed(1)}
                  </span>
                  <span>现在就能拿出来用的筹码/位置</span>
                </div>
              </div>
              <div className="dimension-row" style={{ gridTemplateColumns: 'auto auto auto' }}>
                <div className="value-chips">
                  <span className="value-chip-strong">
                    痛感 {dim.scores.P.toFixed(1)}
                  </span>
                  <span>想到这块时的刺痛与驱动力</span>
                </div>
                <div className="value-chips">
                  <span className="value-chip-strong">
                    时间 {dim.scores.T.toFixed(1)}
                  </span>
                  <span>窗口期有多赶</span>
                </div>
                <div className="value-chips">
                  <span className="value-chip-strong">
                    证据 {dim.scores.E.toFixed(1)}
                  </span>
                  <span>这些分数有多少硬证据撑着</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dimensions-list" style={{ marginTop: 14 }}>
            <div className="section-title">一句话诊断（模板）</div>
            <div className="muted">
              根据缺口和潜力，帮你快速归类这个维度当前的优先级。
            </div>
            <div className="dimension-row" style={{ gridTemplateColumns: '1fr' }}>
              <div className="dimension-def">
                {dim.derived.Gpos > 2
                  ? '缺口明显，且你对这一块的欲望/刺痛感都不低，适合放在近期重点。'
                  : dim.derived.Pot > 3
                    ? '潜力空间不错，只要加一点持续动作，就能在一年内看到明显变化。'
                    : '目前在一个比较稳的区间，可以先维持节奏，把精力放在缺口更大的维度。'}
              </div>
            </div>
          </div>
        </section>

        <aside className="panel panel-side">
          <div className="panel-header">
            <div>
              <div className="section-title">下一步建议（占位模版）</div>
              <div className="muted">
                正式版可以按字段自动生成，这里先用固定文案示意。
              </div>
            </div>
          </div>
          <div className="dimensions-list">
            <div className="dimension-row" style={{ gridTemplateColumns: '1fr' }}>
              <div className="dimension-name">若 A 偏低</div>
              <div className="dimension-def">
                优先做能力相关的拆解和练习，例如找可复制的路径、拆成具体技能。
              </div>
            </div>
            <div className="dimension-row" style={{ gridTemplateColumns: '1fr' }}>
              <div className="dimension-name">若 R 偏低</div>
              <div className="dimension-def">
                优先搭建缓冲与通道，例如增加现金缓冲、补齐关键入口或信用记录。
              </div>
            </div>
            <div className="dimension-row" style={{ gridTemplateColumns: '1fr' }}>
              <div className="dimension-name">若 P 很高</div>
              <div className="dimension-def">
                说明你对这块很在意，也容易被情绪裹挟，建议同时设计“节奏与止损机制”。
              </div>
            </div>
          </div>
        </aside>
      </div>
    )
  }

  const renderWizard = () => {
    if (page.type !== 'wizard' || !currentDimension) return null
    const dim = currentDimension
    const questions = dim.questionBank
    const step = questions[wizardStepIndex]
    if (!step) return null

    const selected = wizardAnswers.find((a) => a.questionId === step.id)?.score

    const totalSteps = questions.length

    return (
      <div className="wizard-backdrop">
        <div className="wizard-card">
          <div className="panel-header" style={{ marginBottom: 6 }}>
            <div>
              <div className="section-title">
                评估 · <span className="text-lime-300">{dim.name}</span>
              </div>
              <div className="muted">
                第 {wizardStepIndex + 1} / {totalSteps} 题 · 评估项{' '}
                <span className="tag-pill">
                  {step.field === 'W'
                    ? '目标水平'
                    : step.field === 'A'
                      ? '能力强度'
                      : step.field === 'R'
                        ? '资源强度'
                        : step.field === 'P'
                          ? '痛感 / 驱动力'
                          : step.field === 'T'
                            ? '时间紧迫度'
                            : step.field === 'E'
                              ? '证据可靠度'
                              : '可改变速度'}
                </span>
              </div>
            </div>
            <button className="btn-ghost" onClick={goHome}>
              结束本轮
            </button>
          </div>

          <div className="wizard-steps" style={{ marginBottom: 8 }}>
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={
                  'wizard-step-dot' +
                  (idx <= wizardStepIndex ? ' wizard-step-dot--active' : '')
                }
              />
            ))}
          </div>

          <div style={{ marginTop: 8 }}>
            <div className="dimension-name" style={{ marginBottom: 4 }}>
              {step.prompt}
            </div>
            <div className="option-grid">
              {step.options.map((opt) => (
                <button
                  key={opt.label}
                  className={
                    'option-btn' +
                    (selected === opt.score ? ' option-btn--selected' : '')
                  }
                  onClick={() => handleWizardSelectOption(step, opt)}
                >
                  <span>{opt.label}</span>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-header" style={{ marginTop: 14 }}>
            <div className="muted">
              选择最像你当前情况的一档即可，不需要精确到小数点。
            </div>
            <div className="top-actions">
              <button
                className="btn-ghost"
                disabled={wizardStepIndex === 0}
                onClick={() =>
                  setWizardStepIndex((prev) => Math.max(prev - 1, 0))
                }
              >
                上一题
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!selected && selected !== 0) {
                    alert('先选一个选项再继续。')
                    return
                  }
                  if (wizardStepIndex === totalSteps - 1) {
                    finishWizard()
                  } else {
                    setWizardStepIndex((prev) => prev + 1)
                  }
                }}
              >
                {wizardStepIndex === totalSteps - 1 ? '完成并保存' : '下一题'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderReportModal = () => {
    if (page.type !== 'dimension' && page.type !== 'home' && page.type !== 'domain') {
      // 报告只和 A11 相关，简单处理：由 openReport 时控制，已在 handleRightButton 中
    }
    return null
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-pill">SELF POSITIONING</div>
          <div className="sidebar-title">自我定位仪表盘</div>
          <div className="muted" style={{ marginTop: 4 }}>
            Domains × Dimensions · 先从外求 O 域开始。
          </div>
        </div>
        <div style={{ padding: '8px 10px 12px', overflowY: 'auto', height: 'calc(100vh - 80px)' }}>
          <div className="sidebar-section-title">Domains</div>
          {state.domains.map((d) => (
            <button
              key={d.id}
              className={
                'sidebar-item' +
                ((page.type === 'domain' && page.domainId === d.id) ||
                (page.type === 'dimension' && page.domainId === d.id) ||
                (page.type === 'wizard' && page.domainId === d.id) ||
                (page.type === 'home' && d.id === 'O')
                  ? ' sidebar-item--active'
                  : '')
              }
              onClick={() => openDomain(d.id)}
            >
              <span>{d.name}</span>
              <span>{d.description}</span>
            </button>
          ))}
          <div className="sidebar-section-title">视图</div>
          <button
            className={
              'sidebar-item' + (page.type === 'home' ? ' sidebar-item--active' : '')
            }
            onClick={goHome}
          >
            <span>总览首页</span>
            <span>一眼看到 O 域雷达图与缺口 / 潜力 Top3。</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="main-header">
          <div>
            <div className="main-title">今日自我定位 · Outer 域</div>
            <div className="main-subtitle">
              目标是：先搞清楚你现在在哪、想去哪里、差距 & 可挖空间在哪。
            </div>
          </div>
          <div className="top-actions">
            <label className="btn-ghost" style={{ cursor: 'pointer' }}>
              导入 JSON
              <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={onImportJson}
              />
            </label>
            <button className="btn-ghost" onClick={() => exportState(state)}>
              导出 JSON
            </button>
            <button className="btn-primary" onClick={goHome}>
              回到首页
            </button>
          </div>
        </header>

        {page.type === 'home' || page.type === 'domain'
          ? renderDomainOverview()
          : renderDimensionDetail()}

        {renderWizard()}
        {renderReportModal()}
      </main>
    </div>
  )
}

export default App
