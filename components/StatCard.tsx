
import React from 'react';
import { StatMetric } from '../types';

interface StatCardProps {
  stat: StatMetric;
}

const StatCard: React.FC<StatCardProps> = ({ stat }) => {
  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className={`w-12 h-12 rounded-[18px] ${stat.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-opacity-100 border border-current border-opacity-20`}>
          <span className="material-symbols-outlined text-2xl font-black">{stat.icon}</span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {stat.change && (
            <span className={`flex items-center text-[10px] font-black uppercase tracking-widest ${stat.isPositive ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' : 'text-rose-500 bg-rose-50 dark:bg-rose-900/30'} px-2.5 py-1 rounded-full border border-current border-opacity-10`}>
              {stat.change}
              <span className="material-symbols-outlined text-[14px] ml-1 font-black">
                {stat.isPositive ? 'arrow_upward' : 'arrow_downward'}
              </span>
            </span>
          )}
          {stat.badgeText && (
            <span className="flex items-center text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full border border-amber-500/20">
              {stat.badgeText}
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2 leading-none">{stat.label}</p>
      <div className="flex flex-col">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors tracking-tight">
          {stat.value}
        </h3>
        {stat.subValue && (
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 font-mono">
            {stat.subValue}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
