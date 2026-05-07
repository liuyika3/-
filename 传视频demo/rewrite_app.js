import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const imports = `import { Moon, Sun, Salad, ChevronRight, Play, Check, Lock, ShoppingBag, ArrowRight, X, Clock, MapPin, Heart } from 'lucide-react';\n`;

content = content.replace(/import React, { useState } from 'react';/, `import React, { useState } from 'react';\n${imports}`);

const newRenderSleep = `const renderSleep = () => (
    <div className="flex flex-col gap-4 px-4 pb-8">
      {/* 睡眠评分卡片 (Hero Card like) */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-[18px] font-[590] text-black leading-tight">昨晚睡眠报告</h3>
              <p className="text-[14px] text-[rgba(0,0,0,0.4)] mt-1">根据作息数据生成</p>
            </div>
            <span className="bg-[#FFEBCB] text-[#FF9D00] text-[14px] font-[590] px-2 py-1 rounded-[8px] leading-[18px]">
              评分 58
            </span>
          </div>
          
          <div className="bg-white/50 rounded-[16px] p-3 mt-4 border border-white/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#FF6767] to-[#FFADAD] flex items-center justify-center shrink-0">
                <Moon size={14} color="white" />
              </div>
              <span className="text-[15px] font-[590] text-black">深度睡眠偏低 · 12%</span>
            </div>
            <p className="text-[14px] text-[rgba(0,0,0,0.4)] leading-normal">
              推荐先处理蓝光暴露和入睡延迟，今晚优先把「22:00 断屏」落地。
            </p>
            <button 
              onClick={() => setShowDetail({ type: 'SLEEP_REPORT' })}
              className="mt-3 flex items-center gap-1 text-[14px] font-[590] text-[rgba(0,0,0,0.8)]"
            >
              查看完整分析 <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ASMR Audio Card */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-[16px] bg-gradient-to-b from-black to-[#575757] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.03)] shrink-0">
            <Play size={20} className="text-[#ACFF4E] translate-x-[2px]" />
          </div>
          <div className="flex-1">
            <h3 className="text-[16px] font-[590] text-black">睡前放松音频</h3>
            <p className="text-[14px] text-[rgba(0,0,0,0.4)] mt-1">03:45 · 睡前 10 分钟听</p>
          </div>
        </div>
      </div>

      {/* TODO Checklist */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
        <div className="relative z-10">
          <h3 className="text-[18px] font-[590] text-black mb-1">今晚就能做的 3 件事</h3>
          <p className="text-[14px] text-[rgba(0,0,0,0.4)] mb-4">Matthew Walker 建议的物理重置动作</p>
          
          <div className="flex flex-col gap-3">
            {[
              { time: '22:00', text: '客厅灯光调 10% · 2700K', done: true },
              { time: '23:00', text: 'Kindle 阅读，不碰手机', done: false },
              { time: '23:30', text: '躺下，白噪音 20 min', done: false }
            ].map((item, i) => (
              <div key={i} className="bg-white/50 rounded-[16px] p-3 border border-white/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)] flex gap-3 items-center">
                <div className={\`w-6 h-6 rounded-full border-[2px] flex items-center justify-center shrink-0 \${item.done ? 'bg-gradient-to-b from-black to-[#575757] border-transparent' : 'border-[rgba(0,0,0,0.2)] bg-transparent'}\`}>
                  {item.done && <Check size={14} className="text-[#ACFF4E]" strokeWidth={2.5} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-[510] text-[#00C040] mb-0.5">{item.time}</span>
                  <span className="text-[15px] font-[590] text-black">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sleep Lock CTA */}
      <button 
        onClick={triggerToast}
        className="w-full h-[52px] rounded-[100px] bg-gradient-to-b from-black to-[#575757] flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(0,0,0,0.2)] mt-2 active:scale-95 transition-transform"
      >
        <Lock size={20} className="text-[#ACFF4E]" />
        <span className="text-[#ACFF4E] text-[16px] font-[590]">开启 22:00 睡眠锁</span>
      </button>
    </div>
  );`;

