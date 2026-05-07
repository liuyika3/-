import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const newRenderDetailView = `const renderDetailView = () => {
    if (!showDetail) return null;

    return (
      <div className="absolute inset-0 bg-[#E7E9EC] z-[1000] flex flex-col text-black animation-slide-in">
        <div className="flex items-center gap-4 px-5 pt-12 pb-4 border-b border-black/5">
          <div className="text-[24px] cursor-pointer" onClick={() => setShowDetail(null)}>
            <ChevronRight className="rotate-180" size={24} />
          </div>
          <div className="font-[590] text-[17px]">{showDetail.type === 'SLEEP_REPORT' ? '睡眠锐评报告' : '商品详情'}</div>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 pb-12">
          {showDetail.type === 'SLEEP_REPORT' ? (
            <div className="flex flex-col gap-4">
              <div className="text-[24px] font-[800] mb-2 font-['Urbanist']">评分: <span className="text-[#FF6767]">58</span></div>
              <div className="flex flex-col gap-4">
                <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
                  <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-[15px] font-[590] mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FF6767]" />深度睡眠严重不足</div>
                    <div className="text-[13px] text-black/40">Matthew Walker 标准: 20-25% | 你的数据: 12%</div>
                    <div className="mt-3 h-2 bg-black/5 rounded-full overflow-hidden">
                      <div className="w-[40%] h-full bg-[#FF6767] rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
                  <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-[15px] font-[590] mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FFADAD]" />入睡潜伏期过长</div>
                    <div className="text-[13px] text-black/40">平均耗时 45 分钟才进入第一阶段睡眠。</div>
                  </div>
                </div>
                <div className="bg-[#F2F2F2] rounded-[24px] p-4 relative">
                  <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
                  <div className="relative z-10">
                    <div className="text-[15px] font-[590] mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00C040]" />睡眠一致性</div>
                    <div className="text-[13px] text-black/40">过去 3 天入睡时间偏差在 15min 内，表现不错。</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center mt-8">
              <div className="w-full h-[250px] bg-[#F2F2F2] rounded-[24px] mb-6 flex items-center justify-center relative">
                <div aria-hidden className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)] pointer-events-none" />
                <ShoppingBag size={64} className="text-black/20" />
              </div>
              <div className="text-[20px] font-[590] mb-2">{showDetail.data.name}</div>
              <div className="text-[28px] font-[800] text-[#00C040] font-['Urbanist'] mb-6">{showDetail.data.price}</div>
              <div className="text-[14px] text-black/50 mb-10 leading-relaxed px-4">
                这是博主 @mia.routine 在视频中强烈推荐的单品。Jovida 已为你匹配了 {showDetail.data.platform} 的最优惠链接。
              </div>
              <a 
                href={showDetail.data.url} 
                target="_blank" 
                rel="noreferrer"
                className="w-full h-[56px] rounded-[100px] bg-gradient-to-b from-black to-[#575757] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.2)] active:scale-95 transition-transform decoration-transparent"
              >
                <span className="text-[#ACFF4E] text-[16px] font-[590]">前往 {showDetail.data.platform} 购买</span>
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };`;

content = content.replace(/const renderDetailView = \(\) => \{[\s\S]*?(?=const renderSharingFlow)/, newRenderDetailView + '\n\n  ');

fs.writeFileSync('src/App.tsx', content);
