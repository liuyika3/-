import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Revert button gradients and radius
content = content.replace(/bg-black flex items-center justify-center/g, 'bg-gradient-to-b from-black to-[#575757] flex items-center justify-center');
content = content.replace(/w-full h-\[52px\] rounded-\[32px\]/g, 'w-full h-12 rounded-[100px]');
content = content.replace(/w-full h-\[56px\] rounded-\[32px\]/g, 'w-full h-12 rounded-[100px]');

// CTA text should use ACFF4E
// Fix send-btn back to how it was or keep it if it fits
content = content.replace(/!bg-\[\#ACFF4E\] !text-black flex items-center justify-center !w-\[36px\] !h-\[36px\] !rounded-full shadow-\[0_4px_12px_rgba\(172,255,78,0\.4\)\]/g, '!bg-gradient-to-b !from-black !to-[#575757] !text-[#ACFF4E] shadow-sm');
content = content.replace(/!bg-\[\#ACFF4E\] !text-black shadow-sm/g, '!bg-gradient-to-b !from-black !to-[#575757] !text-[#ACFF4E] shadow-sm');

// Fix card outer border and shadow back to rules
content = content.replace(/border-white shadow-\[0_8px_24px_rgba\(0,0,0,0\.04\)\]/g, 'border-white/50 shadow-[0_4px_8px_rgba(0,0,0,0.05)]');

// Fix sub-cards back to rules
content = content.replace(/bg-white rounded-\[16px\] p-3 border border-white shadow-\[0_4px_12px_rgba\(0,0,0,0\.03\)\]/g, 'bg-white/50 rounded-[16px] p-3 border border-white/50');
content = content.replace(/bg-white rounded-\[16px\] p-3 border border-white shadow-\[0_4px_12px_rgba\(0,0,0,0\.03\)\] shadow-\[0_8px_16px_rgba\(0,0,0,0\.03\)\]/g, 'bg-white/50 rounded-[16px] p-3 border border-white/50');

// Inner borders check
content = content.replace(/border border-white/g, 'border border-white/50');
// Some might have become border border-white/50/50, let's fix
content = content.replace(/border border-white\/50\/50/g, 'border border-white/50');

fs.writeFileSync('src/App.tsx', content);