const newRenderMorning = `const renderMorning = () => (
    <div className="flex flex-col gap-4 px-4 pb-8">
      {/* Hero Image Card */}
      <div className="w-full h-[220px] rounded-[24px] relative overflow-hidden shadow-[0_4px_8px_rgba(0,0,0,0.05)] border border-white/50">
        <img src="https://picsum.photos/seed/morning_routine/400/300" className="absolute inset-0 w-full h-full object-cover" alt="Morning" />
        <div className="absolute inset-x-0 top-0 h-[100px]" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-[120px]" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
        <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col gap-2">
          <span className="bg-white/20 backdrop-blur-[12px] border border-white/10 text-white text-[12px] font-[590] px-2 py-1 rounded-[8px] self-start flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-white/20 border border-white/30" />
            @mia.routine
          </span>
          <h3 className="text-white text-[20px] font-[590] leading-[24px]">
            晨间复刻方案
          </h3>
          <p className="text-white/80 text-[14px]">
            按你 {morningDuration} 分钟窗口压缩成最小可执行流程。
          </p>
        </div>
      </div>

      {/* TODO Card */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
        <div className="relative z-10">
          <h3 className="text-[18px] font-[590] text-black mb-1 flex items-center gap-2">
            4 步分解复刻 <span className="text-[12px] font-[400] text-[rgba(0,0,0,0.4)]">(共 {morningDuration} 分钟)</span>
          </h3>
          
          <div className="flex flex-col gap-3 mt-4">
            {[
              { text: '[Step 1] 5:50 自然光闹钟叫醒', time: '5 min', done: true },
              { text: '[Step 2] 冷水洗脸 · 15°C', time: '10 min', done: false },
              { text: '[Step 3] 柠檬温水 300ml', time: '15 min', done: false },
              { text: '[Step 4] 跟 Mia 一起伸展', time: '30 min', done: false }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/50 border border-white/50 rounded-[16px] shadow-[0_4px_8px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3">
                  <div className={\`w-6 h-6 rounded-full border-[2px] flex items-center justify-center shrink-0 \${item.done ? 'bg-gradient-to-b from-black to-[#575757] border-transparent' : 'border-[rgba(0,0,0,0.2)] bg-transparent'}\`}>
                    {item.done && <Check size={14} className="text-[#ACFF4E]" strokeWidth={2.5} />}
                  </div>
                  <span className="text-[15px] font-[590] text-black">{item.text}</span>
                </div>
                <span className="text-[12px] font-[510] text-[rgba(0,0,0,0.4)]">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shopping List Card */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={20} className="text-black" />
            <h3 className="text-[18px] font-[590] text-black">同款单品推荐</h3>
          </div>
          <p className="text-[14px] text-[rgba(0,0,0,0.4)] mb-4">点击直接下单，装备到位。</p>

          <div className="flex flex-col gap-3">
            {[
              { name: 'Philips SmartSleep', price: '¥ 589', platform: '京东', url: 'https://item.jd.com/100008564862.html' },
              { name: 'Osea Ocean Cleanser', price: '¥ 320', platform: 'iHerb', url: 'https://cn.iherb.com/pr/osea-ocean-cleanser-5-fl-oz-150-ml/104562' },
              { name: '日本柠檬 · 6 颗', price: '¥ 48', platform: '盒马', url: 'https://www.freshhema.com' }
            ].map((item, i) => (
              <div 
                key={i} 
                onClick={() => setShowDetail({ type: 'PRODUCT', data: item })}
                className="bg-white/50 rounded-[16px] p-3 border border-white/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)] flex justify-between items-center active:scale-95 transition-transform cursor-pointer"
              >
                <div>
                  <h4 className="text-[15px] font-[590] text-black">{item.name}</h4>
                  <p className="text-[12px] text-[rgba(0,0,0,0.4)] mt-0.5">{item.platform}</p>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-[700] text-[#01C041]">{item.price}</div>
                  <div className="inline-flex items-center gap-1 mt-1 bg-[#C9EFD6] text-[#01C041] px-2 py-0.5 rounded-[6px] text-[10px] font-[600]">
                    购买 <ChevronRight size={10} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );`;

