const OverviewCharts = ({ growth = [] }) => {
  let maxCount = 1;
  let growthPoints = [];
  let growthLabels = [];
  
  if (growth && growth.length > 0) {
    maxCount = Math.max(...growth.map(g => g.count), 1);
    growthPoints = growth.map((g, idx) => `${40 + idx * 60},${140 - (g.count / maxCount) * 100}`);
    growthLabels = growth.map((g, idx) => ({ label: g.dayLabel, x: 40 + idx * 60 }));
  }

  return (
    <div className="premium-card premium-card-hover space-y-4">
      <div>
        <h3 className="text-sm font-bold text-white">Platform Registrations Growth</h3>
        <p className="text-[10px] text-slate-500">New user accounts created during the last 7 days.</p>
      </div>
      <div className="h-48 w-full bg-slate-950/60 rounded-2xl p-3 border border-white/6 relative">
        {growth && growth.length > 0 ? (
          <svg viewBox="0 0 440 160" className="w-full h-full text-slate-800">
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(56, 189, 248, 0.25)" />
                <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
              </linearGradient>
            </defs>
            <line x1="30" y1="140" x2="420" y2="140" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="30" y1="40" x2="420" y2="40" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            {growthPoints.length > 0 && (
              <>
                <path
                  d={`M ${growthPoints[0].split(',')[0]} 140 L ${growthPoints.join(' L ')} L ${growthPoints[growthPoints.length - 1].split(',')[0]} 140 Z`}
                  fill="url(#growthGrad)"
                />
                <path
                  d={`M ${growthPoints.join(' L ')}`}
                  fill="none"
                  stroke="#39BDF8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {growth.map((g, idx) => (
                  <circle
                    key={idx}
                    cx={40 + idx * 60}
                    cy={140 - (g.count / maxCount) * 100}
                    r="3.5"
                    className="fill-[#39BDF8] stroke-slate-950 stroke-1.5"
                  />
                ))}
              </>
            )}
            {growthLabels.map((l, idx) => (
              <text key={idx} x={l.x} y="155" textAnchor="middle" className="fill-slate-550 text-[8px] font-bold">{l.label}</text>
            ))}
            <text x="25" y="44" textAnchor="end" className="fill-slate-550 text-[8px] font-bold">{maxCount}</text>
            <text x="25" y="144" textAnchor="end" className="fill-slate-550 text-[8px] font-bold">0</text>
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-slate-650">
            No registration history available.
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewCharts;
