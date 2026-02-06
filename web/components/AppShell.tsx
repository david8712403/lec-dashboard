'use client'

import type { ComponentType, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AIAssistant } from './AIAssistant';
import {
  CalendarIcon,
  CreditCardIcon,
  FileTextIcon,
  HistoryIcon,
  MenuIcon,
  UsersIcon,
  XIcon,
  ClipboardIcon,
} from './Icons';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/', label: '總覽', icon: ClipboardIcon },
  { href: '/schedule', label: '課表', icon: CalendarIcon },
  { href: '/daily-logs', label: '上課紀錄', icon: FileTextIcon },
  { href: '/students', label: '個案管理', icon: UsersIcon },
  { href: '/payments', label: '繳費管理', icon: CreditCardIcon },
  { href: '/activity', label: '活動紀錄', icon: HistoryIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const title = useMemo(() => {
    if (pathname === '/') return '總覽';
    const item = navItems.find((nav) => nav.href !== '/' && pathname.startsWith(nav.href));
    return item?.label ?? 'LEC Dashboard';
  }, [pathname]);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:relative z-30 h-full bg-white border-r flex flex-col transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}
        `}
      >
        <div className="p-4 border-b h-16 flex items-center justify-between">
          {isSidebarOpen ? (
            <h1 className="text-xl font-black text-primary tracking-tight truncate">LEC Dashboard</h1>
          ) : (
            <div className="w-full flex justify-center text-primary font-black">LEC</div>
          )}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 w-full p-3 rounded-lg mb-1 transition-all overflow-hidden whitespace-nowrap ${
                  isActive(item.href)
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span
                  className={`font-medium transition-opacity duration-200 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 md:hidden'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {isSidebarOpen && (
          <div className="p-4 border-t text-xs text-center text-slate-400">
            LEC System v1.2
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="bg-white h-16 border-b flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen((prev) => !prev)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <MenuIcon className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-slate-700">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
              T
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-100">{children}</div>
      </main>

      <AIAssistant />
    </div>
  );
}
