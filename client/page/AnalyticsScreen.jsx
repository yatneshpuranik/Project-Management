import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchBoards } from '../redux/boardSlice';
import axiosInstance from '../utils/axiosInstance';
import { HiOutlineTrendingUp, HiOutlineChartBar, HiOutlineCheckCircle, HiOutlineClock, HiOutlineChevronDown } from 'react-icons/hi';
import { toast } from '../utils/toast';

const AnalyticsScreen = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { boards, currentBoard } = useSelector((state) => state.boards);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentBoard?._id) {
      toast.error('Please select a workspace first.');
      navigate('/boards');
    }
  }, [currentBoard, navigate]);

  useEffect(() => {
    dispatch(fetchBoards());
  }, [dispatch]);

  useEffect(() => {
    if (currentBoard?._id && selectedBoardId !== currentBoard._id) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setSelectedBoardId(currentBoard._id);
    } else if (boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(boards[0]._id);
    }
  }, [boards, currentBoard, selectedBoardId]);

  useEffect(() => {
    if (!selectedBoardId) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(`/analytics/board/${selectedBoardId}`);
        setAnalytics(response.data.analytics);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedBoardId]);

  if (boards.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-[32px] border border-dashed border-white/10 bg-slate-950/90 p-12 text-center text-slate-300 shadow-2xl">
          <p className="text-lg font-semibold text-white">No boards found</p>
          <p className="mt-3 text-sm text-slate-400">Create a board workspace first to track performance metrics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-3xl bg-slate-950/80 px-8 py-6 text-xl font-semibold shadow-2xl shadow-slate-950/40">
          Loading analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-3xl bg-slate-950/80 px-8 py-6 text-xl font-semibold text-rose-500 shadow-2xl shadow-slate-950/40">
          Error: {error}
        </div>
      </div>
    );
  }

  // Draw Line Chart dynamically
  let guidelinePath = '';
  let actualPath = '';
  let areaPath = '';
  let maxVal = 1;
  const getX = (index) => 40 + index * 70;
  const getY = (val) => 180 - (val / maxVal) * 160;

  if (analytics?.burnDown && analytics.burnDown.length > 0) {
    maxVal = Math.max(...analytics.burnDown.map(d => Math.max(d.remaining, d.guideline)), 1);
    guidelinePath = `M ${getX(0)} ${getY(analytics.burnDown[0].guideline)} L ${getX(6)} ${getY(analytics.burnDown[6].guideline)}`;
    const actualPoints = analytics.burnDown.map((d, idx) => `${getX(idx)} ${getY(d.remaining)}`);
    actualPath = `M ${actualPoints.join(' L ')}`;
    areaPath = `${actualPath} L ${getX(6)} 180 L ${getX(0)} 180 Z`;
  }

  // Draw Donut Chart dynamically
  const circumference = 408;
  const highPct = analytics?.workloadDistribution?.high?.percentage || 0;
  const medPct = analytics?.workloadDistribution?.medium?.percentage || 0;
  const lowPct = analytics?.workloadDistribution?.low?.percentage || 0;

  const highOffset = circumference - (highPct / 100) * circumference;
  const medOffset = circumference - (medPct / 100) * circumference;
  const lowOffset = circumference - (lowPct / 100) * circumference;

  const medRotation = (highPct / 100) * 360;
  const lowRotation = ((highPct + medPct) / 100) * 360;

  return (
    <div className="space-y-6">
      {/* Header Block */}
      <header className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-400">Workspace Analytics</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Performance Metrics</h1>
          <p className="mt-1 text-xs text-slate-400">
            Track sprint progress, task velocity, cycle time, and workload distribution.
          </p>
        </div>

        {/* Dropdown Selector */}
        <div className="relative min-w-[200px] self-start sm:self-auto">
          <select
            value={selectedBoardId}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 pr-10 text-xs text-white outline-none focus:border-sky-500 transition cursor-pointer font-semibold"
          >
            {boards.map((board) => (
              <option key={board._id} value={board._id}>
                {board.title}
              </option>
            ))}
          </select>
          <HiOutlineChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </header>

      {analytics && analytics.totalTasks === 0 ? (
        <div className="rounded-[32px] border border-dashed border-white/10 bg-slate-900/20 p-12 text-center text-slate-300 shadow-2xl backdrop-blur-sm">
          <p className="text-base font-semibold text-white">No tasks in this workspace</p>
          <p className="mt-2 text-xs text-slate-400">Add tasks on the Kanban board to start calculating metrics.</p>
        </div>
      ) : (
        analytics && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Completion Rate</span>
                  <HiOutlineCheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-white">{analytics.completionRate}%</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Tasks completed this sprint</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Avg. Velocity</span>
                  <HiOutlineTrendingUp className="h-5 w-5 text-sky-400" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-white">{analytics.velocity}</span>
                  <span className="text-xs text-sky-400 font-semibold">tasks/week</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Story points completed avg</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Cycle Time</span>
                  <HiOutlineClock className="h-5 w-5 text-purple-400" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-white">{analytics.cycleTime}d</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">From creation to completion</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Active Backlog</span>
                  <HiOutlineChartBar className="h-5 w-5 text-amber-400" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-white">{analytics.activeBacklog}</span>
                  <span className="text-xs text-amber-400 font-semibold">tasks left</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Currently in Todo / Progress</p>
              </div>
            </div>

            {/* Visual Analytics Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Sprint Burn Down (Line Chart) */}
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Sprint Burn Down</h3>
                  <p className="text-[10px] text-slate-400">Remaining effort compared to guidelines.</p>
                </div>

                {/* Dynamic SVG Line Chart */}
                <div className="mt-6 h-60 w-full relative">
                  <svg viewBox="0 0 500 200" className="w-full h-full text-slate-700">
                    {/* Guidelines */}
                    {guidelinePath && (
                      <path
                        d={guidelinePath}
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="4 4"
                        strokeWidth="2"
                        fill="none"
                      />
                    )}

                    {/* Actual Trend Area */}
                    {areaPath && (
                      <path
                        d={areaPath}
                        fill="url(#areaGradient)"
                        className="opacity-25"
                      />
                    )}
                    {actualPath && (
                      <path
                        d={actualPath}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Data points */}
                    {analytics.burnDown?.map((d, idx) => (
                      <circle
                        key={idx}
                        cx={getX(idx)}
                        cy={getY(d.remaining)}
                        r="4"
                        className="fill-sky-400 stroke-slate-950 stroke-2"
                      />
                    ))}

                    {/* X-axis Labels */}
                    {analytics.burnDown?.map((d, idx) => (
                      <text
                        key={idx}
                        x={getX(idx)}
                        y="195"
                        textAnchor="middle"
                        className="fill-slate-500 text-[9px] font-medium"
                      >
                        {d.dayLabel}
                      </text>
                    ))}

                    {/* Y-axis Labels */}
                    <text x="30" y="24" textAnchor="end" className="fill-slate-500 text-[9px] font-medium">{maxVal}</text>
                    <text x="30" y="104" textAnchor="end" className="fill-slate-500 text-[9px] font-medium">{Math.round(maxVal / 2)}</text>
                    <text x="30" y="184" textAnchor="end" className="fill-slate-500 text-[9px] font-medium">0</text>

                    {/* Chart Gradients */}
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                    </defs>

                    {/* Axes & Grid Lines */}
                    <line x1="40" y1="180" x2="460" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <line x1="40" y1="20" x2="40" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  </svg>

                  {/* Legend overlay */}
                  <div className="absolute top-2 right-2 flex gap-4 text-[9px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-white/20 rounded-full inline-block"></span> Guideline</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-sky-500 rounded-full inline-block"></span> Remaining Tasks</span>
                  </div>
                </div>
              </div>

              {/* Task Allocations (Circle Progress Chart) */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Workload Distribution</h3>
                  <p className="text-[10px] text-slate-400">Tasks allocation by priority.</p>
                </div>

                <div className="mt-4 flex flex-col items-center justify-center relative">
                  <svg width="160" height="160" className="transform -rotate-90">
                    {/* Underlay */}
                    <circle cx="80" cy="80" r="65" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="16" fill="transparent" />

                    {/* High Priority (Red) */}
                    {highPct > 0 && (
                      <circle cx="80" cy="80" r="65" stroke="#f43f5e" strokeWidth="16" fill="transparent"
                        strokeDasharray={circumference} strokeDashoffset={highOffset} strokeLinecap="round" />
                    )}

                    {/* Medium Priority (Yellow) */}
                    {medPct > 0 && (
                      <circle cx="80" cy="80" r="65" stroke="#eab308" strokeWidth="16" fill="transparent"
                        strokeDasharray={circumference} strokeDashoffset={medOffset}
                        className="transform origin-center" style={{ transform: `rotate(${medRotation}deg)` }} strokeLinecap="round" />
                    )}

                    {/* Low Priority (Green) */}
                    {lowPct > 0 && (
                      <circle cx="80" cy="80" r="65" stroke="#10b981" strokeWidth="16" fill="transparent"
                        strokeDasharray={circumference} strokeDashoffset={lowOffset}
                        className="transform origin-center" style={{ transform: `rotate(${lowRotation}deg)` }} strokeLinecap="round" />
                    )}
                  </svg>

                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">{analytics.workloadDistribution.totalAssigned}</span>
                    <span className="text-[9px] text-slate-400">Assigned Tasks</span>
                  </div>
                </div>

                {/* Priority Legend */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-slate-400 text-center">
                  <div className="rounded-lg bg-slate-900/50 p-2 border border-white/5">
                    <span className="block h-2 w-2 rounded-full bg-rose-500 mx-auto mb-1"></span>
                    <span className="font-semibold text-white">{highPct}% High</span>
                  </div>
                  <div className="rounded-lg bg-slate-900/50 p-2 border border-white/5">
                    <span className="block h-2 w-2 rounded-full bg-amber-500 mx-auto mb-1"></span>
                    <span className="font-semibold text-white">{medPct}% Med</span>
                  </div>
                  <div className="rounded-lg bg-slate-900/50 p-2 border border-white/5">
                    <span className="block h-2 w-2 rounded-full bg-emerald-500 mx-auto mb-1"></span>
                    <span className="font-semibold text-white">{lowPct}% Low</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
};

export default AnalyticsScreen;
