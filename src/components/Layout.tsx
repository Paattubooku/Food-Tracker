import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, Scale, Lightbulb, Settings, Utensils, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/weight', icon: Scale, label: 'Weight' },
  { to: '/insights', icon: Lightbulb, label: 'Insights' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-background)' }}>

      {/* ── Sidebar (icon-only on md, full on lg) ── */}
      <aside className="hidden md:flex flex-col shrink-0 bg-slate-900 text-white fixed top-0 left-0 h-full z-30 w-16 lg:w-56 xl:w-60 transition-all duration-300">
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 lg:px-5 h-16 border-b border-slate-800 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <Utensils className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight whitespace-nowrap hidden lg:block">Food Tracker</span>
          <span className="text-[10px] font-semibold bg-indigo-500 text-white px-1.5 py-0.5 rounded ml-auto hidden lg:block">v2</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 lg:px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all justify-center lg:justify-start ${isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 lg:p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 justify-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold shrink-0 uppercase">
                {user?.email?.[0] || 'U'}
              </div>
              <div className="min-w-0 hidden lg:block">
                <p className="text-sm font-medium truncate">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden lg:block"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 md:ml-16 lg:ml-56 xl:ml-60 flex flex-col min-h-screen min-w-0">

        {/* Mobile top header (< md only) */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Utensils className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">Food Tracker</span>
            <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">v2</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom tab bar (< md only) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 shadow-lg safe-bottom">
          <div className="flex">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors min-w-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="truncate w-full text-center px-0.5">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