const newRenderHealth = `const renderHealth = () => (
    <div className="flex flex-col gap-4 px-4 pb-8">
      {/* Restaurant List */}
      <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
        <div className="relative z-10">
          <h3 className="text-[18px] font-[590] text-black mb-1">今日推荐健康外食</h3>
          <p className="text-[14px] text-[rgba(0,0,0,0.4)] mb-4">按清淡、蛋白密度和可持续度筛选。</p>
          
          <div className="flex flex-col gap-3">
            {[
              { name: 'Wagas (嘉里中心店)', tag: '低 GI · 推荐沙拉', distance: '450m' },
              { name: '新元素 Element Fresh', tag: '高蛋白 · 能量碗', distance: '800m' },
              { name: 'gaga (万象城店)', tag: '轻食 · 鲜果茶', distance: '1.2km' }
            ].map((item, i) => (
              <div key={i} className="bg-white/50 rounded-[16px] p-3 border border-white/50 shadow-[0_8px_16px_rgba(0,0,0,0.03)] flex gap-3 relative">
                <img src={\`https://picsum.photos/seed/food\${i}/80/80\`} className="w-[60px] h-[60px] rounded-[12px] object-cover shrink-0" alt="" />
                <div className="flex flex-col justify-center flex-1">
                  <h4 className="text-[15px] font-[590] text-black leading-tight mb-1">{item.name}</h4>
                  <span className="bg-[#D8EEFF] text-[#1E9EFF] text-[12px] font-[590] px-2 py-0.5 rounded-[6px] self-start">
                    {item.tag}
                  </span>
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-1 text-[12px] text-[rgba(0,0,0,0.4)] font-[510]">
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
        <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Salad size={20} className="text-black" />
            <h3 className="text-[18px] font-[590] text-black">万能外食点餐公式</h3>
          </div>
          <p className="text-[14px] text-[rgba(0,0,0,0.4)] mb-4">视频核心：无论去哪家店，按这个顺序点。</p>
          
          <div className="flex flex-col gap-2">
            {[
              '1. 先点一份绿叶菜 (纤维垫底)',
              '2. 选择优质蛋白质 (煎/烤/煮)',
              '3. 碳水减半 (换成糙米或红薯)',
              '4. 酱料分装 (只蘸不拌)'
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/50 border border-white/50 rounded-[12px]">
                <div className="w-2 h-2 rounded-full bg-[#00C040] shrink-0" />
                <span className="text-[14px] font-[510] text-black">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Propose */}
      <button 
        onClick={triggerToast}
        className="w-full h-[52px] rounded-[100px] bg-gradient-to-b from-[#1A9CFF] to-[#92D7FF] flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(26,156,255,0.3)] mt-2 active:scale-95 transition-transform"
      >
        <span className="text-white text-[16px] font-[590]">开启「健康外食」监督</span>
      </button>
    </div>
  );`;

