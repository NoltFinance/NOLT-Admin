
import React from 'react';

interface HeaderProps {
  onMenuClick: () => void;
  onNotificationClick: () => void;
  unreadCount: number;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onNotificationClick, unreadCount, isDarkMode, onToggleTheme }) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-surface-darker/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/50 transition-colors duration-300">
      <div className="flex items-center gap-4 flex-1">
        <button 
          className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-dark rounded-lg transition-colors"
          onClick={onMenuClick}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="relative w-full max-w-md hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-[20px]">search</span>
          </div>
          <input 
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl leading-5 bg-slate-50 dark:bg-surface-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm shadow-sm transition-all" 
            placeholder="Search transactions, users, or loans..." 
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleTheme}
          className="p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-dark rounded-xl transition-all hover:scale-105 active:scale-95 border border-transparent dark:border-slate-800"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <span className="material-symbols-outlined text-[24px]">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <button 
          onClick={onNotificationClick}
          className="relative p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-dark rounded-xl transition-all hover:scale-105 active:scale-95 border border-transparent dark:border-slate-800"
        >
          <span className="material-symbols-outlined text-[26px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-surface-darker animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button className="p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-dark rounded-xl transition-colors border border-transparent dark:border-slate-800">
          <span className="material-symbols-outlined text-[26px]">help</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
