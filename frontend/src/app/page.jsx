'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getUser, logout } from '@/lib/auth';
import AuthModal from '@/components/auth/AuthModal';
import styles from './page.module.css';

export default function HomePage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = () => {
      try {
        const loggedIn = isLoggedIn();
        const userData = getUser();
        
        setAuthenticated(loggedIn);
        setUser(userData);
        
        if (loggedIn && userData) {
          setShowAuthModal(false);
        } else {
          setShowAuthModal(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setShowAuthModal(true);
      }
      
      setIsLoading(false);
    };

    // Initial check
    checkAuth();

    // Listen for storage changes (in case user logs in/out in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'scholar_auth_token' || e.key === 'scholar_user_data') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically (in case localStorage changes without event)
    const interval = setInterval(checkAuth, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleAuthSuccess = () => {
    const loggedIn = isLoggedIn();
    const userData = getUser();
    
    if (loggedIn) {
      setAuthenticated(true);
      setUser(userData);
      setShowAuthModal(false);
      
      // Force a re-render
      setTimeout(() => {
        setAuthenticated(true);
        setUser(userData);
      }, 100);
    }
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setUser(null);
    setShowAuthModal(true);
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className={styles.body}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading Scholar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      {/* Global Background Elements */}
      <div className={styles.bgRunes}>
        <div className={`${styles.rune} ${styles.rune1}`}>ᚠ</div>
        <div className={`${styles.rune} ${styles.rune2}`}>ᚱ</div>
        <div className={`${styles.rune} ${styles.rune3}`}>ᚦ</div>
      </div>

      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logoWrapper}>
            <img 
              alt="Scholar Pixel Art Logo" 
              className={styles.logoImg} 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkXB3qF1d70-u33fzL8Kbpkb_iYbDzf0aYpM-Hbbse_hXtUvhBOTAAL5tQ-O4LzZiefepLd1DTx2LBk6QvByGCgJCgvL6TKEgZNqe-xVRN9iXnky7lRuC76gHl0vMNlCrK8emnULWqKsxPMceB7WRVb21Eb86sdsXvsgbm9IUJiBFQsefmb530nB12tzxgh8ch4731pppzRqOPJDfBp9_N3OGZy3Hr4MhgASgPtrLnulmKPxowxR3YbB_AOH1C-M1lBzlasCx3wzM" 
            />
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.title}>SCHOLAR</h1>
            <p className={styles.subtitle}>
              Level Up Your Mind.<br />
              and Turn Notes into Victory
            </p>
          </div>

          {/* User Profile / Login Button */}
          <div className={styles.userSection}>
            {authenticated && user ? (
              <div className={styles.userProfile}>
                <div className={styles.userAvatar}>
                  <span className="material-symbols-outlined">account_circle</span>
                </div>
                <span className={styles.userName}>
                  {user.username || user.email?.split('@')[0] || 'Scholar'}
                </span>
                <button 
                  className={styles.logoutButton}
                  onClick={handleLogout}
                  title="Logout"
                >
                  <span className="material-symbols-outlined">logout</span>
                </button>
              </div>
            ) : (
              <button 
                className={styles.loginButton}
                onClick={() => setShowAuthModal(true)}
              >
                <span className="material-symbols-outlined">login</span>
                Login
              </button>
            )}
          </div>
        </header>

        {/* Mode Cards */}
        <section className={styles.modesSection}>
          <Link href="/play" className={styles.modeCard}>
            <div className={`${styles.corner} ${styles.topLeft}`}></div>
            <div className={`${styles.corner} ${styles.topRight}`}></div>
            <div className={`${styles.corner} ${styles.bottomLeft}`}></div>
            <div className={`${styles.corner} ${styles.bottomRight}`}></div>
            
            <span className={`material-symbols-outlined ${styles.cardIcon}`}>swords</span>
            <div className={styles.cardText}>
              <span className={styles.cardTitle}>Play</span>
              <span className={styles.cardTitle}>Mode</span>
            </div>
            <div className={styles.cardHoverText}>
              <span>ENTER THE ARENA</span>
            </div>
          </Link>

          <Link href="/study" className={styles.modeCard}>
            <div className={`${styles.corner} ${styles.topLeft}`}></div>
            <div className={`${styles.corner} ${styles.topRight}`}></div>
            <div className={`${styles.corner} ${styles.bottomLeft}`}></div>
            <div className={`${styles.corner} ${styles.bottomRight}`}></div>
            
            <span className={`material-symbols-outlined ${styles.cardIcon}`}>auto_stories</span>
            <div className={styles.cardText}>
              <span className={styles.cardTitle}>Study</span>
              <span className={styles.cardTitle}>Mode</span>
            </div>
            <div className={styles.cardHoverText}>
              <span>ENTER THE LIBRARY</span>
            </div>
          </Link>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <span className={styles.footerText}>
            Make learning easy
          </span>
        </footer>
      </main>

      {/* Vignette Overlay */}
      <div className={styles.vignette}></div>

      {/* Auth Modal - Only show if NOT authenticated */}
      {showAuthModal && !authenticated && (
        <AuthModal onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}