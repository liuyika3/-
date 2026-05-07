export type PortfolioCategory = 'tools' | 'product' | 'jovida' | 'science' | 'workflow'

/** 作品集内嵌文件所在根：dmoes 仓库根 或 旁路的 pre 构建产物 */
export type EmbedRoot = 'dmoes' | 'pre'

export interface TutorialStep {
  title: string
  detail: string
}

export interface PortfolioItem {
  id: string
  title: string
  /** 相对 embed 根的路径，统一使用正斜杠 */
  path: string
  embedRoot?: EmbedRoot
  category: PortfolioCategory
  description: string
  hint?: string
  /** 需要本机 Node 服务（如 Gmail 工具） */
  needsServer?: boolean
  serverNote?: string
  /** Gemini 客户端依赖的 Vertex/自建后端（默认 :5000） */
  needsGeminiBackend?: boolean
  geminiBackendNote?: string
  /** 每个 Demo 的新手引导（含 tryout 指引） */
  steps: TutorialStep[]
}

export const CATEGORY_LABEL: Record<PortfolioCategory, string> = {
  tools: '工具 · 自动化',
  product: '产品 · Feature',
  jovida: '减脂教练业务展示',
  science: '科普物料',
  workflow: '科普单页 · HTML',
}

const STEPS_GEMINI: TutorialStep[] = [
  { title: '打开', detail: '左侧选「Gemini Web 客户端」，等待预览加载。' },
  { title: '设置', detail: '在预览内按需填写密钥；勿把密钥截进对外分享图。' },
  { title: '使用', detail: '选任务类型，按界面提示操作。' },
]

const STEPS_MAIL: TutorialStep[] = [
  { title: '打开', detail: '左侧选「Gmail 群发工具」。' },
  { title: '登录', detail: '按页内 OAuth 完成授权。' },
  { title: '发信', detail: '先预览再试发；定时在同一页配置。' },
]

const STEPS_WAISHE: TutorialStep[] = [
  { title: '打开', detail: '左侧选「外食 Demo（减脂餐厅）」。' },
  { title: '浏览', detail: '在预览里走搜索、推荐与详情动线。' },
  { title: '全屏', detail: '需要时用「新标签打开」。' },
]

const STEPS_WANWU_API: TutorialStep[] = [
  { title: '打开', detail: '左侧选「万物教练 API Demos」。' },
  { title: '浏览', detail: '在预览里逐个点子页。' },
  { title: '全屏', detail: '投屏用「新标签打开」。' },
]

const STEPS_ONBOARDING: TutorialStep[] = [
  { title: '打开', detail: '左侧选「Onboarding 可视化」。' },
  { title: '浏览', detail: '在预览里横滑各屏。' },
  { title: '全屏', detail: '需要时用「新标签打开」。' },
]

const STEPS_PRE: TutorialStep[] = [
  { title: '打开', detail: '左侧选「Jovida Methodology（pre）」；空白可刷新或检查 JOVIDA_PRE_ROOT。' },
  { title: '浏览', detail: '从上到下滚完页面。' },
  { title: '全屏', detail: '投屏用「新标签打开」。' },
]

const STEPS_SCIENCE_WEIGHT: TutorialStep[] = [
  { title: '打开', detail: '左侧选「减重知识分享」。' },
  { title: '浏览', detail: '在预览里滑动页面，有轮播则切换查看。' },
  { title: '全屏', detail: '需要时用「新标签打开」。' },
]

const STEPS_WORKFLOW: TutorialStep[] = [
  { title: '打开', detail: '左侧「科普单页 · HTML」任选一篇。' },
  { title: '浏览', detail: '在预览里完整看完。' },
  { title: '全屏', detail: '需要时用「新标签打开」。' },
]

const STEPS_JOVIDA_SHOWCASE: TutorialStep[] = [
  { title: '打开', detail: '左侧选「减脂教练业务展示」。' },
  { title: '浏览', detail: '总览中依次点 S / P / A / R / E 进入子页；外食页为两列长图与下方横图。' },
  { title: '返回', detail: '子页内点「返回 SPARE 总览」回到主页。' },
]

