/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Moon, Sun, Salad, ChevronRight, Play, Check, Lock, ShoppingBag, ArrowRight, X, Clock, MapPin, Heart, Image, Plus, Battery, Wifi, Signal, ArrowLeft, Volume2 } from 'lucide-react';


type CoachType = 'BOUNDARY' | 'WINGMAN' | 'ENERGY' | 'SPENDING' | 'RESET' | 'MASTERY' | 'INTERCEPTOR' | 'RESONATOR' | 'COORDINATION' | 'SLEEP' | 'MORNING' | 'HEALTH';
// 重要：这些图片请放在 `public/` 下，这样 Vite 才能稳定加载（不要用电脑绝对路径）。
const ASSET_AVATAR_POSES = '/avatar-poses.png';
const ASSET_JOVIDA_LOGO = '/jovida-logo.png';
const ASSET_AVATAR_HERO = '/avatar-hero.png';

export default function App() {
  const [coach, setCoach] = useState<CoachType>('BOUNDARY');
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [todoDone, setTodoDone] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [spendingPrice, setSpendingPrice] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [simulatedHour, setSimulatedHour] = useState(18); // 18:00 to 24:00
  const [spendingItem, setSpendingItem] = useState('');
  const [spendingPhoto, setSpendingPhoto] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3600); // For Coordination countdown
  const [taskName, setTaskName] = useState('网球发力');
  const [physicalSignal, setPhysicalSignal] = useState('挥拍姿势');

  // New states for onboarding and sidebar
  const [isSideBarOpen, setIsSideBarOpen] = useState(false);
  const [shareInput, setShareInput] = useState('');
  const [shareStage, setShareStage] = useState<'ENTRY' | 'INTENT'>('ENTRY');
  const [shareIntents, setShareIntents] = useState<string[]>([]);
  const [sleepLockActive, setSleepLockActive] = useState(false);
  const [morningSteps, setMorningSteps] = useState([
    { text: '[Step 1] 5:50 自然光闹钟叫醒', time: '5 min', done: true },
    { text: '[Step 2] 冷水洗脸 · 15°C', time: '10 min', done: false },
    { text: '[Step 3] 柠檬温水 300ml', time: '15 min', done: false },
    { text: '[Step 4] 跟 Mia 一起伸展', time: '30 min', done: false },
  ]);

  const timelineByCoach: Record<'SLEEP' | 'MORNING' | 'HEALTH', { at: string; title: string; detail: string }[]> = {
    HEALTH: [
      { at: '00:08', title: '先点蛋白', detail: '鸡/虾/牛任选其一，优先清蒸/煎烤。' },
      { at: '00:21', title: '酱汁分开', detail: '只蘸不拌，热量直接少一大截。' },
      { at: '00:46', title: '主食减半', detail: '米饭/面/土豆减半，换蔬菜。' },
      { at: '01:12', title: '一份高纤维', detail: '沙拉/菌菇/海带，饱腹更稳。' },
      { at: '02:03', title: '点单口令', detail: '我帮你把话术写成一句能照抄的。' },
    ],
    SLEEP: [
      { at: '00:05', title: '降刺激窗口', detail: '睡前 60 分钟：屏幕/强光/强信息都停。' },
      { at: '00:27', title: '呼吸放慢', detail: '4-7-8 或 5 分钟鼻呼吸降低唤醒度。' },
      { at: '00:58', title: '肩颈放松', detail: '两组拉伸，解除紧张导致的入睡延迟。' },
      { at: '01:26', title: '环境三要素', detail: '降温、遮光、白噪音三件套。' },
      { at: '02:10', title: '今晚 3 步', detail: '我把视频压缩成今晚就能做的动作卡。' },
    ],
    MORNING: [
      { at: '00:06', title: '起床触发器', detail: '自然光 + 起身动作，先把身体唤醒。' },
      { at: '00:19', title: '冷刺激', detail: '冷水/冷敷，快速提神但不焦虑。' },
      { at: '00:44', title: '补水模板', detail: '温水 300ml，稳定早晨能量曲线。' },
      { at: '01:20', title: '伸展顺序', detail: '颈→肩→髋，3 分钟完成。' },
      { at: '01:58', title: '同款单品', detail: '我把她用的 3 件东西列出来给你。' },
    ],
  };

  const submitShare = () => {
    const val = shareInput.trim();
    if (!val) return;
    setSharedContent(val);
    setShareStage('ENTRY');
    setShareIntents([]);
    startSharing(coach);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [hasShared, setHasShared] = useState(false);
  const [sharedContent, setSharedContent] = useState<string | null>(null);
  const [morningDuration, setMorningDuration] = useState(60);
  const [showDetail, setShowDetail] = useState<{type: string, data?: any} | null>(null);
  const isLifestyleCoach = coach === 'SLEEP' || coach === 'MORNING' || coach === 'HEALTH';

  const processingSteps = {
    SLEEP: [
      "🔍 正在解析 YouTube 视频链接...",
      "📊 正在同步最近 7 天 Apple Health 睡眠数据...",
      "🧠 结合 Matthew Walker 标准：你的深度睡眠比例偏低 (12%)",
      "🎙️ 正在生成 ASMR 睡前引导语音 (基于视频核心动作)...",
      "✅ 锐评报告已生成，睡眠锁已就绪。"
    ],
    MORNING: [
      "🔍 正在解析 Instagram 视频链接...",
      "🎞️ 识别博主：@mia.routine 的晨间自律流程",
      "⏳ 正在根据你的 " + morningDuration + " 分钟晨间窗口优化流程...",
      "🛒 正在匹配博主同款单品及购买链接...",
      "✅ 复刻方案已就绪，准备推送 Nudge。"
    ],
    HEALTH: [
      "🔍 正在解析 Bilibili 视频链接...",
      "🥗 识别主题：健康餐馆推荐与外食点餐技巧",
      "📍 正在匹配你附近的健康餐厅 (基于 LBS)...",
      "🍱 正在生成「万能外食公式」...",
      "✅ 餐厅推荐与点餐指南已就绪。"
    ]
  };

  const videoData = {
    SLEEP: {
      title: "How to Sleep Better · Matthew Walker",
      thumbnail: "https://picsum.photos/seed/sleep_thumb/400/225"
    },
    MORNING: {
      title: "Mia's Morning Ritual · 5:50 起床",
      thumbnail: "https://picsum.photos/seed/morning_thumb/400/225"
    },
    HEALTH: {
      title: "健康外食指南：打工人如何吃得干净？",
      thumbnail: "https://picsum.photos/seed/health_thumb/400/225"
    }
  };

  React.useEffect(() => {
    if (isProcessing) {
      const timeline = coach === 'SLEEP' || coach === 'MORNING' || coach === 'HEALTH' ? timelineByCoach[coach] : [];
      const maxIdx = Math.max(0, timeline.length - 1);
      const interval = setInterval(() => {
        setProcessingStep(prev => {
          if (prev < maxIdx) return prev + 1;
          clearInterval(interval);
          setTimeout(() => {
            setIsProcessing(false);
            // processing complete -> ask for intent before rendering cards
            setShareStage('INTENT');
          }, 800);
          return prev;
        });
      }, 900);
      return () => clearInterval(interval);
    }
  }, [isProcessing, coach]);

  const startSharing = (type: string) => {
    setIsProcessing(true);
    setProcessingStep(0);
    setHasShared(false);
    setShareStage('ENTRY');
    setShareIntents([]);
    const links = {
      SLEEP: 'https://youtube.com/watch?v=walker_sleep',
      MORNING: 'https://instagram.com/reels/mia_routine',
      HEALTH: 'https://bilibili.com/video/health_eating'
    };
    setSharedContent(links[type as keyof typeof links] || 'https://jovida.ai/shared');
  };

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSpendingPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSpendingPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateHours = () => {
    const price = parseFloat(spendingPrice) || 0;
    const hourlyRate = 100; // Mock hourly rate
    const hours = price / hourlyRate;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}min`;
  };

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleTakePhoto = () => {
    setCapturedPhoto('https://picsum.photos/seed/' + Math.random() + '/300/400');
  };

  const renderPhotoEvidence = (title: string, watermark?: string, btnLabel?: string, showPriceInput?: boolean) => (
    <div className="nudge">
      <div className="nudge-card">
        <div className="nudge-header">
          <div className="nudge-title">📸 {title}</div>
          <div className="nudge-desc">{capturedPhoto ? '存证已上传，自律值 +1' : '点击拍照存证，完成今日目标。'}</div>
        </div>
        {capturedPhoto ? (
          <div className="photo-preview-wrap" style={{ position: 'relative' }}>
            <img src={capturedPhoto} alt="Evidence" className="photo-preview" referrerPolicy="no-referrer" style={{ width: '100%', borderRadius: '12px', display: 'block' }} />
            {watermark && (
              <div className="photo-watermark" style={{
                position: 'absolute',
                bottom: '20px',
                right: '12px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {watermark}
              </div>
            )}
            <button className="btn-record btn-secondary" style={{ marginTop: '12px', width: '100%' }} onClick={() => { setCapturedPhoto(null); setSpendingPrice(''); }}>重新拍照</button>
          </div>
        ) : (
          <div style={{ marginTop: '12px' }}>
            {showPriceInput && (
              <div style={{ marginBottom: '12px' }}>
                <input 
                  type="number" 
                  placeholder="输入商品价格 ($)" 
                  className="price-input"
                  value={spendingPrice}
                  onChange={(e) => setSpendingPrice(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: 'white', marginBottom: '8px' }}
                />
              </div>
            )}
            <button className="btn-record btn-primary" style={{ width: '100%' }} onClick={handleTakePhoto}>
              {btnLabel || '📸 拍照存证'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderBoundary = () => (
    <>
      {/* Block 1: Text Card - Refusal Scripts */}
      <div className="nudge" onClick={() => setActiveOverlay('refuse_scripts')}>
        <div className="nudge-card clickable">
          <div className="nudge-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '32px', background: 'rgba(172,255,78,0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛡️</div>
            <div style={{ flex: 1 }}>
              <div className="nudge-title">拒绝的话帮你写好了</div>
              <div className="nudge-desc">还在纠结怎么说？试试这几个得体又不伤人的回复。</div>
            </div>
          </div>
          <div className="inner-card" style={{ marginTop: '12px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>回复文案预览</div>
            <div className="link-desc" style={{ fontSize: '13px', marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>• “最近手头项目比较紧，实在抽不出时间...”</div>
            <div className="link-desc" style={{ fontSize: '13px', marginBottom: '6px', color: 'rgba(255,255,255,0.8)' }}>• “那天已经有约了，不好意思啊。祝你们...”</div>
          </div>
          <button 
            className="btn-record btn-primary" 
            style={{ width: '100%', marginTop: '12px' }} 
            onClick={(e) => { e.stopPropagation(); triggerToast(); }}
          >
            📋 一键复制回复
          </button>
        </div>
      </div>

      {/* Block 2: Number Card - Energy Saved */}
      <div className="nudge" onClick={() => setActiveOverlay('stress_detail')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">这次能省下多少精力</div>
            <div className="nudge-desc">拒绝掉这个消耗，你就有更多时间陪陪自己。</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px', padding: '0 4px' }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--accent-green)', fontFamily: 'Urbanist, sans-serif' }}>24%</div>
            <div style={{ flex: 1, height: '40px', position: 'relative' }}>
               <svg width="100%" height="40" viewBox="0 0 100 40" preserveAspectRatio="none">
                 <path d="M0 35 Q 25 35, 50 20 T 100 5" fill="none" stroke="url(#grad-red-green)" strokeWidth="4" strokeLinecap="round" />
                 <defs>
                   <linearGradient id="grad-red-green" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" style={{ stopColor: '#FF4E4E', stopOpacity: 1 }} />
                     <stop offset="100%" style={{ stopColor: 'var(--accent-green)', stopOpacity: 1 }} />
                   </linearGradient>
                 </defs>
               </svg>
            </div>
          </div>
          <button className="btn-record btn-secondary" style={{ width: '100%', marginTop: '16px' }}>查看负债详情</button>
        </div>
      </div>

      {/* Block 3: Webpage Card - Parallel Universe */}
      <div className="nudge" onClick={() => setActiveOverlay('parallel_universe')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">看看去和不去的差别</div>
            <div className="nudge-desc">预演一下你留在家里的爽感。</div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, padding: '12px', background: 'rgba(255,78,78,0.08)', borderRadius: '12px', border: '1px solid rgba(255,78,78,0.1)' }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>去派对</div>
              <div style={{ fontSize: '16px', fontWeight: '700' }}>睡眠 5h</div>
            </div>
            <div style={{ flex: 1, padding: '12px', background: 'rgba(172,255,78,0.08)', borderRadius: '12px', border: '1px solid rgba(172,255,78,0.1)' }}>
              <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>留在家</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-green)' }}>睡眠 8h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Block 4: Place Card - Recommended Shelter */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">物理避难所指引</div>
            <div className="nudge-desc">距离你 400 米处有一个绝对安静的“降噪气泡”。</div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--inner-card)', padding: '12px', borderRadius: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>24小时无人书店</div>
              <div style={{ fontSize: '11px', opacity: 0.5 }}>安静、无人、适合独处</div>
            </div>
            <button className="btn-record btn-primary" style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}>立刻导航</button>
          </div>
        </div>
      </div>

      {/* Block 5: Instacart Card - Solo Meal Reward */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">“一人食”主权奖励</div>
            <div className="nudge-desc">省下的社交份子钱，足够犒劳一次顶级居家 SPA。</div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <img src="https://picsum.photos/seed/spa1/150/100" alt="SPA 1" style={{ flex: 1, borderRadius: '8px', height: '80px', objectFit: 'cover' }} referrerPolicy="no-referrer" />
            <img src="https://picsum.photos/seed/spa2/150/100" alt="SPA 2" style={{ flex: 1, borderRadius: '8px', height: '80px', objectFit: 'cover' }} referrerPolicy="no-referrer" />
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }}>一键下单</button>
        </div>
      </div>

      {/* Block 6: Take Photo - Celebrate Freedom */}
      {renderPhotoEvidence('拍张照片，庆祝一下你的自由', 'OWNERSHIP', '锁定这一刻')}
    </>
  );

  const renderWingman = () => (
    <>
      {/* Block 1: Photo Card - Subtext */}
      <div className="nudge" onClick={() => setActiveOverlay('subtext_analysis')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">看穿对方的潜台词</div>
            <div className="nudge-desc">帮你分析对方背后的情绪，不被带节奏。</div>
          </div>
          <div style={{ marginTop: '12px', height: '120px', background: 'linear-gradient(45deg, #6366f1, #a855f7)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', filter: 'blur(20px)', animation: 'pulse 2s infinite' }}></div>
          </div>
          <button className="btn-record btn-secondary" style={{ width: '100%', marginTop: '12px' }}>解析深度逻辑</button>
        </div>
      </div>

      {/* Block 2: Text Card - Confidence Reply */}
      <div className="nudge" onClick={() => setActiveOverlay('reply_suggestions')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">这么回更有底气</div>
            <div className="nudge-desc">拒绝废话，直接给出自然又舒服的回复建议。</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            <div className={`badge ${isLifestyleCoach ? '!bg-black/5 !border-black/10 !text-black' : ''}`} style={{ whiteSpace: 'nowrap' }}>温和一点</div>
            <div className={`badge ${isLifestyleCoach ? '!bg-black/5 !border-black/10 !text-black' : ''}`} style={{ whiteSpace: 'nowrap' }}>专业干练</div>
            <div className={`badge ${isLifestyleCoach ? '!bg-black/5 !border-black/10 !text-black' : ''}`} style={{ whiteSpace: 'nowrap' }}>幽默化解</div>
          </div>
          <button 
            className="btn-record btn-primary" 
            style={{ width: '100%', marginTop: '12px' }} 
            onClick={(e) => { e.stopPropagation(); triggerToast(); }}
          >
            📋 物理复制
          </button>
        </div>
      </div>

      {/* Block 3: Webpage Card - Simulator */}
      <div className="nudge" onClick={() => setActiveOverlay('comm_simulator')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">沟通脚本模拟器</div>
            <div className="nudge-desc">看看这句回复发出去后，接下来的对话走向。</div>
          </div>
          <div className="inner-card" style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', opacity: 0.5 }}>模拟路径 A</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>对方：好的，那我们下次再约... (妥协概率 85%)</div>
          </div>
        </div>
      </div>

      {/* Block 4: Number Card - Charisma Correction */}
      <div className="nudge" onClick={() => setActiveOverlay('charisma_radar')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">魅力值实时修正</div>
            <div className="nudge-desc">由于你这次的物理级理性回复，你的社交权重有所上升。</div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', opacity: 0.6 }}>Charisma Level</span>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>72 → 78</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '78%', height: '100%', background: 'var(--accent-green)', borderRadius: '4px' }}></div>
            </div>
          </div>
          <button className="btn-record btn-secondary" style={{ width: '100%', marginTop: '12px' }}>查看社交雷达图</button>
        </div>
      </div>

      {/* Block 5: Take Photo - Sent Success */}
      {renderPhotoEvidence('发送成功，搞定！', 'SENT', '锁定物理事实')}
    </>
  );

  const renderEnergy = () => (
    <>
      {/* Block 1: Webpage Card - Performance Preview */}
      <div className="nudge" onClick={() => setActiveOverlay('performance_preview')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">看看你明早开挂的状态</div>
            <div className="nudge-desc">现在的决定，决定了你明天是精神抖擞还是无精打采。</div>
          </div>
          <div style={{ marginTop: '12px', height: '60px', background: 'rgba(172,255,78,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '24px' }}>⚡ 深度心流窗口: 4h</span>
          </div>
        </div>
      </div>

      {/* Block 2: Number Card - Battery */}
      <div className="nudge" onClick={() => setActiveOverlay('energy_calc')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">现在的电量百分比</div>
            <div className="nudge-desc">屏幕的光正在偷走你的睡意，该放下手机了。</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
            <div style={{ width: '60px', height: '30px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '6px', position: 'relative', padding: '2px' }}>
              <div style={{ width: '65%', height: '100%', background: '#F59E0B', borderRadius: '2px' }}></div>
              <div style={{ position: 'absolute', right: '-6px', top: '8px', width: '4px', height: '10px', background: 'rgba(255,255,255,0.3)', borderRadius: '0 2px 2px 0' }}></div>
            </div>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#F59E0B' }}>65%</span>
          </div>
          <button className="btn-record btn-secondary" style={{ width: '100%', marginTop: '12px' }}>护眼模式/离线准备</button>
        </div>
      </div>

      {/* Block 3: Photo Card - Highlight Profile */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">明日高光侧写</div>
            <div className="nudge-desc">蓄能满格后的你，在明早会议上的视觉状态。</div>
          </div>
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <img src="https://picsum.photos/seed/glow/200/200" alt="Glow" style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--accent-green)' }} referrerPolicy="no-referrer" />
            <div style={{ marginTop: '8px', fontSize: '13px', opacity: 0.7 }}>“神采奕奕、眼神清亮”</div>
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }}>我想要这种状态</button>
        </div>
      </div>

      {/* Block 4: Todo Card - Offline Checklist */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">3 分钟离线清单</div>
            <div className="nudge-desc">完成以下物理动作，彻底切断数字干扰。</div>
          </div>
          <div className="satiety-checklist" style={{ marginTop: '12px' }}>
            {['手机放至客厅', '喝温水', '拉上窗帘'].map((item, i) => (
              <div key={i} className="satiety-item" style={{ marginBottom: '8px' }}>
                <div className="satiety-circle"><div className="satiety-check">✓</div></div>
                <div className="satiety-label"><span className="satiety-text">{item}</span></div>
              </div>
            ))}
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '8px' }}>确认全部完成</button>
        </div>
      </div>

      {/* Block 5: Visual - Screen Graying */}
      <div className="nudge">
        <div className="nudge-card" style={{ 
          background: `rgba(26,26,26, ${Math.min(1, (simulatedHour - 18) / 6)})`, 
          border: '1px solid #333',
          filter: `grayscale(${(simulatedHour - 18) * 16}%) brightness(${100 - (simulatedHour - 18) * 10}%)`
        }}>
          <div className="nudge-header">
            <div className="nudge-title" style={{ color: '#888' }}>🌑 屏幕变灰预警</div>
            <div className="nudge-desc" style={{ color: '#666' }}>当前模拟时间: {simulatedHour}:00</div>
          </div>
          <div style={{ height: '100px', background: 'linear-gradient(to bottom, #333, #111)', borderRadius: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
            📱
          </div>
          <div style={{ textAlign: 'center', fontSize: '11px', opacity: 0.5, marginTop: '12px' }}>（已移除滑动条）</div>
        </div>
      </div>
    </>
  );

  const renderSpending = () => (
    <>
      {/* Block 0: Input Consumption Info */}
      <div className="nudge">
        <div className="nudge-card" style={{ border: '1px dashed rgba(255,255,255,0.2)' }}>
          <div className="nudge-header">
            <div className="nudge-title">录入消费诱惑</div>
            <div className="nudge-desc">粘贴链接、描述或拍张照，让教练帮你冷静。</div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="想买什么？(如: 新款降噪耳机)" 
              value={spendingItem}
              onChange={(e) => setSpendingItem(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '14px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="number" 
                placeholder="价格 (¥)" 
                value={spendingPrice}
                onChange={(e) => setSpendingPrice(e.target.value)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '14px' }}
              />
              <label className="btn-record btn-secondary" style={{ width: 'auto', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                📸 拍照
                <input type="file" accept="image/*" capture="environment" hidden onChange={handleSpendingPhotoUpload} />
              </label>
            </div>
            {spendingPhoto && (
              <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden' }}>
                <img src={spendingPhoto} alt="Spending" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button 
                  onClick={() => setSpendingPhoto(null)}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
                >✕</button>
              </div>
            )}
            <button className="btn-record btn-primary" style={{ width: '100%' }} onClick={() => {
              if (spendingItem || spendingPrice || spendingPhoto) {
                // Mock submission
                alert('已录入！教练正在分析这笔消费的必要性...');
              }
            }}>开始冷静分析</button>
          </div>
        </div>
      </div>

      {/* Block 1: Number Card - Work Hours */}
      <div className="nudge" onClick={() => setActiveOverlay('spending_calc')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">这笔钱，等于你要多干多少活</div>
            <div className="nudge-desc">{spendingItem ? `买下 ${spendingItem}` : '买下它'}，意味着你这 {spendingPrice ? calculateHours() : '12.5 小时'} 白忙活了。</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px' }}>
            <div style={{ fontSize: '40px' }}>⏰</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-orange)' }}>
              {spendingPrice ? calculateHours() : '12h 30min'}
            </div>
          </div>
          <button className="btn-record btn-secondary" style={{ width: '100%', marginTop: '16px' }}>这不值得</button>
        </div>
      </div>

      {/* Block 2: Webpage Card - Future Savings */}
      <div className="nudge" onClick={() => setActiveOverlay('future_savings')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">省下这笔钱，以后能换什么</div>
            <div className="nudge-desc">冲动是魔鬼，看看长期来看这笔钱能变出什么。</div>
          </div>
          <div style={{ marginTop: '12px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '14px', opacity: 0.7 }}>十年复利 (8%): <span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>$645</span></span>
          </div>
        </div>
      </div>

      {/* Block 3: Instacart Card - Healthy Hedge */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">高价值物理对冲</div>
            <div className="nudge-desc">与其买下吃灰的塑料，不如奖励一周的有机补给。</div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <img src="https://picsum.photos/seed/organic/200/150" alt="Organic" style={{ width: '100%', borderRadius: '8px', height: '100px', objectFit: 'cover' }} referrerPolicy="no-referrer" />
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }}>置换为健康</button>
        </div>
      </div>

      {/* Block 4: Text Card - Survival Quote */}
      <div className="nudge">
        <div className="nudge-card" style={{ background: 'white', color: 'black' }}>
          <div className="nudge-header">
            <div className="nudge-title" style={{ color: 'black' }}>理智生存金句</div>
            <div className="nudge-desc" style={{ color: 'rgba(0,0,0,0.6)' }}>你的身份是由你留下了什么定义的。</div>
          </div>
          <div style={{ marginTop: '20px', fontSize: '18px', fontWeight: '700', textAlign: 'center', fontFamily: 'serif', fontStyle: 'italic' }}>
            “Less is More.”
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '20px', background: 'black', color: 'white' }}>深刻认同</button>
        </div>
      </div>

      {/* Block 5: Take Photo - Victory */}
      {renderPhotoEvidence('忍住不买也是胜利', 'VICTORY', '锁定省下的自由', true)}
    </>
  );

  const renderReset = () => (
    <>
      {/* Block 1: Number Card - Stress Map */}
      <div className="nudge" onClick={() => setActiveOverlay('stress_map')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">压力地理分布图</div>
            <div className="nudge-desc">检测到你的压力主要集中在肩颈。</div>
          </div>
          <div style={{ marginTop: '12px', height: '80px', background: 'rgba(244,63,94,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '14px', color: '#f43f5e', fontWeight: '700' }}>🔥 肩颈压力: High</span>
          </div>
          <button className="btn-record btn-secondary" style={{ width: '100%', marginTop: '12px' }}>查看压力热力图</button>
        </div>
      </div>

      {/* Block 2: Number Card - Heart Rate */}
      <div className="nudge" onClick={() => setActiveOverlay('heart_rate')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">实时心率回落监测</div>
            <div className="nudge-desc">深呼吸，看着数字慢慢降下来。</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px' }}>
            <div style={{ fontSize: '40px', animation: 'pulse 1s infinite' }}>💓</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-green)' }}>72 BPM</div>
          </div>
        </div>
      </div>

      {/* Block 3: Action Card - Breathing Guide */}
      <div className="nudge" onClick={() => setActiveOverlay('breathing_guide')}>
        <div className="nudge-card clickable" style={{ background: 'linear-gradient(135deg, #065f46, #064e3b)' }}>
          <div className="nudge-header">
            <div className="nudge-title">箱式呼吸引导</div>
            <div className="nudge-desc">4-4-4-4 节奏，物理重置你的神经系统。</div>
          </div>
          <div style={{ marginTop: '12px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="breathing-dot"></div>
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px', background: 'white', color: '#064e3b' }}>开始呼吸练习</button>
        </div>
      </div>

      {/* Block 4: Action Card - Recharge Game */}
      <div className="nudge" onClick={() => setActiveOverlay('recharge_game')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">情绪充值小游戏</div>
            <div className="nudge-desc">通过简单的物理交互，排解掉多余的焦虑。</div>
          </div>
          <div style={{ marginTop: '12px', height: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            🎮
          </div>
        </div>
      </div>

      {/* Block 5: Todo Card - Offline Checklist */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">离线清单确认</div>
            <div className="nudge-desc">完成这些，彻底告别这一周的疲惫。</div>
          </div>
          <div className="satiety-checklist" style={{ marginTop: '12px' }}>
            {['关闭所有工作群通知', '准备好明早的衣服', '写下 3 件开心的事'].map((item, i) => (
              <div key={i} className="satiety-item">
                <div className="satiety-circle"><div className="satiety-check">✓</div></div>
                <div className="satiety-label"><span className="satiety-text">{item}</span></div>
              </div>
            ))}
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }}>全部完成，准备重置</button>
        </div>
      </div>
    </>
  );

  const renderMastery = () => (
    <>
      {/* Block 1: link_card */}
      <div className="nudge" onClick={() => setActiveOverlay('mastery_tech')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">【深度解析】{taskName} 核心技术拆解</div>
            <div className="nudge-desc">我为你找到了最专业的{taskName}视频，先看一遍，理清逻辑。</div>
          </div>
          <div style={{ marginTop: '12px', height: '100px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ fontSize: '40px', opacity: 0.5 }}>▶️</div>
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '10px', opacity: 0.5 }}>12:45</div>
          </div>
          <button className="btn-record btn-secondary" style={{ width: '100%', marginTop: '12px' }}>进入深度学习</button>
        </div>
      </div>

      {/* Block 2: photo_card */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【动作纠偏】{physicalSignal}镜像对比</div>
            <div className="nudge-desc">拍张你现在的{physicalSignal}照片。我会把它和标准动作重叠，帮你找出偏移。</div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', opacity: 0.5 }}>标准参考</div>
            <div style={{ flex: 1, height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>你的实时</div>
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }} onClick={handleTakePhoto}>📸 拍照对比</button>
        </div>
      </div>

      {/* Block 3: todo_card */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【盲区探测】技巧盲区探测 🎯</div>
            <div className="nudge-desc">别只练你会的，测一下你不知道的。</div>
          </div>
          <div className="satiety-checklist" style={{ marginTop: '12px' }}>
            {['尝试 极限角度变体', '记录卡壳物理点', '获取纠偏对策'].map((item, i) => (
              <div key={i} className="satiety-item">
                <div className="satiety-circle"><div className="satiety-check">✓</div></div>
                <div className="satiety-label"><span className="satiety-text">{item}</span></div>
              </div>
            ))}
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }}>获取对策</button>
        </div>
      </div>

      {/* Block 4: todo_card */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【微步练习】阶段性刻意练习清单</div>
            <div className="nudge-desc">别急着做全套。先完成这 3 个动作。</div>
          </div>
          <div className="satiety-checklist" style={{ marginTop: '12px' }}>
            {['核心收紧 30s', '重心前移练习', '末端发力控制'].map((item, i) => (
              <div key={i} className="satiety-item">
                <div className="satiety-circle"><div className="satiety-check">✓</div></div>
                <div className="satiety-label"><span className="satiety-text">{item}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Block 5: webpage_card */}
      <div className="nudge" onClick={() => setActiveOverlay('mastery_roadmap')}>
        <div className="nudge-card clickable" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
          <div className="nudge-header">
            <div className="nudge-title">【进阶路线图】技能物理进阶路径 🗺️</div>
            <div className="nudge-desc">点击查看从新手到专家的坐标系。</div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>当前阶段: <span style={{ color: 'var(--accent-green)' }}>进阶新手 (L2)</span></div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: '35%', height: '100%', background: 'var(--accent-green)' }}></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderInterceptor = () => (
    <>
      {/* Block 1: photo_card */}
      <div className="nudge">
        <div className="nudge-card" style={{ filter: 'grayscale(100%) brightness(0.7)' }}>
          <div className="nudge-header">
            <div className="nudge-title">【视觉重置】立即停下！</div>
            <div className="nudge-desc">别刷了。我帮你把界面置灰了。盯着这个画面深呼吸 10 秒。</div>
          </div>
          <div style={{ height: '120px', background: '#111', borderRadius: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
            ⏳
          </div>
        </div>
      </div>

      {/* Block 2: number_card */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【痛感账单】已造成的注意力损益</div>
            <div className="nudge-desc">你刚才消耗了 45 分钟。这些资源本可以用来完成深度阅读。</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '12px' }}>
            <div style={{ fontSize: '40px' }}>💸</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#f43f5e' }}>-45 min</div>
          </div>
        </div>
      </div>

      {/* Block 3: todo_card */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【物理替代方案】极简物理替代 🥤</div>
            <div className="nudge-desc">冲动来袭时，先做这个动作。</div>
          </div>
          <div className="satiety-checklist" style={{ marginTop: '12px' }}>
            {['喝一杯 300ml 的温水', '做 10 个深蹲', '确认身体感觉'].map((item, i) => (
              <div key={i} className="satiety-item">
                <div className="satiety-circle"><div className="satiety-check">✓</div></div>
                <div className="satiety-label"><span className="satiety-text">{item}</span></div>
              </div>
            ))}
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }}>已替代冲动</button>
        </div>
      </div>

      {/* Block 4: take_photo */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【物理离场确认】强制物理证据采集</div>
            <div className="nudge-desc">离开那个房间/App。拍一张窗外的照片给我。</div>
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }} onClick={handleTakePhoto}>📸 拍窗外确认离场</button>
        </div>
      </div>

      {/* Block 5: photo_card */}
      <div className="nudge" onClick={() => setActiveOverlay('interceptor_future')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">【未来后果预览】1 小时后的你 👁️</div>
            <div className="nudge-desc">视觉化对比：现在停下 vs 继续沉迷。</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: '80px', background: 'rgba(172,255,78,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>✨</div>
              <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6 }}>清醒高效</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: '80px', background: 'rgba(244,63,94,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>😫</div>
              <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6 }}>疲惫懊悔</div>
            </div>
          </div>
          <button className="btn-record btn-secondary" style={{ width: '100%', marginTop: '12px' }}>我选清醒</button>
        </div>
      </div>
    </>
  );

  const renderResonator = () => (
    <>
      {/* Block 1: text_card */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【表达平替】试试更有力的表达</div>
            <div className="nudge-desc">你的草稿太生硬了。我帮你改成了这段话。</div>
          </div>
          <div className="inner-card" style={{ marginTop: '12px', fontStyle: 'italic', borderLeft: '3px solid var(--accent-green)' }}>
            “我理解你的顾虑，但从项目长远来看，我们或许可以...”
          </div>
          <button className="btn-record btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={triggerToast}>复制改写话术</button>
        </div>
      </div>

      {/* Block 2: photo_card */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【心灵强化】现在的你就像...</div>
            <div className="nudge-desc">我根据你此时的勇气，生成了这张象征图。</div>
          </div>
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <img src="https://picsum.photos/seed/courage/300/200" alt="Courage" style={{ width: '100%', borderRadius: '12px' }} referrerPolicy="no-referrer" />
          </div>
        </div>
      </div>

      {/* Block 3: webpage_card */}
      <div className="nudge" onClick={() => setActiveOverlay('resonator_sandbox')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">【沟通结果预演】表达后果沙盒 🧪</div>
            <div className="nudge-desc">不同语气，会导致完全不同的现实。</div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
            <div style={{ flex: 1, height: '40%', background: '#f43f5e', borderRadius: '2px' }}></div>
            <div style={{ flex: 1, height: '90%', background: 'var(--accent-green)', borderRadius: '2px' }}></div>
            <div style={{ flex: 1, height: '60%', background: '#fbbf24', borderRadius: '2px' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.5, marginTop: '4px' }}>
            <span>生硬</span>
            <span>事实引导</span>
            <span>委婉</span>
          </div>
        </div>
      </div>

      {/* Block 4: place_card */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【环境降噪】建议去这里坐会儿</div>
            <div className="nudge-desc">你现在的压力指数过高。去那里冷静 15 分钟。</div>
          </div>
          <div style={{ marginTop: '12px', background: 'var(--inner-card)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>☕</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>街角安静咖啡馆</div>
              <div style={{ fontSize: '11px', opacity: 0.5 }}>适合整理思绪</div>
            </div>
            <button className="btn-record btn-primary" style={{ height: '36px', padding: '0 12px', fontSize: '12px' }}>立刻出发</button>
          </div>
        </div>
      </div>

      {/* Block 5: instacart_card */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【能量回血补给】沟通后的能量补给 🍫</div>
            <div className="nudge-desc">刚才的谈话很费神吧？我为你选了回血物资。</div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <img src="https://picsum.photos/seed/choco/100/100" alt="Choco" style={{ width: '100%', borderRadius: '8px' }} referrerPolicy="no-referrer" />
              <div style={{ fontSize: '10px', marginTop: '4px' }}>黑巧克力</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <img src="https://picsum.photos/seed/nuts/100/100" alt="Nuts" style={{ width: '100%', borderRadius: '8px' }} referrerPolicy="no-referrer" />
              <div style={{ fontSize: '10px', marginTop: '4px' }}>坚果</div>
            </div>
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }}>查看补给清单</button>
        </div>
      </div>
    </>
  );

  const renderCoordination = () => (
    <>
      {/* Block 1: todo_card */}
      <div className="nudge">
        <div className="nudge-card" style={{ border: '2px solid var(--accent-green)' }}>
          <div className="nudge-header">
            <div className="nudge-title">【单线程锁定】现在的唯一重点</div>
            <div className="nudge-desc">任务太多？别看了。我帮你锁定了第一步。</div>
          </div>
          <div className="inner-card" style={{ marginTop: '12px', fontSize: '18px', fontWeight: '800', textAlign: 'center' }}>
            🎯 整理核心需求文档
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }}>做完它，再看下一步</button>
        </div>
      </div>

      {/* Block 2: take_photo */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【战前物资清点】“作战物资”清点 📸</div>
            <div className="nudge-desc">确认你的生产力工具已全部就位。</div>
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }} onClick={handleTakePhoto}>📸 拍下你的生产力工具</button>
        </div>
      </div>

      {/* Block 3: take_photo */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【清障审计】书桌环境审计</div>
            <div className="nudge-desc">乱糟糟的环境会分散你的带宽。</div>
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }} onClick={handleTakePhoto}>📸 拍下整洁的桌面</button>
        </div>
      </div>

      {/* Block 4: webpage_card */}
      <div className="nudge" onClick={() => setActiveOverlay('coordination_dashboard')}>
        <div className="nudge-card clickable">
          <div className="nudge-header">
            <div className="nudge-title">【全局看板】项目资源热力图</div>
            <div className="nudge-desc">点击查看你的全局进展。别担心，一切在掌控。</div>
          </div>
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} style={{ height: '12px', background: i < 8 ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)', borderRadius: '2px' }}></div>
            ))}
          </div>
        </div>
      </div>

      {/* Block 5: number_card */}
      <div className="nudge">
        <div className="nudge-card">
          <div className="nudge-header">
            <div className="nudge-title">【核心节点跳秒】距离下个安全窗口 ⌛</div>
            <div className="nudge-desc">别看总表，只看这一个跳秒。</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
            <div style={{ fontSize: '48px', fontWeight: '900', fontFamily: 'monospace', color: 'var(--accent-orange)' }}>
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </div>
          </div>
          <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '12px' }}>冲刺完成</button>
        </div>
      </div>
    </>
  );

  const renderSleep = () => (
    <div className="flex flex-col gap-4 px-4 pb-8">
      {/* 睡眠评分卡片 (Hero Card like) */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-[16px] font-[600] text-black leading-tight">昨晚睡眠报告</h3>
              <p className="text-[12px] text-[rgba(0,0,0,0.4)] mt-1">根据作息数据生成</p>
            </div>
            <span className="bg-[#FFEBCB] text-[#FF9D00] text-[12px] font-[600] px-2 py-1 rounded-[8px] leading-[18px]">
              评分 58
            </span>
          </div>
          
          <div className="bg-white rounded-[16px] p-3 mt-4 border border-white/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#FF6767] to-[#FFADAD] flex items-center justify-center shrink-0">
                <Moon size={14} color="white" />
              </div>
              <span className="text-[13px] font-[600] text-black">深度睡眠偏低 · 12%</span>
            </div>
            <p className="text-[12px] text-[rgba(0,0,0,0.4)] leading-normal">
              推荐先处理蓝光暴露和入睡延迟，今晚优先把「22:00 断屏」落地。
            </p>
            <button 
              onClick={() => setShowDetail({ type: 'SLEEP_REPORT' })}
              className="mt-3 flex items-center gap-1 text-[12px] font-[600] text-[rgba(0,0,0,0.8)]"
            >
              查看完整分析 <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ASMR Audio Card */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-[16px] bg-gradient-to-b from-black to-[#575757] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.03)] shrink-0">
            <Play size={20} className="text-[#ACFF4E] translate-x-[2px]" />
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-[600] text-black">睡前放松音频</h3>
            <p className="text-[12px] text-[rgba(0,0,0,0.4)] mt-1">03:45 · 睡前 10 分钟听</p>
          </div>
        </div>
      </div>

      {/* TODO Checklist */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
        <div className="relative z-10">
          <h3 className="text-[16px] font-[600] text-black mb-1">今晚就能做的 3 件事</h3>
          <p className="text-[12px] text-[rgba(0,0,0,0.4)] mb-4">Matthew Walker 建议的物理重置动作</p>
          
          <div className="flex flex-col gap-3">
            {[
              { time: '22:00', text: '客厅灯光调 10% · 2700K', done: true },
              { time: '23:00', text: 'Kindle 阅读，不碰手机', done: false },
              { time: '23:30', text: '躺下，白噪音 20 min', done: false }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-[16px] p-3 border border-white/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)] flex gap-3 items-center">
                    <div className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center shrink-0 ${item.done ? 'bg-gradient-to-b from-black to-[#575757] border-transparent' : 'border-[rgba(0,0,0,0.2)] bg-transparent'}`}>
                      {item.done && <Check size={14} className="text-[#ACFF4E]" strokeWidth={2.5} />}
                    </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-[500] text-[#00C040] mb-0.5">{item.time}</span>
                  <span className="text-[13px] font-[600] text-black">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sleep Lock CTA */}
      <button 
        onClick={() => {
          setSleepLockActive(true);
          setTimeout(() => setSleepLockActive(false), 3500);
        }}
        className="w-full h-12 rounded-[100px] bg-gradient-to-b from-black to-[#575757] flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(0,0,0,0.2)] mt-2 active:scale-95 transition-transform"
      >
        <Lock size={20} className="text-[#ACFF4E]" />
        <span className="text-[#ACFF4E] text-[14px] font-[600]">开启 22:00 睡眠锁</span>
      </button>
    </div>
  );

  const renderMorning = () => (
    <div className="flex flex-col gap-4 px-4 pb-8">
      {/* Hero Image Card */}
      <div className="w-full h-[220px] rounded-[24px] relative overflow-hidden shadow-[0_4px_8px_rgba(0,0,0,0.05)] border border-white/50">
        <img src="https://picsum.photos/seed/morning_routine/400/300" className="absolute inset-0 w-full h-full object-cover" alt="Morning" />
        <div className="absolute inset-x-0 top-0 h-[100px]" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-[120px]" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
        <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-2">
          <span className="bg-white/20 backdrop-blur-[12px] border border-white/50/10 text-white text-[11px] font-[600] px-2 py-1 rounded-[8px] self-start flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-white/20 border border-white/50/30" />
            @mia.routine
          </span>
          <h3 className="text-white text-[17px] font-[600] leading-[24px]">
            晨间复刻方案
          </h3>
          <p className="text-white/80 text-[12px]">
            按你 {morningDuration} 分钟窗口压缩成最小可执行流程。
          </p>
        </div>
      </div>

      {/* TODO Card */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
        <div className="relative z-10">
          <h3 className="text-[16px] font-[600] text-black mb-1 flex items-center gap-2">
            4 步分解复刻 <span className="text-[11px] font-[400] text-[rgba(0,0,0,0.4)]">(共 {morningDuration} 分钟)</span>
          </h3>
          
          <div className="flex flex-col gap-3 mt-4">
            {morningSteps.map((item, i) => (
              <button
                type="button"
                key={i}
                onClick={() =>
                  setMorningSteps((prev) => prev.map((it, idx) => (idx === i ? { ...it, done: !it.done } : it)))
                }
                className="flex items-center justify-between p-3 bg-white/50 border border-white/50 rounded-[16px] shadow-[0_4px_8px_rgba(0,0,0,0.02)] active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center shrink-0 ${item.done ? 'bg-gradient-to-b from-black to-[#575757] border-transparent' : 'border-[rgba(0,0,0,0.2)] bg-transparent'}`}>
                      {item.done && <Check size={14} className="text-[#ACFF4E]" strokeWidth={2.5} />}
                    </div>
                  <span className="text-[13px] font-[600] text-black">{item.text}</span>
                </div>
                <span className="text-[11px] font-[500] text-[rgba(0,0,0,0.4)]">{item.time}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 状态预测卡（运势风） */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
        <div className="relative z-10">
          {(() => {
            const done = morningSteps.filter((x) => x.done).length;
            const total = morningSteps.length;
            const pct = Math.round((done / total) * 100);
            const mood =
              pct >= 100 ? '大吉' : pct >= 75 ? '吉' : pct >= 50 ? '小吉' : pct >= 25 ? '平' : '待启动';
            const glow =
              pct >= 75 ? 'radial-gradient(circle at 30% 20%, rgba(172,255,78,0.55), transparent 55%)' :
              pct >= 50 ? 'radial-gradient(circle at 30% 20%, rgba(255,166,26,0.35), transparent 55%)' :
              'radial-gradient(circle at 30% 20%, rgba(255,103,103,0.25), transparent 55%)';
            return (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[16px] font-[700] text-black">今日状态预测</div>
                    <div className="text-[12px] text-[rgba(0,0,0,0.4)] mt-1">像测测运势一样：每勾一步，预测会变好。</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-[900] text-black font-['Urbanist',sans-serif]">{pct}</div>
                    <div className="text-[12px] font-[700] text-[#00C040]">{mood}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-[16px] overflow-hidden border border-white shadow-[0_10px_22px_rgba(0,0,0,0.06)]">
                  <div className="h-[110px] bg-gradient-to-r from-black to-[#575757] relative">
                    <div className="absolute inset-0" style={{ background: glow }} />
                    <div className="absolute left-4 top-4 text-[#ACFF4E] text-[12px] font-[800]">
                      预测走势 · {done}/{total} 已完成
                    </div>
                    <div className="absolute left-4 bottom-4 text-white text-[14px] font-[700]">
                      {pct >= 75 ? '今天适合：稳稳推进，效率很高。' : pct >= 50 ? '今天适合：先做最小动作，再加速。' : '今天适合：只做第一步就算赢。'}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Shopping List Card */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={20} className="text-black" />
            <h3 className="text-[16px] font-[600] text-black">同款单品推荐</h3>
          </div>
          <p className="text-[12px] text-[rgba(0,0,0,0.4)] mb-4">点击直接下单，装备到位。</p>

          <div className="flex flex-col gap-3">
            {[
              { name: 'EarlyBird Morning Cocktail · Pineapple Mimosa', price: '¥ 198', platform: 'Amazon', url: 'https://www.amazon.com', image: '/products/earlybird-mimosa.png', blurb: '早上醒来就能喝的轻松“仪式感”。' },
              { name: 'CeraVe 补水三件套（洁面 + 乳液 + 防晒）', price: '¥ 169', platform: 'Amazon', url: 'https://www.amazon.com', image: '/products/cerave-bundle.png', blurb: '起床 3 分钟搞定“清洁-保湿-防晒”。' },
              { name: 'Tuscanini Lemon Juice（柠檬汁）', price: '¥ 39', platform: 'Amazon', url: 'https://www.amazon.com', image: '/products/tuscanini-lemon-juice.png', blurb: '温水 + 柠檬：最省力的晨间启动器。' }
            ].map((item, i) => (
              <div 
                key={i} 
                onClick={() => setShowDetail({ type: 'PRODUCT', data: item })}
                className="bg-white rounded-[16px] p-3 border border-white/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)] flex gap-3 justify-between items-center active:scale-95 transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-[44px] h-[44px] rounded-[12px] object-cover shrink-0 bg-black/5"
                  />
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-[600] text-black truncate">{item.name}</h4>
                    <p className="text-[11px] text-[rgba(0,0,0,0.4)] mt-0.5 truncate">{item.blurb}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-[700] text-[#01C041]">{item.price}</div>
                  <div className="inline-flex items-center gap-1 mt-1 bg-[#C9EFD6] text-[#01C041] px-2 py-0.5 rounded-[6px] text-[10px] font-[600]">
                    去下单 <ChevronRight size={10} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderHealth = () => (
    <div className="flex flex-col gap-4 px-4 pb-8">
      {/* Restaurant List */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
        <div className="relative z-10">
          <h3 className="text-[16px] font-[600] text-black mb-1">今日推荐健康外食</h3>
          <p className="text-[12px] text-[rgba(0,0,0,0.4)] mb-4">按清淡、蛋白密度和可持续度筛选。</p>
          
          <div className="flex flex-col gap-3">
            {[
              { name: 'Wagas (嘉里中心店)', tag: '低 GI · 推荐沙拉', distance: '450m' },
              { name: '新元素 Element Fresh', tag: '高蛋白 · 能量碗', distance: '800m' },
              { name: 'gaga (万象城店)', tag: '轻食 · 鲜果茶', distance: '1.2km' }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-[16px] p-3 border border-white/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)] flex gap-3 relative">
                <img src={`https://picsum.photos/seed/food${i}/80/80`} className="w-[60px] h-[60px] rounded-[12px] object-cover shrink-0" alt="" />
                <div className="flex flex-col justify-center flex-1">
                  <h4 className="text-[13px] font-[600] text-black leading-tight mb-1">{item.name}</h4>
                  <span className="bg-[#D8EEFF] text-[#1E9EFF] text-[11px] font-[600] px-2 py-0.5 rounded-[6px] self-start">
                    {item.tag}
                  </span>
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-1 text-[11px] text-[rgba(0,0,0,0.4)] font-[500]">
                  <MapPin size={12} />
                  {item.distance}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Eating Out Guide */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Salad size={20} className="text-black" />
            <h3 className="text-[16px] font-[600] text-black">万能外食点餐公式</h3>
          </div>
          <p className="text-[12px] text-[rgba(0,0,0,0.4)] mb-4">视频核心：无论去哪家店，按这个顺序点。</p>
          
          <div className="flex flex-col gap-2">
            {[
              '1. 先点一份绿叶菜 (纤维垫底)',
              '2. 选择优质蛋白质 (煎/烤/煮)',
              '3. 碳水减半 (换成糙米或红薯)',
              '4. 酱料分装 (只蘸不拌)'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/50 border border-white/50 rounded-[12px]">
                <div className="w-2 h-2 rounded-full bg-[#00C040] shrink-0" />
                <span className="text-[12px] font-[500] text-black">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Propose */}
      <button 
        onClick={triggerToast}
        className="w-full h-12 rounded-[100px] bg-gradient-to-b from-black to-[#575757] flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(0,0,0,0.2)] mt-2 active:scale-95 transition-transform"
      >
        <span className="text-[#ACFF4E] text-[14px] font-[600]">开启「健康外食」监督</span>
      </button>
    </div>
  );

  const renderDetailView = () => {
    if (!showDetail) return null;

    return (
      <div className="absolute inset-0 bg-[#E7E9EC] z-[1000] flex flex-col text-black" style={{ animation: 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div className="flex items-center gap-4 px-5 pt-12 pb-4 border-b border-black/5">
          <div className="text-[21px] cursor-pointer" onClick={() => setShowDetail(null)}>
            <ChevronRight className="rotate-180" size={24} />
          </div>
          <div className="font-[600] text-[15px]">{showDetail.type === 'SLEEP_REPORT' ? '睡眠锐评报告' : '商品详情'}</div>
        </div>
        
        <div className="p-5 flex-1 pb-12">
          {showDetail.type === 'SLEEP_REPORT' ? (
            <div className="flex flex-col gap-4">
              <div className="text-[21px] font-[800] mb-2 font-['Urbanist',sans-serif]">评分: <span className="text-[#FF6767] font-['Urbanist',sans-serif]">58</span></div>
              <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
                <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-[16px] font-[700] text-black">诊断结论</div>
                  <div className="mt-1 text-[12px] text-[rgba(0,0,0,0.4)]">
                    你现在最该先修的不是“更努力”，而是把入睡前 60 分钟的刺激强度降下来。
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="bg-[#FFE1E1] text-[#FF6767] text-[11px] font-[700] px-2 py-1 rounded-[8px]">深睡不足</span>
                    <span className="bg-[#FFEBCB] text-[#FF9D00] text-[11px] font-[700] px-2 py-1 rounded-[8px]">入睡偏慢</span>
                    <span className="bg-[#C9EFD6] text-[#01C041] text-[11px] font-[700] px-2 py-1 rounded-[8px]">作息尚可</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
                  <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-[13px] font-[600] mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FF6767]" />深度睡眠严重不足</div>
                    <div className="text-[12px] text-[rgba(0,0,0,0.4)]">Matthew Walker 标准: 20-25% | 你的数据: 12%</div>
                    <div className="mt-3 h-2 bg-black/5 rounded-full overflow-hidden">
                      <div className="w-[40%] h-full bg-[#FF6767] rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
                  <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-[13px] font-[600] mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FFADAD]" />入睡潜伏期过长</div>
                    <div className="text-[12px] text-[rgba(0,0,0,0.4)]">平均耗时 45 分钟才进入第一阶段睡眠。</div>
                  </div>
                </div>
                <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
                  <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-[13px] font-[600] mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00C040]" />睡眠一致性</div>
                    <div className="text-[12px] text-[rgba(0,0,0,0.4)]">过去 3 天入睡时间偏差在 15min 内，表现不错。</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center mt-8">
              <div className="w-full h-[250px] bg-[#F2F2F2] rounded-[24px] mb-6 flex items-center justify-center relative overflow-hidden">
                <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] pointer-events-none" />
                {showDetail.data?.image ? (
                  <img
                    src={showDetail.data.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag size={64} className="text-black/20" />
                )}
              </div>
              <div className="text-[17px] font-[600] mb-2">{showDetail.data.name}</div>
              <div className="text-[24px] font-[800] text-[#00C040] font-['Urbanist',sans-serif] mb-6">{showDetail.data.price}</div>
              <div className="text-[12px] text-[rgba(0,0,0,0.4)] mb-10 leading-relaxed px-4">
                {showDetail.data?.blurb ? showDetail.data.blurb : '已为你准备好同款单品的购买入口。'}（平台：{showDetail.data.platform}）
              </div>
              <a 
                href={showDetail.data.url} 
                target="_blank" 
                rel="noreferrer"
                className="w-full h-12 rounded-[100px] bg-gradient-to-b from-black to-[#575757] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.2)] active:scale-95 transition-transform decoration-transparent"
              >
                <span className="text-[#ACFF4E] text-[14px] font-[600]">前往 {showDetail.data.platform} 购买</span>
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSharingFlow = () => {
    if (isProcessing) {
      const currentVideo = coach && coach in videoData ? videoData[coach as keyof typeof videoData] : null;
      const timeline = coach === 'SLEEP' || coach === 'MORNING' || coach === 'HEALTH' ? timelineByCoach[coach] : [];
      return (
        <div className="absolute inset-0 bg-[#E7E9EC] z-[500]">
          <div className="h-full w-full px-8 pt-6">
            <div className="flex items-start justify-between text-black">
              <div className="text-[15px] font-[600]">9:40</div>
              <div className="flex items-center gap-2 text-black/80">
                <Signal size={16} strokeWidth={2.5} />
                <Wifi size={16} strokeWidth={2.5} />
                <Battery size={18} strokeWidth={2.5} />
              </div>
            </div>

            <div className="mt-7 flex flex-col items-center">
              <div className="w-[92px] h-[92px] rounded-full bg-[url('/bunny-thinking.png')] bg-cover bg-center shadow-[0_18px_40px_rgba(0,0,0,0.12)]" />

              <div className="mt-5 text-[26px] font-[800] tracking-[-0.4px] text-black text-center">
                正在拆解视频…
              </div>
              <div className="mt-2 text-[14px] text-[rgba(0,0,0,0.25)] font-[600]">
                大约需要 20 秒
              </div>

              <div className="mt-5 w-full max-w-[320px] bg-white/70 border border-white rounded-[18px] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                <div className="text-[12px] font-[900] text-black/70 mb-1">已识别视频</div>
                <div className="text-[14px] font-[800] text-black leading-snug">{currentVideo?.title}</div>
                <div className="mt-2 text-[12px] text-[rgba(0,0,0,0.4)]">按时间线拆关键节点（流式生成）</div>
              </div>

              {/* 视频时间线（沿着线往下走：每个点=一个时间点） */}
              <div className="mt-4 w-full max-w-[320px]">
                <div className="relative pl-10">
                  <div className="absolute left-[14px] top-[10px] bottom-[14px] w-[6px] bg-[#ACFF4E] rounded-full" />
                  {timeline.slice(0, processingStep + 1).map((p, idx) => {
                    const done = idx < processingStep;
                    const active = idx === processingStep;
                    return (
                      <div key={p.at + p.title} className="flex items-start gap-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-[#ACFF4E] flex items-center justify-center shadow-[0_10px_20px_rgba(172,255,78,0.35)] shrink-0 mt-0.5">
                          {done ? (
                            <Check size={16} strokeWidth={3} className="text-black" />
                          ) : (
                            <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-black' : 'bg-black/40'}`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] font-[900] text-[rgba(0,0,0,0.55)] font-['Urbanist',sans-serif]">
                            {p.at}
                          </div>
                          <div className="mt-0.5 text-[14px] font-[900] text-black leading-[1.2]">
                            {p.title}
                          </div>
                          <div className="mt-1 text-[12px] text-[rgba(0,0,0,0.45)] leading-[1.35]">
                            {p.detail}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (shareStage === 'INTENT') {
      const intentOptions =
        coach === 'HEALTH'
          ? [
              { id: 'health_order', title: '点单口令', desc: '一句话点单，不用纠结。' },
              { id: 'health_formula', title: '外食公式', desc: '低油高蛋白的通用组合。' },
              { id: 'health_location', title: '餐厅位置', desc: '视频同款店 + 附近替代。' },
              { id: 'health_menu', title: '推荐菜单', desc: '按视频拆出可照抄的菜。' },
              { id: 'health_calorie', title: '热量估算', desc: '给出大致区间和替换建议。' },
            ]
          : coach === 'SLEEP'
            ? [
                { id: 'sleep_tonight', title: '今晚助眠', desc: '直接给可执行流程。' },
                { id: 'sleep_fall_asleep', title: '快速入睡', desc: '减少入睡耗时。' },
                { id: 'sleep_wakeup', title: '减少夜醒', desc: '半夜醒来怎么办。' },
                { id: 'sleep_env', title: '环境布置', desc: '温度/光线/噪音。' },
                { id: 'sleep_habit', title: '作息修复', desc: '把习惯改到位。' },
              ]
            : [
                { id: 'morning_flow', title: '流程清单', desc: '按视频还原并压缩。' },
                { id: 'morning_timebox', title: '时间分配', desc: '每步用多久最合理。' },
                { id: 'morning_products', title: '同款单品', desc: '清单 + 购买优先级。' },
                { id: 'morning_breakfast', title: '早餐模板', desc: '快速且稳的组合。' },
                { id: 'morning_nudge', title: '防拖延提醒', desc: '怎么让自己动起来。' },
              ];

      const snippet =
        coach === 'HEALTH'
          ? ['外食点单核心：低油 + 高蛋白 + 一份高纤维', '视频里重点提到：酱汁分开放、主食减半', '餐厅类型：轻食/沙拉/能量碗/日式定食']
          : coach === 'SLEEP'
            ? ['视频重点：睡前 60 分钟降刺激', '关键动作：呼吸放慢 + 肩颈放松', '环境要点：降温、遮光、白噪音']
            : ['视频流程：起床→补水→拉伸→早餐→整理', '关键习惯：先做“最小动作”避免拖延', '单品偏好：简洁、可重复购买'];

      return (
        <div className="absolute inset-0 z-[500] bg-[#E7E9EC]">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 60% at 50% 0%, rgba(172,255,78,0.95) 0%, rgba(172,255,78,0.55) 40%, rgba(231,233,236,1) 75%)',
            }}
          />

          <div className="relative h-full w-full px-8 pt-6 flex flex-col">
            {/* top status */}
            <div className="flex items-center justify-between text-black">
              <div className="text-[15px] font-[700]">9:41</div>
              <div className="flex items-center gap-2 text-black/80">
                <Signal size={16} strokeWidth={2.5} />
                <Wifi size={16} strokeWidth={2.5} />
                <Battery size={18} strokeWidth={2.5} />
              </div>
            </div>

            {/* top controls (no progress bar) */}
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShareStage('ENTRY');
                  setShareIntents([]);
                  setHasShared(false);
                }}
                className="w-11 h-11 rounded-full bg-white/55 border border-white/80 shadow-[0_10px_24px_rgba(0,0,0,0.10)] flex items-center justify-center active:scale-[0.98] transition"
              >
                <ArrowLeft size={20} strokeWidth={2.5} className="text-black/80" />
              </button>
              <button
                type="button"
                className="w-11 h-11 rounded-full bg-white/55 border border-white/80 shadow-[0_10px_24px_rgba(0,0,0,0.10)] flex items-center justify-center active:scale-[0.98] transition"
              >
                <Volume2 size={20} strokeWidth={2.5} className="text-black/80" />
              </button>
            </div>

            {/* avatar (smaller to leave space) */}
            <div className="mt-8 flex justify-center">
              <div className="w-[56px] h-[56px] rounded-full bg-white/65 border border-white shadow-[0_16px_34px_rgba(0,0,0,0.10)] flex items-center justify-center overflow-hidden">
                <img src="/bunny-thinking.png" alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>

            {/* question */}
            <div className="mt-5 text-center text-black text-[22px] font-[900] tracking-[-0.35px] leading-[1.15]">
              {coach === 'HEALTH'
                ? '你更想先得到哪一种结果？'
                : coach === 'SLEEP'
                  ? '你更想先解决哪个睡眠目标？'
                  : '你更想先要哪一种复刻结果？'}
            </div>
            <div className="mt-3 text-center text-[12px] text-[rgba(0,0,0,0.28)] font-[600]">
              我已经先拆出视频要点：{snippet[0]}
            </div>

            {/* scrollable options area (multi-choice) */}
            <div className="mt-5 flex-1 overflow-y-auto pb-[120px] px-1">
              <div className="flex flex-col gap-3">
                {intentOptions.map((opt) => {
                  const selected = shareIntents.includes(opt.id);
                  return (
                    <div key={opt.id} className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShareIntents((prev) =>
                            prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]
                          )
                        }
                        className={`w-full rounded-[18px] px-5 py-[14px] text-left bg-white/75 border shadow-[0_18px_44px_rgba(0,0,0,0.07)] transition active:scale-[0.99] ${
                          selected ? 'border-black/10 ring-2 ring-black/10' : 'border-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[15px] font-[800] text-black">{opt.title}</div>
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                              selected ? 'bg-black border-black' : 'bg-white/70 border-black/15'
                            }`}
                          >
                            {selected ? <Check size={14} strokeWidth={3} className="text-[#ACFF4E]" /> : null}
                          </div>
                        </div>
                        <div className="mt-1 text-[12px] text-[rgba(0,0,0,0.35)]">{opt.desc}</div>
                      </button>

                      {selected && (
                        <div className="bg-white/55 border border-white rounded-[18px] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.10)]">
                          <div className="text-[12px] font-[900] text-black/70 mb-2">结果预览</div>
                          <div className="text-[12px] text-[rgba(0,0,0,0.75)] leading-[1.45]">
                            {(() => {
                              if (coach === 'HEALTH') {
                                if (opt.id === 'health_order') return '点单口令：请给我「蛋白+两份蔬菜」，酱汁分开，主食半份。';
                                if (opt.id === 'health_location') return '餐厅位置：视频同款店 + 你附近替代 2 家（距离/步行时间）。';
                                if (opt.id === 'health_menu') return '推荐菜单：3 个可照抄的组合（含替换项）。';
                                if (opt.id === 'health_calorie') return '热量估算：每份 ~450–650 kcal + 降热量替换建议。';
                                return '外食公式：低油+高蛋白+高纤维（通用模板）。';
                              }
                              if (coach === 'SLEEP') {
                                if (opt.id === 'sleep_tonight') return '今晚助眠：22:00→23:30 三步流程卡（今晚就能做）。';
                                if (opt.id === 'sleep_fall_asleep') return '快速入睡：5 分钟呼吸 + 放松指令卡。';
                                if (opt.id === 'sleep_wakeup') return '减少夜醒：醒来 90 秒自救流程（不拿手机）。';
                                if (opt.id === 'sleep_env') return '环境布置：温度/光线/噪音三要素清单。';
                                return '作息修复：3 天微调计划（不靠意志力）。';
                              }
                              if (opt.id === 'morning_flow') return '流程清单：4 步可执行打卡（按你时间压缩）。';
                              if (opt.id === 'morning_products') return '同款单品：3 件缩略图清单 + 点开同图大图。';
                              if (opt.id === 'morning_timebox') return '时间分配：每步用时建议 + 最小版本。';
                              if (opt.id === 'morning_breakfast') return '早餐模板：3 套 5 分钟稳能量组合。';
                              return '防拖延提醒：一条“最小动作”启动提示。';
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* fixed bottom CTA */}
            <div className="absolute left-0 right-0 bottom-0 px-6 pb-6">
              <div className="h-[18px]" />
              <button
                type="button"
                onClick={() => {
                  if (!shareIntents.length) return;
                  setHasShared(true);
                }}
                className={`w-full h-[54px] rounded-full bg-black shadow-[0_18px_44px_rgba(0,0,0,0.30)] flex items-center justify-center active:scale-[0.99] transition ${
                  shareIntents.length ? '' : 'opacity-40 pointer-events-none'
                }`}
              >
                <span className="text-[#ACFF4E] text-[15px] font-[800]">继续（已选 {shareIntents.length} 项）</span>
                <span className="ml-2 text-[#ACFF4E] text-[16px] font-[900]">›</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 bg-[#E7E9EC] z-[500]">
        <div className="w-full h-full flex flex-col">
          {/* status bar (upload-style) */}
          <div className="flex items-center justify-between px-6 pt-6 text-black">
            <div className="text-[15px] font-[600] tracking-[-0.2px]">9:41</div>
            <div className="flex items-center gap-1.5">
              <Signal size={16} strokeWidth={2.5} />
              <Wifi size={16} strokeWidth={2.5} />
              <Battery size={18} strokeWidth={2.5} />
            </div>
          </div>

          <div className="px-6 pt-10 pb-10 flex-1">
            <h1 className="text-center text-black text-[26px] font-[800] leading-[1.15] tracking-[-0.35px] whitespace-nowrap">
              你想要的结果，马上得到
            </h1>

            <div className="mt-12">
              <div className="text-black text-[16px] font-[500] mb-3">输入文字或粘贴链接</div>
              <div className="bg-white/80 border border-white rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.06)] h-[56px] px-4 flex items-center gap-2">
                <div aria-hidden className="w-[2px] h-[18px] bg-[#ACFF4E] rounded-full" />
                <input
                  type="text"
                  placeholder="例如：健康外食 / 睡眠改善 / 晨间习惯…"
                  className="flex-1 bg-transparent outline-none text-[16px] font-[500] text-black placeholder:text-[rgba(0,0,0,0.22)]"
                  value={shareInput}
                  onChange={(e) => setShareInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitShare();
                  }}
                />
              </div>
              <button
                type="button"
                onClick={submitShare}
                disabled={!shareInput.trim()}
                className={`mt-4 w-full h-[44px] rounded-full bg-gradient-to-b from-black to-[#575757] flex items-center justify-center shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition-all active:scale-[0.99] ${
                  shareInput.trim() ? '' : 'opacity-40 pointer-events-none'
                }`}
              >
                <span className="text-[#ACFF4E] text-[14px] font-[700]">提交并开始拆解</span>
              </button>
              <div className="mt-3 text-[12px] text-[rgba(0,0,0,0.4)] leading-relaxed">
                {coach === 'SLEEP'
                  ? '粘贴睡眠相关视频链接，Jovida 将自动生成今晚助眠拆解方案'
                  : coach === 'MORNING'
                    ? '粘贴晨间 Routine 视频链接，Jovida 将自动生成可执行流程与清单'
                    : '粘贴外食/探店视频链接，Jovida 将自动生成健康点餐与餐厅推荐'}
              </div>
            </div>

            <div className="mt-14">
              <div className="text-black text-[16px] font-[500] mb-8">上传图片</div>

              <div className="relative mx-auto w-[240px] h-[320px]">
                <div className="absolute inset-0 bg-white/30 rounded-[28px] rotate-[-8deg] translate-x-[-10px] translate-y-[10px]" />
                <div className="absolute inset-0 bg-white/45 rounded-[28px] rotate-[6deg] translate-x-[12px] translate-y-[16px]" />

                <div className="absolute inset-0 bg-white/55 rounded-[28px] border border-white shadow-[0_18px_50px_rgba(0,0,0,0.10)] flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-[62px] h-[62px] rounded-[16px] bg-black/5 flex items-center justify-center">
                      <Image size={28} className="text-black/20" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-[0_10px_22px_rgba(0,0,0,0.18)]">
                      <Plus size={18} strokeWidth={3} className="text-[#ACFF4E]" />
                    </div>
                  </div>
                  <div className="mt-8 text-[16px] font-[600] text-black">上传图片</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="demo-container">
      {/* SIDEBAR TOGGLE */}
      <div className={`sidebar-toggle ${isSideBarOpen ? 'open' : ''}`} onClick={() => setIsSideBarOpen(!isSideBarOpen)}>
        {isSideBarOpen ? '✕' : '☰'}
      </div>

      {/* SIDE CONTROLS */}
      <div className={`side-controls ${isSideBarOpen ? 'visible' : ''}`}>
        <div className="side-label">New Demo Cases</div>
        <button className={`side-btn ${coach === 'SLEEP' ? 'active' : ''}`} onClick={() => { setCoach('SLEEP'); setHasShared(false); setIsSideBarOpen(false); }}>🛌 学睡好觉</button>
        <button className={`side-btn ${coach === 'MORNING' ? 'active' : ''}`} onClick={() => { setCoach('MORNING'); setHasShared(false); setIsSideBarOpen(false); }}>🧖‍♀️ 晨间 Routine</button>
        <button className={`side-btn ${coach === 'HEALTH' ? 'active' : ''}`} onClick={() => { setCoach('HEALTH'); setHasShared(false); setIsSideBarOpen(false); }}>🥗 健康外食</button>

        <div className="side-label" style={{ marginTop: '12px' }}>Core Frameworks</div>
        <button className={`side-btn ${coach === 'MASTERY' ? 'active' : ''}`} onClick={() => { setCoach('MASTERY'); setIsSideBarOpen(false); setHasShared(true); }}>🎓 技能陪练</button>
        <button className={`side-btn ${coach === 'INTERCEPTOR' ? 'active' : ''}`} onClick={() => { setCoach('INTERCEPTOR'); setIsSideBarOpen(false); setHasShared(true); }}>🚫 上头拦截</button>
        <button className={`side-btn ${coach === 'RESONATOR' ? 'active' : ''}`} onClick={() => { setCoach('RESONATOR'); setIsSideBarOpen(false); setHasShared(true); }}>📡 内心沟通</button>
        <button className={`side-btn ${coach === 'COORDINATION' ? 'active' : ''}`} onClick={() => { setCoach('COORDINATION'); setIsSideBarOpen(false); setHasShared(true); }}>🧩 复杂统筹</button>
        
        <div className="side-label" style={{ marginTop: '12px' }}>Personal Coaches</div>
        <button className={`side-btn ${coach === 'BOUNDARY' ? 'active' : ''}`} onClick={() => { setCoach('BOUNDARY'); setIsSideBarOpen(false); setHasShared(true); }}>🛡️ 社交边界</button>
        <button className={`side-btn ${coach === 'WINGMAN' ? 'active' : ''}`} onClick={() => { setCoach('WINGMAN'); setIsSideBarOpen(false); setHasShared(true); }}>💬 社交僚机</button>
        <button className={`side-btn ${coach === 'ENERGY' ? 'active' : ''}`} onClick={() => { setCoach('ENERGY'); setIsSideBarOpen(false); setHasShared(true); }}>🌑 精力巅峰</button>
        <button className={`side-btn ${coach === 'SPENDING' ? 'active' : ''}`} onClick={() => { setCoach('SPENDING'); setIsSideBarOpen(false); setHasShared(true); }}>🧊 理智消费</button>
        <button className={`side-btn ${coach === 'RESET' ? 'active' : ''}`} onClick={() => { setCoach('RESET'); setIsSideBarOpen(false); setHasShared(true); }}>🧘 周日重置</button>
      </div>

      <div
        className={`phone ${isLifestyleCoach ? '!bg-[#E7E9EC] !text-black !border-white !shadow-[0_20px_40px_rgba(0,0,0,0.1)]' : ''}`}
        style={isLifestyleCoach ? { fontSize: '0.92em' } : undefined}
      >
        {sleepLockActive && (
          <div className="absolute inset-0 z-[1200]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 80% at 50% 0%, rgba(172,255,78,0.18) 0%, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0.96) 100%)',
              }}
            />
            <div className="absolute inset-0 backdrop-blur-[10px]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shadow-[0_18px_50px_rgba(0,0,0,0.4)]">
                <Lock size={26} className="text-[#ACFF4E]" />
              </div>
              <div className="mt-5 text-[18px] font-[900] tracking-[-0.2px]">睡眠锁已开启</div>
              <div className="mt-2 text-[12px] text-white/70 leading-relaxed">
                22:00 自动断屏 · 轻提醒 · 明早复盘
              </div>
              <div className="mt-6 w-full max-w-[260px] h-[10px] bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-full bg-[#ACFF4E]" style={{ animation: 'shimmer 1.2s linear infinite' }} />
              </div>
              <div className="mt-4 text-[11px] text-white/55">轻触任意位置关闭</div>
            </div>
            <button
              type="button"
              aria-label="close"
              onClick={() => setSleepLockActive(false)}
              className="absolute inset-0"
            />
          </div>
        )}
        {showDetail && renderDetailView()}
        {((coach === 'SLEEP' || coach === 'MORNING' || coach === 'HEALTH') && !hasShared) ? renderSharingFlow() : (
          <>
            {!isLifestyleCoach && <div className="top-gradient"></div>}

            {/* STATUS BAR */}
            <div className={`status-bar ${isLifestyleCoach ? 'text-black [&_svg]:fill-black' : 'text-white [&_svg]:fill-white'}`}>
              <span className="status-time">18:30</span>
              <div className="status-icons">
                <svg width="17" height="12" viewBox="0 0 17 12">
                  <rect x="0" y="8" width="3" height="4" rx="1" />
                  <rect x="4.5" y="5.5" width="3" height="6.5" rx="1" />
                  <rect x="9" y="3" width="3" height="9" rx="1" />
                  <rect x="13.5" y="0" width="3" height="12" rx="1" />
                </svg>
                <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
                  <path d="M8 9.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                  <path d="M8 6.5c1.5 0 2.8.6 3.8 1.6l1.4-1.4A7.4 7.4 0 008 4.5a7.4 7.4 0 00-5.2 2.2l1.4 1.4A5.4 5.4 0 018 6.5z" opacity=".7" />
                  <path d="M8 2.5c2.8 0 5.3 1.1 7.1 3l1.4-1.4A11.4 11.4 0 008 .5 11.4 11.4 0 00-.5 4.1L1 5.5A9.4 9.4 0 018 2.5z" opacity=".4" />
                </svg>
                <svg width="25" height="12" viewBox="0 0 25 12" fill="white">
                  <rect x="0" y="1" width="21" height="10" rx="3" stroke="white" strokeWidth="1.2" fill="none" opacity="0.7" />
                  <rect x="22" y="4" width="2" height="4" rx="1" opacity="0.5" />
                  <rect x="1.5" y="2.5" width="16" height="7" rx="2" />
                </svg>
              </div>
            </div>

            {/* HEADER */}
            <div className={`header ${isLifestyleCoach ? 'text-black' : ''}`}>
              <div className={`avatar-btn ${isLifestyleCoach ? 'avatar-brand' : ''}`}>
                {isLifestyleCoach ? (
                  <img src={ASSET_AVATAR_HERO} alt="Jovida Avatar" referrerPolicy="no-referrer" />
                ) : (
                  '👤'
                )}
              </div>
              <div className="header-badges">
                {coach === 'BOUNDARY' && <div className={`badge ${isLifestyleCoach ? '!bg-black/5 !border-black/10 !text-black' : ''}`}>Social OK</div>}
                {coach === 'WINGMAN' && <div className={`badge ${isLifestyleCoach ? '!bg-black/5 !border-black/10 !text-black' : ''}`}>Charisma +10</div>}
                {coach === 'ENERGY' && <div className="badge badge-orange">Energy Low</div>}
                {coach === 'SPENDING' && <div className={`badge ${isLifestyleCoach ? '!bg-black/5 !border-black/10 !text-black' : ''}`}>Budget OK</div>}
                {coach === 'RESET' && <div className="badge badge-orange">Stress +15</div>}
                {coach === 'SLEEP' && <div className={`badge ${isLifestyleCoach ? '!bg-black/5 !border-black/10 !text-black' : ''}`}>Sleep Mode</div>}
                {coach === 'MORNING' && <div className={`badge ${isLifestyleCoach ? '!bg-black/5 !border-black/10 !text-black' : ''}`}>Morning Routine</div>}
                {coach === 'HEALTH' && <div className={`badge ${isLifestyleCoach ? '!bg-black/5 !border-black/10 !text-black' : ''}`}>Healthy Eating</div>}
              </div>
            </div>

            {/* GOAL CHIP */}
            <div className="goal-row">
              <div className={`goal-chip ${isLifestyleCoach ? '!bg-white/60 !border-white !text-black shadow-sm' : ''}`}>
                {coach === 'BOUNDARY' && '🛡️ 社交边界教练'}
                {coach === 'WINGMAN' && '💬 社交僚机教练'}
                {coach === 'ENERGY' && '🌑 精力巅峰教练'}
                {coach === 'SPENDING' && '🧊 理智消费教练'}
                {coach === 'RESET' && '🧘 周日重置教练'}
                {coach === 'MASTERY' && '🎓 技能陪练全案'}
                {coach === 'INTERCEPTOR' && '🚫 上头拦截全案'}
                {coach === 'RESONATOR' && '📡 内心沟通全案'}
                {coach === 'COORDINATION' && '🧩 复杂统筹全案'}
                {coach === 'SLEEP' && '🛌 睡好觉计划'}
                {coach === 'MORNING' && '🧖‍♀️ 晨间 Routine'}
                {coach === 'HEALTH' && '🥗 健康外食指南'}
              </div>
              <div className={`add-btn ${isLifestyleCoach ? '!text-[rgba(0,0,0,0.4)]' : ''}`} onClick={() => setIsSideBarOpen(true)}>+ 切换</div>
            </div>

            {/* COACH MESSAGE */}
            <div className={`coach-msg ${isLifestyleCoach ? '!px-4 !py-4' : ''}`}>
              <div className={`coach-avatar ${isLifestyleCoach ? 'hidden' : ''}`}>
                {isLifestyleCoach ? (
                  <img src={ASSET_AVATAR_HERO} alt="Jovida Coach Avatar" referrerPolicy="no-referrer" />
                ) : (
                  '🤖'
                )}
              </div>
              <div className={`coach-text ${isLifestyleCoach ? '!bg-[#F2F2F2] !rounded-[24px] !p-[12px_16px] !text-black !text-[15px] leading-[1.4] w-fit shadow-[0_2px_8px_rgba(0,0,0,0.02)]' : ''}`}>
                {coach === 'BOUNDARY' && <>别担心，体体面面拒绝也是一种能力。我已经为你准备好了话术。</>}
                {coach === 'WINGMAN' && <>沟通的艺术在于细节。试试这些高情商回复建议吧。</>}
                {coach === 'ENERGY' && <>时间不早了，你的身体需要休息。让我们准备进入睡眠模式。</>}
                {coach === 'SPENDING' && <>在下单之前，先看看这笔消费的真实“代价”吧。</>}
                {coach === 'RESET' && <>深呼吸，周日的焦虑只是暂时的。让我们一起重置情绪。</>}
                {coach === 'MASTERY' && <>技能的习得在于物理级的刻意练习。让我们开始纠偏。</>}
                {coach === 'INTERCEPTOR' && <>检测到上头冲动。物理断路已开启，请执行替代方案。</>}
                {coach === 'RESONATOR' && <>沟通是能量的交换。我帮你把心里话翻译成更有力的话术。</>}
                {coach === 'COORDINATION' && <>别被繁琐淹没。我已为你锁定当前唯一重点，开始清障。</>}
                {coach === 'SLEEP' && <>看完啦 ~ 1h42min 被我压成 3 个生活动作 + 1 条核心洞见。今晚就能做 👇</>}
                {coach === 'MORNING' && <>晨间视频拆完啦 ~ 4 个动作 + 3 件单品。单品点一下就能下单 🛍</>}
                {coach === 'HEALTH' && <>外食也能吃得干净！我帮你拆解了视频里的点餐公式，并找了附近的餐厅 🥗</>}
              </div>
            </div>

            {/* SCROLL BODY */}
            <div className="scroll-body">
              {coach === 'BOUNDARY' && renderBoundary()}
              {coach === 'WINGMAN' && renderWingman()}
              {coach === 'ENERGY' && renderEnergy()}
              {coach === 'SPENDING' && renderSpending()}
              {coach === 'RESET' && renderReset()}
              {coach === 'MASTERY' && renderMastery()}
              {coach === 'INTERCEPTOR' && renderInterceptor()}
              {coach === 'RESONATOR' && renderResonator()}
              {coach === 'COORDINATION' && renderCoordination()}
              {coach === 'SLEEP' && renderSleep()}
              {coach === 'MORNING' && renderMorning()}
              {coach === 'HEALTH' && renderHealth()}

              <div className={`view-records ${isLifestyleCoach ? '!text-[rgba(0,0,0,0.4)]' : ''}`}>
                查看历史存证 <span className="chevron">›</span>
              </div>
            </div>

            {/* CHAT INPUT */}
            <div className={`chat-wrap ${isLifestyleCoach ? '!bg-white/80 !border-t-0 !shadow-none' : ''}`}>
              <div className={`chat-input ${isLifestyleCoach ? '!bg-white !border-white !rounded-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.04)]' : ''}`}>
                <span className={`mic-icon ${isLifestyleCoach ? '!opacity-40' : ''}`}>🎙️</span>
                <span className={`chat-placeholder ${isLifestyleCoach ? '!text-[rgba(0,0,0,0.4)]' : ''}`}>
                  {coach === 'BOUNDARY' && '粘贴对方发来的压力信息...'}
                  {coach === 'WINGMAN' && '粘贴对方的信息，我来润色...'}
                  {coach === 'ENERGY' && '告诉教练你为什么还不睡...'}
                  {coach === 'SPENDING' && '粘贴商品链接或描述...'}
                  {coach === 'RESET' && '告诉我你现在的感受...'}
                  {coach === 'MASTERY' && '输入你想练习的技能或动作...'}
                  {coach === 'INTERCEPTOR' && '告诉我你现在想戒掉什么...'}
                  {coach === 'RESONATOR' && '粘贴你的沟通草稿或描述场景...'}
                  {coach === 'COORDINATION' && '列出你现在最头疼的几件事...'}
                  {coach === 'SLEEP' && '分享你想学习的睡眠视频链接...'}
                  {coach === 'MORNING' && '分享你想复刻的博主视频...'}
                </span>
                <div className={`send-btn ${isLifestyleCoach ? '!bg-gradient-to-b !from-black !to-[#575757] !text-[#ACFF4E] !rounded-full shadow-sm' : ''}`}>↑</div>
              </div>
              {/* removed home indicator */}
            </div>
          </>
        )}

        {/* OVERLAYS */}
        {activeOverlay && (
          <div className="full-overlay">
            <div className="overlay-header">
              <button className="close-btn" onClick={() => setActiveOverlay(null)}>✕</button>
              <div className="overlay-title">
                {activeOverlay === 'refuse_scripts' && '🛡️ 拒绝嘴替话术'}
                {activeOverlay === 'stress_detail' && '📉 社交心累值分析'}
                {activeOverlay === 'reply_suggestions' && '💬 高情商回复建议'}
                {activeOverlay === 'subtext_analysis' && '🧠 潜台词深度解析'}
                {activeOverlay === 'comm_simulator' && '🎭 沟通走向模拟'}
                {activeOverlay === 'charisma_radar' && '📊 社交魅力雷达'}
                {activeOverlay === 'performance_preview' && '⚡ 明日状态预演'}
                {activeOverlay === 'energy_calc' && '📉 能量透支详情'}
                {activeOverlay === 'future_savings' && '💰 未来财富增值'}
                {activeOverlay === 'spending_calc' && '🧊 消费物理结算'}
                {activeOverlay === 'stress_map' && '🗺️ 压力地理分布'}
                {activeOverlay === 'heart_rate' && '💓 心率回落监测'}
                {activeOverlay === 'recharge_game' && '🎮 情绪充值游戏'}
                {activeOverlay === 'mastery_tech' && '🎓 核心技术拆解'}
                {activeOverlay === 'mastery_roadmap' && '🗺️ 技能进阶路径'}
                {activeOverlay === 'interceptor_future' && '👁️ 未来后果预览'}
                {activeOverlay === 'resonator_sandbox' && '🧪 表达后果沙盒'}
                {activeOverlay === 'coordination_dashboard' && '🧩 项目资源看板'}
              </div>
            </div>
            <div className="overlay-content">
              {activeOverlay === 'subtext_analysis' && (
                <div className="insight-detail">
                  <div className="inner-card" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ fontSize: '14px', color: '#818cf8', fontWeight: '700', marginBottom: '8px' }}>深度解析</div>
                    <div style={{ fontSize: '16px', lineHeight: '1.6' }}>
                      对方说“看你方便”，物理层面的意思是“我不想做决定，但如果你不做决定，我会觉得你没诚意”。
                    </div>
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>情绪占比</div>
                    <div style={{ display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ width: '60%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>期待 60%</div>
                      <div style={{ width: '30%', background: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>试探 30%</div>
                      <div style={{ width: '10%', background: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>焦虑 10%</div>
                    </div>
                  </div>
                </div>
              )}
              {activeOverlay === 'comm_simulator' && (
                <div className="report-detail">
                  <div className="inner-card">
                    <div className="link-title">路径 A：直接确认</div>
                    <div className="link-desc">对方会感到被尊重，对话将在 3 轮内结束。</div>
                    <div style={{ marginTop: '8px', color: 'var(--accent-green)' }}>成功率: 92%</div>
                  </div>
                  <div className="inner-card" style={{ marginTop: '12px' }}>
                    <div className="link-title">路径 B：模糊回应</div>
                    <div className="link-desc">对方会继续追问，可能导致对话拉长至 10 轮以上。</div>
                    <div style={{ marginTop: '8px', color: 'var(--accent-orange)' }}>成功率: 45%</div>
                  </div>
                </div>
              )}
              {activeOverlay === 'charisma_radar' && (
                <div className="insight-detail" style={{ textAlign: 'center' }}>
                  <div style={{ width: '200px', height: '200px', margin: '0 auto', background: 'radial-gradient(circle, rgba(172,255,78,0.2) 0%, transparent 70%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100px', height: '100px', border: '2px solid var(--accent-green)', transform: 'rotate(45deg)' }}></div>
                    <div style={{ position: 'absolute', top: '20px', fontSize: '11px' }}>逻辑性</div>
                    <div style={{ position: 'absolute', bottom: '20px', fontSize: '11px' }}>亲和力</div>
                    <div style={{ position: 'absolute', left: '10px', fontSize: '11px' }}>边界感</div>
                    <div style={{ position: 'absolute', right: '10px', fontSize: '11px' }}>幽默感</div>
                  </div>
                  <p style={{ marginTop: '20px', opacity: 0.7 }}>你的“边界感”指标在本次互动后提升了 15%。</p>
                </div>
              )}
              {activeOverlay === 'performance_preview' && (
                <div className="report-detail">
                  <div className="report-stat">
                    <div className="stat-label">明早 9:00 状态预测</div>
                    <div className="stat-value" style={{ color: 'var(--accent-green)' }}>Peak Performance</div>
                  </div>
                  <div className="inner-card" style={{ marginTop: '20px' }}>
                    <div className="link-title">高光时刻预演</div>
                    <div className="link-desc">你将在会议上保持极高的逻辑清晰度，反应速度比平时快 20%。</div>
                  </div>
                  <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '13px', opacity: 0.6, marginBottom: '8px' }}>建议动作</div>
                    <div style={{ fontSize: '14px' }}>• 8:30 喝一杯黑咖啡</div>
                    <div style={{ fontSize: '14px' }}>• 8:45 进行 2 分钟深呼吸</div>
                  </div>
                </div>
              )}
              {activeOverlay === 'future_savings' && (
                <div className="nutrition-receipt">
                  <div className="receipt-header">
                    <div className="receipt-title">Future Value Analysis</div>
                  </div>
                  <div className="receipt-row">
                    <span>当前省下</span>
                    <span>${spendingPrice || '199.00'}</span>
                  </div>
                  <div className="receipt-divider"></div>
                  <div className="receipt-row">
                    <span>1年后 (5% 稳健)</span>
                    <span>${((parseFloat(spendingPrice) || 199) * 1.05).toFixed(2)}</span>
                  </div>
                  <div className="receipt-row">
                    <span>5年后 (8% 增长)</span>
                    <span>${((parseFloat(spendingPrice) || 199) * Math.pow(1.08, 5)).toFixed(2)}</span>
                  </div>
                  <div className="receipt-row" style={{ color: 'var(--accent-green)', fontWeight: '700' }}>
                    <span>10年后 (10% 激进)</span>
                    <span>${((parseFloat(spendingPrice) || 199) * Math.pow(1.1, 10)).toFixed(2)}</span>
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ fontSize: '13px', opacity: 0.6, marginBottom: '12px' }}>消费趋势图</div>
                    <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                      {[40, 70, 45, 90, 65, 30, 85].map((h, i) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 6 ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)', borderRadius: '2px' }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {activeOverlay === 'stress_map' && (
                <div className="insight-detail">
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '14px', opacity: 0.6 }}>当前压力集中点</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#f43f5e' }}>肩颈区域 (High)</div>
                  </div>
                  <div style={{ position: 'relative', width: '200px', height: '300px', margin: '0 auto', background: 'rgba(255,255,255,0.05)', borderRadius: '100px' }}>
                    <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '40px', background: 'rgba(244,63,94,0.6)', borderRadius: '50%', filter: 'blur(15px)' }}></div>
                    <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translateX(-50%)', width: '20px', height: '20px', background: 'rgba(244,63,94,0.3)', borderRadius: '50%', filter: 'blur(10px)' }}></div>
                  </div>
                  <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '24px' }}>执行针对性拉伸</button>
                </div>
              )}
              {activeOverlay === 'heart_rate' && (
                <div className="report-detail" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>🧘</div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>物理回落成功</div>
                  <p style={{ opacity: 0.7, marginTop: '12px' }}>你的副交感神经已重新接管，身体进入修复模式。</p>
                  <div className="inner-card" style={{ marginTop: '24px' }}>
                    <div className="link-title">监测数据</div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', opacity: 0.5 }}>起始</div>
                        <div style={{ fontSize: '18px', fontWeight: '700' }}>88</div>
                      </div>
                      <div style={{ fontSize: '24px', opacity: 0.3 }}>→</div>
                      <div>
                        <div style={{ fontSize: '11px', opacity: 0.5 }}>当前</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-green)' }}>72</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeOverlay === 'recharge_game' && (
                <div className="recipe-detail" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔋</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>情绪充值：物理排解</div>
                  <p style={{ opacity: 0.7, marginBottom: '24px' }}>点击屏幕上的“压力泡泡”来释放焦虑。</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '0 20px' }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="nudge-card clickable" 
                        style={{ height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}
                        onClick={(e) => {
                          e.currentTarget.style.opacity = '0';
                          e.currentTarget.style.transform = 'scale(0.5)';
                          triggerToast();
                        }}
                      >
                        🫧
                      </div>
                    ))}
                  </div>
                  <button className="btn-record btn-primary" style={{ width: 'calc(100% - 40px)', marginTop: '32px', marginInline: '20px' }} onClick={() => setActiveOverlay(null)}>完成充值</button>
                </div>
              )}
              {activeOverlay === 'mastery_tech' && (
                <div className="report-detail">
                  <div className="inner-card">
                    <div className="link-title">技术点 A：核心收紧</div>
                    <div className="link-desc">这是所有动作的物理根基。如果没有核心支撑，末端发力会瞬间崩溃。</div>
                  </div>
                  <div className="inner-card" style={{ marginTop: '12px' }}>
                    <div className="link-title">技术点 B：重心前移</div>
                    <div className="link-desc">通过物理重心的微调，可以减少 30% 的无效体能消耗。</div>
                  </div>
                </div>
              )}
              {activeOverlay === 'mastery_roadmap' && (
                <div className="insight-detail">
                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>专家级动作参数对比</div>
                  <div style={{ height: '150px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', position: 'relative', padding: '20px' }}>
                    <div style={{ position: 'absolute', top: '20%', left: '30%', width: '60px', height: '60px', background: 'rgba(172,255,78,0.2)', borderRadius: '50%', border: '1px solid var(--accent-green)' }}></div>
                    <div style={{ position: 'absolute', top: '40%', left: '50%', width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', border: '1px solid white' }}></div>
                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '10px', opacity: 0.5 }}>绿色: 专家 | 白色: 你</div>
                  </div>
                  <p style={{ marginTop: '20px', fontSize: '13px', opacity: 0.7 }}>你目前的动作标准度为 68%，主要偏差在于“末端发力”的稳定性。</p>
                </div>
              )}
              {activeOverlay === 'interceptor_future' && (
                <div className="report-detail">
                  <div className="inner-card" style={{ background: 'rgba(172,255,78,0.05)' }}>
                    <div className="link-title" style={{ color: 'var(--accent-green)' }}>选项 A：现在停下</div>
                    <div className="link-desc">1 小时后：你会完成那篇报告，心情愉悦，准备享受晚餐。</div>
                  </div>
                  <div className="inner-card" style={{ marginTop: '12px', background: 'rgba(244,63,94,0.05)' }}>
                    <div className="link-title" style={{ color: '#f43f5e' }}>选项 B：继续沉迷</div>
                    <div className="link-desc">1 小时后：你仍在刷手机，颈椎酸痛，伴随强烈的自我厌恶感。</div>
                  </div>
                </div>
              )}
              {activeOverlay === 'resonator_sandbox' && (
                <div className="report-detail">
                  <div className="report-stat">
                    <div className="stat-label">预计对方防御度</div>
                    <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>Medium (45%)</div>
                  </div>
                  <div className="inner-card" style={{ marginTop: '20px' }}>
                    <div className="link-title">模拟反馈：事实引导风格</div>
                    <div className="link-desc">对方更有可能从逻辑层面思考你的建议，而非从情绪层面进行反击。</div>
                  </div>
                </div>
              )}
              {activeOverlay === 'coordination_dashboard' && (
                <div className="insight-detail">
                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>项目资源热力图</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div key={i} style={{ 
                        aspectRatio: '1', 
                        background: i % 5 === 0 ? 'var(--accent-green)' : (i % 3 === 0 ? 'var(--accent-orange)' : 'rgba(255,255,255,0.05)'),
                        borderRadius: '4px'
                      }}></div>
                    ))}
                  </div>
                  <div style={{ marginTop: '20px', fontSize: '12px', opacity: 0.6 }}>
                    绿色: 已完成 | 橙色: 进行中 | 灰色: 待启动
                  </div>
                </div>
              )}
              {activeOverlay === 'refuse_scripts' && (
                <div className="nutrition-receipt">
                  <div className="receipt-header">
                    <div className="receipt-title">Refusal Scripts</div>
                    <div className="receipt-date">Social Boundary Coach</div>
                  </div>
                  <div className="inner-card" style={{ marginBottom: '16px' }}>
                    <div className="link-title">1. 忙碌档 (Busy)</div>
                    <div className="link-desc">“最近手头项目比较紧，实在抽不出时间，下次有机会再聚。”</div>
                    <button className="btn-record btn-secondary" style={{ width: '100%' }} onClick={triggerToast}>复制</button>
                  </div>
                  <div className="inner-card" style={{ marginBottom: '16px' }}>
                    <div className="link-title">2. 没空档 (Unavailable)</div>
                    <div className="link-desc">“那天已经有约了，不好意思啊。祝你们玩得开心！”</div>
                    <button className="btn-record btn-secondary" style={{ width: '100%' }} onClick={triggerToast}>复制</button>
                  </div>
                  <div className="inner-card">
                    <div className="link-title">3. 坚定档 (Firm)</div>
                    <div className="link-desc">“这类活动我最近不太参加，谢谢邀请。希望能理解。”</div>
                    <button className="btn-record btn-secondary" style={{ width: '100%' }} onClick={triggerToast}>复制</button>
                  </div>
                </div>
              )}
              {activeOverlay === 'stress_detail' && (
                <div className="insight-detail">
                  <h3>社交压力分析</h3>
                  <p>根据你最近的社交频率，你的“社交电池”已处于低电量状态。拒绝无效社交可以为你节省：</p>
                  <div className="numbers-grid" style={{ marginTop: '20px' }}>
                    <div className="num-block">
                      <span className="num-label">节省时间</span>
                      <span className="num-val">4.5h</span>
                    </div>
                    <div className="num-block">
                      <span className="num-label">压力缓解</span>
                      <span className="num-val">30%</span>
                    </div>
                  </div>
                  <img src="https://picsum.photos/seed/social/300/200" alt="Social Stress" style={{width: '100%', borderRadius: '12px', marginTop: '20px'}} referrerPolicy="no-referrer" />
                </div>
              )}
              {activeOverlay === 'reply_suggestions' && (
                <div className="instacart-detail">
                  <div className="inner-card" style={{ marginBottom: '16px' }}>
                    <div className="link-title">建议 1：真诚赞美</div>
                    <div className="link-desc">“听起来很有趣，我很期待能更多了解一下。你总是能发现这些特别的点。”</div>
                    <button className="btn-record btn-primary" style={{ width: '100%' }} onClick={triggerToast}>复制</button>
                  </div>
                  <div className="inner-card">
                    <div className="link-title">建议 2：幽默回应</div>
                    <div className="link-desc">“看来我的秘密被你发现了，既然这样，那我就不装了（笑）。”</div>
                    <button className="btn-record btn-primary" style={{ width: '100%' }} onClick={triggerToast}>复制</button>
                  </div>
                </div>
              )}
              {activeOverlay === 'energy_calc' && (
                <div className="report-detail">
                  <div className="report-stat">
                    <div className="stat-label">预计明早状态</div>
                    <div className="stat-value">疲惫 <span className="stat-tag">低效率</span></div>
                  </div>
                  <div className="report-comment">
                    熬夜 15 分钟会导致皮质醇水平在明早 8 点异常升高，从而影响你的专注力。
                  </div>
                  <div className="inner-card">
                    <div className="link-title">补救建议</div>
                    <p>• 睡前不要再看手机<br/>• 喝一小杯温水<br/>• 调低室内温度</p>
                  </div>
                </div>
              )}
              {activeOverlay === 'spending_calc' && (
                <div className="nutrition-receipt">
                  <div className="receipt-header">
                    <div className="receipt-title">Physical Settlement</div>
                  </div>
                  <div className="receipt-row">
                    <span>商品价格</span>
                    <span>$199.00</span>
                  </div>
                  <div className="receipt-row">
                    <span>时薪 (税后)</span>
                    <span>$16.50/h</span>
                  </div>
                  <div className="receipt-divider"></div>
                  <div className="receipt-total">
                    <span>劳动成本</span>
                    <span>12.06 Hours</span>
                  </div>
                  <div className="receipt-row" style={{ marginTop: '12px', color: 'var(--accent-orange)' }}>
                    <span>10年复利损失 (8%)</span>
                    <span>$429.62</span>
                  </div>
                  <div className="receipt-footer" style={{ marginTop: '20px' }}>
                    "Is this item worth 1.5 days of your life?"
                  </div>
                </div>
              )}
              {activeOverlay === 'breathing_guide' && (
                <div className="recipe-detail" style={{ textAlign: 'center' }}>
                  <div className="breathing-circle-wrap">
                    <div className="breathing-circle"></div>
                  </div>
                  <div className="recipe-section" style={{ marginTop: '40px' }}>
                    <h3>箱式呼吸法 (Box Breathing)</h3>
                    <p>1. 吸气 4 秒<br/>2. 屏息 4 秒<br/>3. 呼气 4 秒<br/>4. 屏息 4 秒</p>
                  </div>
                  <button className="btn-record btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setActiveOverlay(null)}>完成练习</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOAST */}
        {showToast && (
          <div className="toast">
            已复制到剪贴板
          </div>
        )}
      </div>
    </div>
  );
}

