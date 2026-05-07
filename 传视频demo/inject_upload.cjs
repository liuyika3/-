const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add new imports
if (!code.includes('Image,')) {
    code = code.replace(/import { Moon, Sun, Salad, ChevronRight, Play, Check, Lock, ShoppingBag, ArrowRight, X, Clock, MapPin, Heart } from 'lucide-react';/,
    `import { Moon, Sun, Salad, ChevronRight, Play, Check, Lock, ShoppingBag, ArrowRight, X, Clock, MapPin, Heart, Image, Plus, Battery, Wifi, Signal } from 'lucide-react';`);
}

// 2. Add page state
if (!code.includes("const [currentPage, setCurrentPage] = useState<'UPLOAD' | 'CHAT'>('UPLOAD');")) {
    code = code.replace(/export default function App\(\) \{/, `export default function App() {\n  const [currentPage, setCurrentPage] = useState<'UPLOAD' | 'CHAT'>('UPLOAD');`);
}

// 3. Add handlePaste
if (!code.includes("const handlePasteOrInput")) {
    code = code.replace(/const \[isSideBarOpen, setIsSideBarOpen\] = useState\(false\);/, `const [isSideBarOpen, setIsSideBarOpen] = useState(false);\n\n  const handlePasteOrInput = (e: React.ChangeEvent<HTMLInputElement> | React.ClipboardEvent<HTMLInputElement>) => {\n    const val = (e.target as HTMLInputElement).value;\n    if (val.trim() !== '') {\n      setTimeout(() => setCurrentPage('CHAT'), 300);\n    }\n  };\n`);
}

// 4. Wrap existing UI in CHAT page condition and add UPLOAD UI
const uploadUI = `
  if (currentPage === 'UPLOAD') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 font-sans">
        <div className="w-full max-w-[375px] h-[812px] bg-[#E7E9EC] overflow-hidden flex flex-col relative sm:rounded-[40px] shadow-2xl ring-1 ring-gray-200">
          
          {/* Status Bar */}
          <div className="flex justify-between items-center px-6 py-4 text-black text-[15px] font-[600] font-['SF_Pro_Text']">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <Signal size={16} strokeWidth={2.5} />
              <Wifi size={16} strokeWidth={2.5} />
              <Battery size={18} strokeWidth={2.5} />
            </div>
          </div>

          <div className="px-5 pt-4 pb-10 flex-1 overflow-y-auto">
            <h1 className="text-[28px] font-[700] text-center text-black leading-[1.2] mt-4 mb-14 font-['SF_Pro_Display']">
              Get what you want right<br/>away
            </h1>

            <div className="mb-12">
              <p className="text-[16px] text-black mb-3 font-['SF_Pro_Text']">Enter text or paste a link</p>
              <div className="bg-[#F8F9FA] rounded-[24px] p-4 flex items-center border border-white shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="w-[2px] h-[20px] bg-[#ACFF4E] mr-1 animate-pulse"></div>
                <input 
                  type="text" 
                  placeholder="Quit coffee, Zen Horizon"
                  className="w-full bg-transparent outline-none text-[16px] font-['Urbanist'] text-black placeholder:text-[rgba(0,0,0,0.3)] caret-transparent"
                  onChange={handlePasteOrInput}
                  onPaste={handlePasteOrInput}
                />
              </div>
            </div>

            <div>
              <p className="text-[16px] text-black mb-6 font-['SF_Pro_Text']">Upload Image</p>
              
              <div className="relative w-[240px] mx-auto h-[300px]">
                {/* Stack 3 (bottom) */}
                <div className="absolute top-0 left-0 w-full h-full bg-[#F2F2F2]/50 rounded-[24px] scale-[0.85] translate-y-12"></div>
                {/* Stack 2 (middle) */}
                <div className="absolute top-0 left-0 w-full h-full bg-[#F2F2F2]/80 rounded-[24px] scale-[0.92] translate-y-6"></div>
                
                {/* Top Card */}
                <div className="absolute top-0 left-0 w-full h-full bg-[#F2F2F2] rounded-[24px] flex flex-col items-center justify-center shadow-sm z-10 border border-white">
                  <div className="relative mb-4">
                    <div className="w-[72px] h-[72px] bg-[#E0E0E0] rounded-[16px] flex items-center justify-center">
                      <Image size={32} color="#BDBDBD" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black rounded-full flex items-center justify-center shadow-md">
                      <Plus size={18} color="#ACFF4E" strokeWidth={3} />
                    </div>
                  </div>
                  <span className="text-[16px] font-[600] text-black mt-2">Upload Image</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // existing app code wrapper
  if (currentPage === 'CHAT') {
`;

// Insert the UPLOAD UI before the main return
if (!code.includes("if (currentPage === 'UPLOAD')")) {
    // Find the first main return statement of App.tsx
    // The structure is roughly:
    // const [isSideBarOpen...]
    // const hasFeatureFlag = ...
    // ...
    // return (
    //   <div className="flex justify-center items-center min-h-screen...
    
    code = code.replace(/return \(\s*<div className="flex justify-center items-center min-h-screen/m, uploadUI + '\nreturn (\n    <div className="flex justify-center items-center min-h-screen');
    
    // We need to close the if (currentPage === 'CHAT') block at the very end.
    code = code.replace(/}\n$/m, '  }\n  return null;\n}\n');
}

fs.writeFileSync('src/App.tsx', code);
console.log("App.tsx modified");
