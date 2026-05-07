import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix badge style
content = content.replace(/className="badge"/g, 'className={`badge ${isLifestyleCoach ? \'!bg-black/5 !border-black/10 !text-black\' : \'\'}`}');

// Fix goal-chip style
content = content.replace(/className="goal-chip"/g, 'className={`goal-chip ${isLifestyleCoach ? \'!bg-white/60 !border-white !text-black shadow-sm\' : \'\'}`}');

// Fix add-btn style
content = content.replace(/className="add-btn"/g, 'className={`add-btn ${isLifestyleCoach ? \'!text-black/50\' : \'\'}`}');

// Fix side toggle button if needed (maybe it's fine since it's global outside .phone)
// .sidebar-toggle is outside .phone, so its colors are fine.

fs.writeFileSync('src/App.tsx', content);
