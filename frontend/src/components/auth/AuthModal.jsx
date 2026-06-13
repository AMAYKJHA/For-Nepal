'use client';

import { useState } from 'react';
import { login, register } from '@/lib/auth';
import styles from './AuthModal.module.css';

export default function AuthModal({ onSuccess }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    username: '', 
    password: '', 
    email: '' 
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(loginData);
      
      if (result.success) {
        // Wait a bit for localStorage to be written
        setTimeout(() => {
          onSuccess?.();
        }, 200);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
    
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await register(signupData);
      
      if (result.success) {
        // Wait a bit for localStorage to be written
        setTimeout(() => {
          onSuccess?.();
        }, 200);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
    
    setLoading(false);
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
  };

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        {/* Left Panel - Branding */}
        <section className={styles.brandPanel}>
          <div className={styles.brandContent}>
            <img 
              alt="Scholar Logo" 
              className={styles.brandLogo}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjNGkMq_-zOE0oLd0HPKOsOPx8jc-0CUSUw2ngh4wH-_esSaqRMWhK26EJ-FeOfFb3Qe5-noHJP9LzulfkhWuVbZkhcIg12X6Tcldy54PrIGffDkJBa3wcczRxIu36om5YJRRHjtoJvW0mgl_FpAIFtlAvEzH3YtZtrwER6rNTcr081tgxijroVBRHYblvtu0kb6k0YamQxRFatXYADasIEaH1Ia7RWXDrHDxzYzn-out_dExDXoeQHUiITSItl4bv_D8s_XPETro"
            />
            
            <h1 className={styles.brandTitle}>
              {mode === 'login' ? 'Welcome Back' : 'Join Scholar'}
            </h1>
            
            <p className={styles.brandSubtitle}>
              {mode === 'login' 
                ? 'Your arcane grimoires await your return.'
                : 'Begin your journey into the arcane arts of knowledge.'
              }
            </p>

            <div className={styles.brandFooter}>
              <p className={styles.brandFooterText}>
                {mode === 'login' ? 'New to Scholar?' : 'Already a member?'}
              </p>
              <button 
                type="button"
                className={styles.switchButton}
                onClick={switchMode}
              >
                {mode === 'login' ? 'Create Account' : 'Sign In'}
              </button>
            </div>
          </div>
        </section>

        {/* Right Panel - Form */}
        <section className={styles.formPanel}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>
                {mode === 'login' ? 'Login' : 'Sign Up'}
              </h2>
              <div className={styles.formDivider}></div>
            </div>

            {error && (
              <div className={styles.errorBox}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                {error}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Username</label>
                  <div className={styles.inputWrapper}>
                    <span className="material-symbols-outlined">person</span>
                    <input
                      type="text"
                      placeholder="Enter username"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      required
                      disabled={loading}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Password</label>
                  <div className={styles.inputWrapper}>
                    <span className="material-symbols-outlined">lock</span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Username <span className={styles.required}>*</span></label>
                  <div className={styles.inputWrapper}>
                    <span className="material-symbols-outlined">person</span>
                    <input
                      type="text"
                      placeholder="The_Wise_One"
                      value={signupData.username}
                      onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                      required
                      disabled={loading}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Password <span className={styles.required}>*</span></label>
                  <div className={styles.inputWrapper}>
                    <span className="material-symbols-outlined">lock</span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Email (Optional)</label>
                  <div className={styles.inputWrapper}>
                    <span className="material-symbols-outlined">mail</span>
                    <input
                      type="email"
                      placeholder="scholar@arcane.edu"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Register'}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}