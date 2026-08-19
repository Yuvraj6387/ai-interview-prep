import React, { useState } from 'react';
import { FiMenu, FiLogIn } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';

const Navbar = ({ onMenuClick }) => {
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (isAuthenticated) {
    // Desktop nav lives entirely in the sidebar; this is just the mobile bar
    // that reveals it, since the sidebar collapses to an off-canvas drawer there.
    return (
      <nav className="md:hidden bg-white shadow-lg sticky top-0 z-30">
        <div className="flex items-center h-16 px-4 space-x-3">
          <button
            onClick={onMenuClick}
            className="text-gray-700 hover:text-cyan-600 transition-smooth p-1"
          >
            <FiMenu size={24} />
          </button>
          <h1 className="text-lg font-bold gradient-text font-display truncate">
            ⚡ InterviewPreparation.AI
          </h1>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center flex-shrink-0 mr-4">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold gradient-text font-display truncate">
                ⚡ InterviewPreparation.AI
              </h1>
            </div>

            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-smooth btn-pulse"
            >
              <FiLogIn size={18} />
              <span>Login / Sign Up</span>
            </button>
          </div>
        </div>
      </nav>

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </>
  );
};

export default Navbar;
