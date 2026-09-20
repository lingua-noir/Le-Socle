import React from 'react';
import { NavigationTab } from '../types';
import { 
  Home, 
  Layers, 
  Sparkles, 
  BarChart2, 
  Search,
  BookOpen,
  Sliders
} from 'lucide-react';

interface HeaderProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  dueCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  dueCount,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'learn', label: 'Learn', icon: Layers },
    { id: 'review', label: 'Review', icon: Sparkles },
    { id: 'stats', label: 'Stats', icon: BarChart2 },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-[#FAF9F6]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand */}
        <button
          id="brand-home-button"
          onClick={() => onSelectTab('home')}
          className="group flex items-center gap-3 text-left focus:outline-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300/80 bg-white shadow-xs transition-colors group-hover:border-stone-400">
            <BookOpen className="h-4.5 w-4.5 text-stone-800" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-semibold tracking-tight text-stone-900">
                LE SOCLE
              </span>
              <span className="hidden rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-stone-600 sm:inline-block">
                FRÉQUENTIEL
              </span>
            </div>
            <p className="text-[11px] text-stone-500">2,500 Core Frequency Bands</p>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-stone-900 text-stone-50 shadow-xs'
                    : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-stone-100' : 'text-stone-500'}`} />
                <span>{item.label}</span>
                {item.id === 'review' && dueCount > 0 && (
                  <span
                    className={`ml-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                      isActive
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {dueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile Quick Review Action & Status */}
        <div className="flex items-center gap-2 md:hidden">
          {dueCount > 0 && (
            <button
              onClick={() => onSelectTab('review')}
              className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>{dueCount} due</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-stone-200 bg-[#FAF9F6] py-2 md:hidden"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
                isActive ? 'text-stone-900 font-semibold' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'text-stone-900 stroke-[2.5]' : 'text-stone-400'}`} />
                {item.id === 'review' && dueCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                    {dueCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
