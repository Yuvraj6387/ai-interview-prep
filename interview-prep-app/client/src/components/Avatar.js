import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiUser, FiX, FiCheck, FiLoader } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';

// The preset avatars in public/avatars ("Lorelei" by Lisa Wischofsky, CC0).
// The server only accepts these paths (see isPresetAvatar in routes/auth.js).
export const AVATARS = Array.from({ length: 12 }, (_, i) => `/avatars/avatar-${i + 1}.svg`);

// A round profile picture. Falls back to a person icon when there is no
// picture or it fails to load. no-referrer is needed for Google photos, which
// often refuse to load when the request says which site it came from.
export const UserAvatar = ({ src, alt = '', className = 'w-8 h-8' }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  return (
    <div className={`${className} rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
      {src && !broken ? (
        <img src={src} alt={alt} referrerPolicy="no-referrer" onError={() => setBroken(true)} className="w-full h-full object-cover" />
      ) : (
        <FiUser className="text-base" />
      )}
    </div>
  );
};

// Grid of preset avatars to pick from.
export const AvatarPicker = ({ value, onChange }) => (
  <div className="grid grid-cols-6 gap-2">
    {AVATARS.map((src, i) => {
      const selected = value === src;
      return (
        <button
          key={src}
          type="button"
          onClick={() => onChange(selected ? '' : src)}
          aria-label={`Avatar ${i + 1}`}
          aria-pressed={selected}
          className={`relative aspect-square rounded-full overflow-hidden transition-smooth ${
            selected ? 'ring-2 ring-orange-500 ring-offset-2' : 'hover:scale-105 opacity-90 hover:opacity-100'
          }`}
        >
          <img src={src} alt="" className="w-full h-full" />
          {selected && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/25">
              <FiCheck className="text-white" size={16} />
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// Pop-up for a signed-in user to change their picture.
export const AvatarModal = ({ onClose }) => {
  const { user, updateProfileImage } = useAuth();
  const { showToast } = useToast();
  const [choice, setChoice] = useState(AVATARS.includes(user?.profileImage) ? user.profileImage : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfileImage(choice);
      showToast('Profile picture updated', 'success');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update your picture. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Rendered into <body>: the mobile sidebar slides in with a CSS transform,
  // and a fixed pop-up inside a transformed parent would stay inside the drawer.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Choose your avatar" className="relative card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-zinc-900 font-display">Choose your avatar</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-zinc-500 hover:bg-stone-100">
            <FiX size={18} />
          </button>
        </div>
        <div className="flex justify-center mb-4">
          <UserAvatar src={choice || user?.profileImage} alt="" className="w-20 h-20" />
        </div>
        <AvatarPicker value={choice} onChange={(src) => setChoice(src || choice)} />
        <button type="button" onClick={save} disabled={!choice || saving || choice === user?.profileImage} className="btn-primary w-full mt-5">
          {saving ? <><FiLoader className="animate-spin" size={16} /> <span>Saving...</span></> : <span>Save</span>}
        </button>
      </div>
    </div>,
    document.body
  );
};
