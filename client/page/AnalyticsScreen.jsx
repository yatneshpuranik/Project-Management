import React from 'react';
import { HiOutlineTrendingUp, HiOutlineChartBar, HiOutlineCheckCircle, HiOutlineClock } from 'react-icons/hi';

const AnalyticsScreen = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-400">Workspace Analytics</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Performance Metrics</h1>
        <p className="mt-1 text-xs text-slate-400">
          Track sprint progress, task velocity, cycle time, and workload distribution.
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Completion Rate</span>
            <HiOutlineCheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white">87.5%</span>
            <span className="text-xs text-emerald-400 font-semibold">+4.2%</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Tasks completed this sprint</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Avg. Velocity</span>
            <HiOutlineTrendingUp className="h-5 w-5 text-sky-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white">24.8</span>
            <span className="text-xs text-sky-400 font-semibold">pts/week</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Story points completed avg</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Cycle Time</span>
            <HiOutlineClock className="h-5 w-5 text-purple-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white">3.4d</span>
            <span className="text-xs text-emerald-400 font-semibold">-1.1d</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">From creation to completion</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Active Backlog</span>
            <HiOutlineChartBar className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white">14</span>
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
          
          {/* Beautiful Interactive Line Chart */}
          <div className="mt-6 h-60 w-full relative">
            <svg viewBox="0 0 500 200" className="w-full h-full text-slate-700">
              {/* Guidelines */}
              <line x1="40" y1="20" x2="460" y2="180" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" strokeWidth="2" />
              
              {/* Actual Trend Area */}
              <path 
                d="M 40 20 L 110 50 L 180 95 L 250 110 L 320 120 L 390 145 L 460 180" 
                fill="none" 
                stroke="url(#lineGradient)" 
                strokeWidth="3.5" 
                strokeLinecap="round"
              />
              
              <path 
                d="M 40 20 L 110 50 L 180 95 L 250 110 L 320 120 L 390 145 L 460 180 L 460 180 L 40 180 Z" 
                fill="url(#areaGradient)" 
                className="opacity-25"
              />

              {/* Data points */}
              <circle cx="110" cy="50" r="4" className="fill-sky-400 stroke-slate-950 stroke-2" />
              <circle cx="180" cy="95" r="4" className="fill-sky-400 stroke-slate-950 stroke-2" />
              <circle cx="250" cy="110" r="4" className="fill-sky-400 stroke-slate-950 stroke-2" />
              <circle cx="320" cy="120" r="4" className="fill-sky-400 stroke-slate-950 stroke-2" />
              <circle cx="390" cy="145" r="4" className="fill-sky-400 stroke-slate-950 stroke-2" />

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
              <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-sky-500 rounded-full inline-block"></span> Remaining Task Count</span>
            </div>
          </div>
        </div>

        {/* Task Allocations (Circle Progress Chart) */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Workload Distribution</h3>
            <p className="text-[10px] text-slate-400">Story points allocation by priority.</p>
          </div>

          <div className="mt-4 flex flex-col items-center justify-center relative">
            <svg width="160" height="160" className="transform -rotate-90">
              {/* Underlay */}
              <circle cx="80" cy="80" r="65" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="16" fill="transparent" />
              
              {/* High Priority (Red) */}
              <circle cx="80" cy="80" r="65" stroke="#f43f5e" strokeWidth="16" fill="transparent"
                strokeDasharray="408" strokeDashoffset="280" strokeLinecap="round" />
              
              {/* Medium Priority (Yellow) */}
              <circle cx="80" cy="80" r="65" stroke="#eab308" strokeWidth="16" fill="transparent"
                strokeDasharray="408" strokeDashoffset="310" className="transform origin-center rotate-[110deg]" strokeLinecap="round" />

              {/* Low Priority (Green) */}
              <circle cx="80" cy="80" r="65" stroke="#10b981" strokeWidth="16" fill="transparent"
                strokeDasharray="408" strokeDashoffset="260" className="transform origin-center rotate-[210deg]" strokeLinecap="round" />
            </svg>
            
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">42</span>
              <span className="text-[9px] text-slate-400">Total Points</span>
            </div>
          </div>

          {/* Priority Legend */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-slate-400 text-center">
            <div className="rounded-lg bg-slate-900/50 p-2 border border-white/5">
              <span className="block h-2 w-2 rounded-full bg-rose-500 mx-auto mb-1"></span>
              <span className="font-semibold text-white">35% High</span>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-2 border border-white/5">
              <span className="block h-2 w-2 rounded-full bg-amber-500 mx-auto mb-1"></span>
              <span className="font-semibold text-white">25% Med</span>
            </div>
            <div className="rounded-lg bg-slate-900/50 p-2 border border-white/5">
              <span className="block h-2 w-2 rounded-full bg-emerald-500 mx-auto mb-1"></span>
              <span className="font-semibold text-white">40% Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsScreen;