// Let's replace the functions
content = content.replace(/const renderSleep = \(\) => \([\s\S]*?(?=const renderMorning)/, newRenderSleep + '\n\n  ');
content = content.replace(/const renderMorning = \(\) => \([\s\S]*?(?=const renderHealth)/, newRenderMorning + '\n\n  ');
content = content.replace(/const renderHealth = \(\) => \([\s\S]*?(?=const renderDetailView)/, newRenderHealth + '\n\n  ');

// Fix sharing flow background to match light mode
const newRenderSharingFlow = `const renderSharingFlow = () => {
    if (isProcessing) {
      const currentVideo = coach && coach in videoData ? videoData[coach as keyof typeof videoData] : null;
      const steps = coach && coach in processingSteps ? processingSteps[coach as keyof typeof processingSteps] : [];
      return (
        <div className="absolute inset-0 bg-[#E7E9EC] z-[500] flex flex-col items-center pt-[72px]">
          <div className="w-[82%] max-w-[320px] bg-white/60 border border-black/10 rounded-[18px] overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur-[10px]">
            <div className="h-[92px] relative bg-cover bg-center" style={{ backgroundImage: \`url(\${currentVideo?.thumbnail})\` }}>
              <div className="absolute inset-0 flex items-center justify-center text-white text-[22px]" style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 60%, transparent 72%)' }}>▶</div>
            </div>
            <div className="p-[10px_12px] bg-[#ACFF4E]/85 text-[#0b0b0b] text-[12px] font-[900]">
              {currentVideo?.title}
            </div>
          </div>
          <div className="w-[82%] max-w-[320px] text-right mt-1 text-[10px] text-black/35 font-[510]">Just now</div>

          <div className="flex-1 w-full px-6 flex flex-col">
            <div className="flex items-center gap-2 mt-4 mb-4">
              <div className="w-12 h-12 rounded-[16px] bg-[url('/bunny-thinking.png')] bg-cover bg-center shadow-[0_8px_16px_rgba(0,0,0,0.1)]"></div>
              <div className="text-[11px] tracking-[1.5px] font-[800] text-black/50">JOVIDA THINKING</div>
            </div>

            <h2 className="text-[24px] font-[800] tracking-tight text-black mt-2">正在生成推送...</h2>
            <p className="text-[13px] text-black/40 mt-1 mb-6">大约需要 20 秒</p>

            <div className="relative pl-5 flex flex-col gap-5">
              <div className="absolute left-[9px] top-2 bottom-4 w-1 bg-[#ACFF4E]/90 rounded-full" />
              {steps.map((label, idx) => {
                const done = idx < processingStep;
                const active = idx === processingStep;
                const visible = idx <= processingStep;
                return (
                  <div key={idx} className={\`flex items-start gap-3 transition-all duration-300 \${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}\`}>
                    <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 -ml-[21px] shadow-[0_4px_8px_rgba(0,0,0,0.05)] \${done ? 'bg-[#ACFF4E] border-[#ACFF4E] text-black' : active ? 'bg-white border-[#ACFF4E]' : 'bg-white/80 border-[#ACFF4E]/40'}\`}>
                      {done ? <Check size={12} strokeWidth={3} /> : ''}
                    </div>
                    <div className={\`text-[14px] font-[700] \${active || done ? 'text-black/80' : 'text-black/30'}\`}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 bg-[#E7E9EC] z-[500] flex flex-col items-center justify-center p-6">
        <button 
          onClick={() => startSharing(coach!)}
          className="w-[100px] h-[100px] rounded-[32px] bg-white/50 border-2 border-dashed border-black/10 flex items-center justify-center text-[40px] text-black/20 hover:border-black/30 hover:text-black/40 transition-all shadow-[0_8px_16px_rgba(0,0,0,0.03)]"
        >
          <span className="mb-2">+</span>
        </button>
        
        {coach === 'MORNING' && (
          <div className="w-[80%] mt-8 text-center">
            <div className="text-black text-[14px] mb-4 font-[510]">
              你的晨间居家时间: <span className="text-[#01C041] font-[700]">{morningDuration} 分钟</span>
            </div>
            <input 
              type="range" 
              min="15" 
              max="180" 
              step="5"
              value={morningDuration}
              onChange={(e) => setMorningDuration(parseInt(e.target.value))}
              className="w-full accent-[#01C041]"
            />
            <div className="flex justify-between text-[10px] text-black/40 mt-2 font-[590]">
              <span>15m</span>
              <span>3h</span>
            </div>
          </div>
        )}

        <div className="mt-8 text-center px-4">
          <h2 className="text-black text-[20px] font-[700] mb-2">
            {coach === 'SLEEP' ? '学睡好觉' : coach === 'MORNING' ? '复刻 Morning Routine' : '健康外食指南'}
          </h2>
          <p className="text-black/50 text-[14px] leading-relaxed max-w-[240px] mx-auto">
            {coach === 'SLEEP' ? '点击分享 YouTube 视频链接，Jovida 为你拆解行动方案' : coach === 'MORNING' ? '点击分享 Instagram 视频，一键复刻博主同款生活' : '点击分享视频链接，Jovida 为你定制健康点餐方案'}
          </p>
        </div>
      </div>
    );
  };`;

content = content.replace(/const renderSharingFlow = \(\) => \{[\s\S]*?(?=return \(\n    <div className="demo-container">)/, newRenderSharingFlow + '\n\n  ');

// Fix global app styling dynamically when 3 cases are active
// Instead of editing index.css, I can inject Tailwind styling onto .phone 
content = content.replace(/className="phone"/, 'className={`phone ${isLifestyleCoach ? \'bg-[#E7E9EC] text-black border-white shadow-[0_20px_40px_rgba(0,0,0,0.1)]\' : \'\'}`}');

// Also update the status bar color when lifestyle
content = content.replace(/<div className="status-bar">/, '<div className={`status-bar ${isLifestyleCoach ? \'text-black [&_svg]:fill-black\' : \'text-white [&_svg]:fill-white\'}`}>');

// Top gradient hide if lifestyle
content = content.replace(/<div className="top-gradient"><\/div>/, '{!isLifestyleCoach && <div className="top-gradient"></div>}');

// Header style
content = content.replace(/className="header"/, 'className={`header ${isLifestyleCoach ? \'text-black\' : \'\'}`}');

// Coach message color
content = content.replace(/<div className="coach-text">/, '<div className={`coach-text ${isLifestyleCoach ? \'!text-black\' : \'\'}`}>');

// Chat input bar at bottom
content = content.replace(/<div className="chat-wrap">/, '<div className={`chat-wrap ${isLifestyleCoach ? \'!bg-white/80 border-t border-black/5 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]\' : \'\'}`}>');
content = content.replace(/<div className="chat-input">/, '<div className={`chat-input ${isLifestyleCoach ? \'!bg-[#F2F2F2] !border-black/5\' : \'\'}`}>');
content = content.replace(/className="mic-icon"/, 'className={`mic-icon ${isLifestyleCoach ? \'!opacity-40\' : \'\'}`}');
content = content.replace(/className="chat-placeholder"/, 'className={`chat-placeholder ${isLifestyleCoach ? \'!text-black/40\' : \'\'}`}');
content = content.replace(/className="send-btn"/, 'className={`send-btn ${isLifestyleCoach ? \'!bg-[#ACFF4E] !text-black shadow-sm\' : \'\'}`}');
content = content.replace(/className="home-indicator"/, 'className={`home-indicator ${isLifestyleCoach ? \'!bg-black !opacity-20\' : \'\'}`}');

// Write back to App.tsx
fs.writeFileSync('src/App.tsx', content);

