import { useState } from 'react';

/**
 * DashboardNav - Selection buttons for different dashboard views
 */
const DashboardNav = () => {
  const tabs = ['General', 'Questions', 'Test', 'Videos', 'Courses'];
  const [activeTab, setActiveTab] = useState('General');

  return (
    <nav className="flex overflow-x-auto gap-2 py-2 no-scrollbar" aria-label="Dashboard sections">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
            activeTab === tab
              ? 'bg-(--brand-yellow) text-(--bg-primary) border-(--brand-yellow)'
              : 'bg-(--bg-surface-2) text-(--text-secondary) border-transparent hover:bg-(--bg-hover)'
          }`}
          aria-current={activeTab === tab ? 'page' : undefined}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
};

/**
 * ActivityTracker - GitHub-style contribution graph stub
 * Shows daily metrics and streak
 */
const ActivityTracker = () => {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const timeRanges = ['Daily', 'Weekly', 'Monthly', 'Annually'];
  const [activeRange, setActiveRange] = useState('Daily');
  
  return (
    <div className="bg-(--bg-surface) rounded-2xl p-5 shadow-sm border border-(--border-subtle) w-full mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-(--text-primary)">Activity</h3>
        <div className="text-xs font-medium">
           <span className="text-(--text-muted)">Streak: </span>
           <span className="text-(--brand-yellow)">5 days</span>
        </div>
      </div>
      
      {/* Contribution Grid Stub */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {/* Day Labels */}
        <div className="flex flex-col gap-1 text-[10px] text-(--text-muted) pt-1 shrink-0">
           {days.map((d, i) => <div key={i} className="h-3 leading-3">{d}</div>)}
        </div>
        
        {/* Grid Squares */}
        <div className="flex gap-1 min-w-0">
           {Array.from({ length: 14 }).map((_, weekIndex) => (
             <div key={weekIndex} className="flex flex-col gap-1">
               {Array.from({ length: 7 }).map((_, dayIndex) => {
                 // Random "activity" level for visual stub
                 const level = Math.random();
                 let bgClass = 'bg-(--bg-surface-2)';
                 if (level > 0.8) bgClass = 'bg-(--brand-yellow)';
                 else if (level > 0.6) bgClass = 'bg-(--brand-yellow)/60';
                 else if (level > 0.4) bgClass = 'bg-(--brand-yellow)/30';

                 return (
                   <div 
                     key={dayIndex} 
                     className={`w-3 h-3 rounded-[2px] ${bgClass}`}
                     role="img"
                     aria-label={`Activity for week ${weekIndex + 1} day ${dayIndex + 1}`}
                   />
                 );
               })}
             </div>
           ))}
        </div>
      </div>
      
      {/* Time Range Selectors */}
      <div className="flex justify-between pt-2 border-t border-(--border-subtle)">
         {timeRanges.map((range) => (
           <button 
             key={range}
             onClick={() => setActiveRange(range)}
             className={`text-xs font-medium transition-colors ${
               activeRange === range 
                ? 'text-(--brand-yellow)' 
                : 'text-(--text-secondary) hover:text-(--text-primary)'
             }`}
           >
             {range}
           </button>
         ))}
      </div>
    </div>
  );
};

/**
 * AverageTimeCard - Displays average time per answer
 */
const AverageTimeCard = () => {
  return (
    <div className="bg-(--bg-surface) rounded-2xl p-4 shadow-sm border border-(--border-subtle) flex flex-col justify-center items-center h-full min-h-[140px]">
       <h3 className="text-xs font-bold text-(--text-secondary) uppercase tracking-wider mb-3 text-center">
         Avg Time / Answer
       </h3>
       <div className="flex items-baseline text-(--text-primary)">
         <span className="text-4xl font-extrabold tracking-tight">1:30</span>
         <span className="text-xl font-medium text-(--text-muted) ml-1">M</span>
       </div>
       <p className="text-[10px] text-(--text-muted) mt-2 text-center">
         Based on recent tests
       </p>
    </div>
  );
};

/**
 * SuccessRateCard - Displays success percentage with time filters
 */
const SuccessRateCard = () => {
  const options = ['Today', '7d', '1m', '3m', '6M', '1Y', 'AOF'];
  const [selectedOption, setSelectedOption] = useState('Today');

  return (
    <div className="bg-(--bg-surface) rounded-2xl p-4 shadow-sm border border-(--border-subtle) h-full min-h-[140px] flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">
          Success
        </h3>
        <select 
          className="bg-(--bg-surface-2) text-[10px] font-medium rounded px-1 py-0.5 border border-(--border-subtle) text-(--text-primary) outline-none focus:border-(--brand-yellow)"
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
          aria-label="Select time range"
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
         <div className="text-4xl font-extrabold text-(--brand-yellow)">85%</div>
      </div>
      
      <div className="w-full bg-(--bg-surface-2) h-1.5 rounded-full mt-2 overflow-hidden">
        <div className="bg-(--brand-yellow) h-full rounded-full" style={{ width: '85%' }} />
      </div>
    </div>
  );
};

/**
 * DashboardPage - Main dashboard view for authenticated users
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-(--bg-primary) pb-24">
      {/* 1. Divider Line (Visual separation from header) */}
      <div className="w-full h-px bg-(--border-subtle) mb-4" role="presentation" />

      <div className="px-4 space-y-6 max-w-3xl mx-auto">
        {/* 2. Selection Buttons */}
        <section>
          <DashboardNav />
        </section>

        {/* 3. Activity Tracker */}
        <section>
          <ActivityTracker />
        </section>

        {/* 4 & 5. Stats Grid (Average Time & Success Rate) */}
        <section className="grid grid-cols-2 gap-4">
           {/* Left side: Average Time */}
           <div className="w-full">
             <AverageTimeCard />
           </div>
           
           {/* Right side: Success Rate */}
           <div className="w-full">
             <SuccessRateCard />
           </div>
        </section>
      </div>
    </div>
  );
}
