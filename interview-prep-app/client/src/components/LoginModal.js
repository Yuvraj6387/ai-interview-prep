import React, { useState } from 'react';
import { FiX, FiMail, FiLock, FiUser, FiImage, FiLoader } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';
import GoogleSignInButton, { isGoogleSignInEnabled } from './GoogleSignInButton';

const LoginModal = ({ onClose }) => {
  const { login, register, googleLogin } = useAuth();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePreview, setProfilePreview] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    profileImage: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePreview(reader.result);
      setFormData({ ...formData, profileImage: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSlowLoading(false);

    // The backend runs on Render's free tier, which spins down when idle and
    // can take 30-60s to wake up on the first request. Let the user know
    // instead of leaving them staring at a spinner that looks stuck.
    const slowLoadingTimer = setTimeout(() => setSlowLoading(true), 4000);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        showToast('Logged in successfully', 'success');
      } else {
        if (!formData.fullName) {
          setError('Please enter your full name');
          return;
        }
        await register({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          profileImage: formData.profileImage,
        });
        showToast('Account created successfully', 'success');
      }
      onClose();
    } catch (err) {
      const message = err.response?.data?.message || 'An error occurred. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      clearTimeout(slowLoadingTimer);
      setLoading(false);
      setSlowLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(credential);
      showToast('Logged in with Google', 'success');
      onClose();
    } catch (err) {
      const message = err.response?.data?.message || 'Google sign-in failed. Please try again.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto py-6 modal-backdrop animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-3.5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white font-display">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1.5 transition-smooth"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error}
            </div>
          )}

          {isGoogleSignInEnabled && (
            <>
              <div className="flex justify-center">
                <GoogleSignInButton
                  text={isLogin ? 'signin_with' : 'signup_with'}
                  width={300}
                  onCredential={handleGoogleCredential}
                  onError={setError}
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex-1 h-px bg-gray-200" />
                or with email
                <span className="flex-1 h-px bg-gray-200" />
              </div>
            </>
          )}

          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-smooth"
                  placeholder="John Doe"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-smooth"
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-smooth"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Profile Image (Optional)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 rounded-lg border border-gray-300 bg-gray-50 text-xs text-gray-600">
                  <FiImage className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full pl-9 pr-3 py-2.5 bg-transparent outline-none"
                  />
                </div>
                {profilePreview && (
                  <img src={profilePreview} alt="Profile preview" className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" size={16} />
                <span>{isLogin ? 'Logging in...' : 'Creating account...'}</span>
              </>
            ) : (
              <span>{isLogin ? 'Login' : 'Create Account'}</span>
            )}
          </button>

          {slowLoading && (
            <p className="text-center text-xs text-gray-500">
              Waking up the server — this can take up to a minute on the first request. Hang tight!
            </p>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ email: '', password: '', fullName: '', profileImage: '' });
              }}
              className="text-cyan-600 hover:text-cyan-800 font-medium text-xs transition-smooth"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
