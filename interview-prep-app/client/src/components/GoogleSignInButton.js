import React, { useEffect, useRef } from 'react';

// "Sign in with Google" using Google Identity Services. Google renders the
// button and, once the user picks an account, hands us an ID token (credential)
// that the server verifies. Without REACT_APP_GOOGLE_CLIENT_ID the button simply
// does not show, so the app works the same before Google is set up.
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export const isGoogleSignInEnabled = Boolean(CLIENT_ID);

let scriptPromise;
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Could not load Google sign-in. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
};

const GoogleSignInButton = ({ onCredential, onError, text = 'continue_with', width = 300 }) => {
  const containerRef = useRef(null);
  // Keep the latest handlers without re-rendering Google's button when they change.
  const handlersRef = useRef({ onCredential, onError });
  handlersRef.current = { onCredential, onError };

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => handlersRef.current.onCredential(response.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          width,
        });
      })
      .catch((error) => handlersRef.current.onError?.(error.message));

    return () => {
      cancelled = true;
    };
  }, [text, width]);

  if (!CLIENT_ID) return null;

  return <div ref={containerRef} className="min-h-[44px]" />;
};

export default GoogleSignInButton;
