import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiFileText, FiEdit, FiTarget, FiMic, FiBarChart2, FiMap, FiBookOpen, FiLogOut, FiUser, FiX,
  FiChevronsLeft, FiChevronsRight, FiCode
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

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

      <div className={`py-4 border-t border-gray-100 space-y-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3 px-3 py-2'}`} title={collapsed ? user?.fullName : undefined}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.fullName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <FiUser className="text-xl" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-600 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          aria-label="Logout"
          className={`w-full flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-smooth ${
            collapsed ? 'h-10' : 'space-x-2 px-4 py-2.5'
          }`}
        >
          <FiLogOut />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
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