export const ITEMS: PortfolioItem[] = [
  {
    id: 'gemini',
    title: 'Gemini Web 客户端',
    path: 'gemini_web_client/index.html',
    category: 'tools',
    description: 'Gemini Web 客户端：多模态对话与任务流，预览内需自行配置密钥。',
    hint: '密钥只在页内填，勿对外截图',
    steps: STEPS_GEMINI,
  },
  {
    id: 'mail',
    title: 'Gmail 群发工具',
    path: 'mail-tool-gmail/index.html',
    category: 'tools',
    description: 'Gmail 群发：OAuth、预览、定时与任务队列。',
    steps: STEPS_MAIL,
  },
  {
    id: 'waishe',
    title: '外食 Demo（减脂餐厅）',
    path: '外食demo/fat-loss-excel/public/index.html',
    category: 'product',
    description: '外食餐厅与菜品推荐界面 Demo。',
    steps: STEPS_WAISHE,
  },
  {
    id: 'wanwu-api',
    title: '万物教练 API Demos',
    path: '万物教练api demos/index.html',
    category: 'product',
    description: '万物教练静态视觉原型索引（手机画幅 HTML）。',
    steps: STEPS_WANWU_API,
  },
  {
    id: 'onboarding',
    title: 'Onboarding 可视化',
    path: 'onboarding可视化demo/index.html',
    category: 'product',
    description: '首登引导横滑 Demo。',
    steps: STEPS_ONBOARDING,
  },
  {
    id: 'pre',
    title: 'Jovida Methodology（pre）',
    path: 'dist/index.html',
    embedRoot: 'pre',
    category: 'science',
    description: 'Jovida Methodology 方法论长页（独立仓库构建产物）。',
    hint: '源码：Desktop\\Jovida网页类项目\\pre',
    steps: STEPS_PRE,
  },
  {
    id: 'wf-weight',
    title: '减重知识分享',
    path: 'workflow-demos/popular-science-posts/减重知识分享.html',
    category: 'science',
    description: '减重知识宣讲长页。',
    steps: STEPS_SCIENCE_WEIGHT,
  },
  {
    id: 'jovida-showcase',
    title: '减脂教练业务展示',
    path: '减脂教练业务展示/index.html',
    category: 'jovida',
    description: 'SPARE 五维可点总览，链到各模块界面与录屏占位。',
    steps: STEPS_JOVIDA_SHOWCASE,
  },
  {
    id: 'wf-instagram',
    title: 'Instagram 风格知识卡片',
    path: 'workflow-demos/popular-science-posts/Instagram Style Knowledge Card.html',
    category: 'workflow',
    description: 'Instagram 风格知识卡片单页 HTML。',
    steps: STEPS_WORKFLOW,
  },
  {
    id: 'wf-fat-facts',
    title: 'Fat Facts Challenge',
    path: 'workflow-demos/popular-science-posts/Fat Facts Challenge.html',
    category: 'workflow',
    description: 'Fat Facts Challenge 主题单页。',
    steps: STEPS_WORKFLOW,
  },
  {
    id: 'wf-longevity',
    title: 'Longevity Pantry Guide',
    path: 'workflow-demos/popular-science-posts/Longevity Pantry Guide.html',
    category: 'workflow',
    description: 'Longevity Pantry Guide 储藏与食材主题页。',
    steps: STEPS_WORKFLOW,
  },
  {
    id: 'wf-hydration',
    title: 'Hydration Challenge',
    path: 'workflow-demos/popular-science-posts/Hydration Challenge.html',
    category: 'workflow',
    description: 'Hydration Challenge 补水主题单页。',
    steps: STEPS_WORKFLOW,
  },
  {
    id: 'wf-ibs',
    title: 'IBS-Friendly Swaps',
    path: 'workflow-demos/popular-science-posts/IBS-Friendly Swaps.html',
    category: 'workflow',
    description: 'IBS-Friendly Swaps 替换建议单页。',
    steps: STEPS_WORKFLOW,
  },
  {
    id: 'wf-desk',
    title: 'Desk Job Survival Guide',
    path: 'workflow-demos/popular-science-posts/Desk Job Survival Guide.html',
    category: 'workflow',
    description: 'Desk Job Survival Guide 久坐场景指南单页。',
    steps: STEPS_WORKFLOW,
  },
  {
    id: 'wf-sleep-snacks',
    title: 'Sleep Boosting Snacks',
    path: 'workflow-demos/popular-science-posts/Sleep Boosting Snacks.html',
    category: 'workflow',
    description: 'Sleep Boosting Snacks 助眠零食主题单页。',
    steps: STEPS_WORKFLOW,
  },
  {
    id: 'wf-weekly-prep',
    title: 'Weekly Prep Staples',
    path: 'workflow-demos/popular-science-posts/Weekly Prep Staples.html',
    category: 'workflow',
    description: 'Weekly Prep Staples 备餐主题单页。',
    steps: STEPS_WORKFLOW,
  },
]

export function embedUrl(item: Pick<PortfolioItem, 'path' | 'embedRoot'>) {
  const encoded = item.path.split('/').map((s) => encodeURIComponent(s)).join('/')
  if (item.embedRoot === 'pre') return `/__embed-pre/${encoded}`
  return `/__embed/${encoded}`
}
