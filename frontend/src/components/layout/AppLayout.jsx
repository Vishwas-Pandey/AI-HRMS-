import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, KeyRound, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { navFor } from "../../lib/roles";
import { Avatar, RoleBadge } from "../ui";
import { Logo } from "./Logo";

const SidebarNav = ({ user, onNavigate }) => (
  <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Main">
    {navFor(user).map((item, i) =>
      item.section ? (
        <p key={`s-${i}`} className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {item.section}
        </p>
      ) : (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`
          }
        >
          <item.icon className="h-[18px] w-[18px]" />
          {item.label}
        </NavLink>
      )
    )}
  </nav>
);

const UserMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg p-1.5 pr-2 hover:bg-slate-100"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.name} size="sm" />
        <span className="hidden text-left sm:block">
          <span className="block max-w-[160px] truncate text-sm font-medium text-slate-900">{user.name}</span>
          <span className="block text-xs text-slate-500">{user.jobTitle || user.email}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-60 animate-fade-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <RoleBadge role={user.role} />
              {user.employeeId && <span className="text-xs text-slate-500">{user.employeeId}</span>}
            </div>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          <button role="menuitem" onClick={() => { setOpen(false); navigate("/account/password"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            <KeyRound className="h-4 w-4" /> Change password
          </button>
          <button role="menuitem" onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
};

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-100 px-6">
          <Logo />
        </div>
        <SidebarNav user={user} />
        <div className="border-t border-slate-100 p-4 text-xs text-slate-400">Signed in as {user.role === "hr" ? "HR" : user.role}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85%] animate-slide-up flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav user={user} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <Logo className="lg:hidden" />
          </div>
          <UserMenu user={user} onLogout={logout} />
        </header>

        {user.isDemo && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 sm:px-6">
            You're using a shared demo account. Data is fictional and resets every 24 hours.
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
