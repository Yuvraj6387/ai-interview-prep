import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiFileText, FiEdit, FiTarget, FiMic, FiBarChart2, FiMap, FiBookOpen, FiLogOut, FiX,
  FiChevronsLeft, FiChevronsRight, FiCode
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { UserAvatar, AvatarModal } from './Avatar';

const navItems = [
  { to: '/', label: 'Dashboard', icon: FiGrid },
  { to: '/resume', label: 'Resume Analyzer', icon: FiFileText },
  { to: '/resume-builder', label: 'Resume Builder', icon: FiEdit },
  { to: '/job-match', label: 'Job Matcher', icon: FiTarget },
  { to: '/mock-interview', label: 'Mock Interview', icon: FiMic },
  { to: '/analytics', label: 'Analytics', icon: FiBarChart2 },
  { to: '/roadmap', label: 'Learning Roadmap', icon: FiMap },
  { to: '/dsa', label: 'DSA Practice', icon: FiCode },
  { to: '/notes', label: 'Important Notes', icon: FiBookOpen },
];

const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 76;
const STORAGE_KEY = 'sidebarCollapsed';

// Remember the choice between visits. Storage can be blocked (private mode),
// so a failed read or write just falls back to the expanded sidebar.
const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};
const saveCollapsed = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // ignore
  }
};

const SidebarContent = ({ onNavigate, onClose, closeIcon: CloseIcon = FiX, closeLabel = 'Close menu', collapsed = false }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [avatarOpen, setAvatarOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className={`h-16 border-b border-gray-100 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
        {!collapsed && (
          <h1 className="text-lg font-bold gradient-text font-display truncate">⚡ InterviewPreparation.AI</h1>
        )}
        {onClose && (
          <button
            onClick={onClose}
            title={closeLabel}
            aria-label={closeLabel}
            className="text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg p-1.5 flex-shrink-0 transition-smooth"
          >
            <CloseIcon size={22} />
          </button>
        )}
      </div>

      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map(({ to, label, icon: Icon }) => {
          // The builder's editor lives at /resume-builder/:id, which should still light up its link.
          const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`));
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              aria-label={label}
              className={`flex items-center rounded-lg text-sm font-medium transition-smooth ${
                collapsed ? 'justify-center h-11' : 'space-x-3 px-4 py-3'
              } ${isActive ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Icon size={collapsed ? 20 : 18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Compact footer: avatar, name and a small logout button on one row.
          In the icon rail they stack instead. */}
      <div className={`py-2.5 border-t border-gray-100 ${collapsed ? 'px-2 space-y-2' : 'px-3'}`}>
        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-2.5 px-1'}`} title={collapsed ? user?.fullName : undefined}>
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            title="Change avatar"
            aria-label="Change avatar"
            className="rounded-full flex-shrink-0 hover:ring-2 hover:ring-orange-300 transition-smooth"
          >
            <UserAvatar src={user?.profileImage} alt={user?.fullName} className="w-9 h-9" />
          </button>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-gray-800 truncate leading-tight">{user?.fullName}</p>
              <p className="text-[11px] text-gray-500 truncate leading-tight">{user?.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            title="Logout"
            aria-label="Logout"
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-red-500 hover:text-white hover:bg-red-500 transition-smooth"
          >
            <FiLogOut size={16} />
          </button>
        </div>
        {!collapsed && (
          <p className="mt-1.5 text-center text-[10px] text-gray-400">
            Built by <span className="font-semibold text-orange-600">Yuvraj</span>
          </p>
        )}
      </div>
      {avatarOpen && <AvatarModal onClose={() => setAvatarOpen(false)} />}
    </div>
  );
};

const Sidebar = ({ isOpen, onClose }) => {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      saveCollapsed(!prev);
      return !prev;
    });
  };

  return (
    <>
      {/* Desktop sidebar: full width with labels, or minimized to an icon rail */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:block flex-shrink-0 overflow-hidden border-r border-gray-100 sticky top-0 h-screen"
      >
        <SidebarContent
          collapsed={collapsed}
          onClose={toggleCollapsed}
          closeIcon={collapsed ? FiChevronsRight : FiChevronsLeft}
          closeLabel={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}
        />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-72 z-50 md:hidden shadow-2xl"
            >
              <SidebarContent onNavigate={onClose} onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
