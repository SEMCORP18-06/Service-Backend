import React, { useState } from 'react';
import useResponsive from '../hooks/useResponsive.js';
import { Lock, Mail, ShieldAlert, User, Phone, Briefcase } from 'lucide-react';

export default function LoginView({ onLogin }) {
  const { isMobile } = useResponsive();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState('senior_manager');
  const [signupPhone, setSignupPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailDomainError, setEmailDomainError] = useState('');
  const [signupEmailDomainError, setSignupEmailDomainError] = useState('');

  const validateEmailDomain = (value) => {
    if (value.includes('@')) {
      const domain = value.split('@')[1];
      if (domain && domain.length > 0 && !domain.toLowerCase().startsWith('semcogroups.com'.substring(0, domain.length))) {
        return 'Only @semcogroups.com emails are allowed.';
      }
      if (domain && domain.length >= 'semcogroups.com'.length && domain.toLowerCase() !== 'semcogroups.com') {
        return 'Only @semcogroups.com emails are allowed.';
      }
    }
    return '';
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setSuccess("Your account email has been successfully verified! You can now log in.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isLoginMode) {
      if (!email.trim() || !password.trim()) {
        setError("Please enter both email and password.");
        return;
      }

      if (!email.toLowerCase().endsWith('@semcogroups.com')) {
        setError("Access denied. Only @semcogroups.com emails are allowed.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('https://service-backend-jhq0.onrender.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Login failed");
        }

        const data = await res.json();
        onLogin(data.user);
      } catch (err) {
        console.error(err);
        setError(err.message || "Invalid email or password.");
      } finally {
        setLoading(false);
      }
    } else {
      // Signup Mode
      if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim() || !signupPhone.trim()) {
        setError("Please fill in all registration fields.");
        return;
      }

      if (!signupEmail.toLowerCase().endsWith('@semcogroups.com')) {
        setError("Access denied. Registration is restricted to @semcogroups.com emails.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('https://service-backend-jhq0.onrender.com/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: signupName,
            email: signupEmail,
            password: signupPassword,
            role: signupRole,
            phone_number: signupPhone
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Registration failed");
        }

        const data = await res.json();
        setSuccess(data.message || "Registration successful! A verification email has been sent. Please check your email and verify your account before logging in.");
        setIsLoginMode(true);
        setEmail(signupEmail);
        setPassword('');
        
        // Reset states
        setSignupName('');
        setSignupEmail('');
        setSignupPassword('');
        setSignupPhone('');
      } catch (err) {
        console.error(err);
        setError(err.message || "Error registering account.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: isMobile ? '20px auto' : '60px auto', padding: '0 20px' }}>
      <div className="card-glass animate-fade-in" style={{ padding: isMobile ? '24px' : '32px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '8px 16px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '16px'
          }}>
            <img src="/semco_logo.png" alt="SEMCO Logo" style={{ height: '48px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 800 }}>{isLoginMode ? 'Staff Portal Login' : 'Create Staff Account'}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            SEMCORP Process & Vacuum Systems Pvt. Ltd.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            padding: '10px 12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: 'var(--success-light)',
            color: 'var(--success)',
            padding: '10px 12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoginMode ? (
            <>
              <div>
                <label htmlFor="login-email" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmail(val);
                    setEmailDomainError(validateEmailDomain(val));
                  }}
                  placeholder="e.g. name@semcogroups.com"
                  required
                  inputMode="email"
                  autoComplete="username"
                  style={emailDomainError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.15)' } : {}}
                />
                {emailDomainError && (
                  <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{emailDomainError}</p>
                )}
              </div>

              <div>
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="signup-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Full Name</label>
                <input
                  id="signup-name"
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="signup-email" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> Email Address (@semcogroups.com)</label>
                <input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSignupEmail(val);
                    setSignupEmailDomainError(validateEmailDomain(val));
                  }}
                  placeholder="e.g. name@semcogroups.com"
                  required
                  inputMode="email"
                  autoComplete="username"
                  style={signupEmailDomainError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.15)' } : {}}
                />
                {signupEmailDomainError && (
                  <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', fontWeight: 500 }}>{signupEmailDomainError}</p>
                )}
              </div>

              <div>
                <label htmlFor="signup-phone" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> WhatsApp Mobile Number</label>
                <input
                  id="signup-phone"
                  type="tel"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  placeholder="e.g. +919876543210"
                  required
                  inputMode="tel"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="signup-role" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} /> Portal Role</label>
                  <select
                    id="signup-role"
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    style={{ padding: '10px 12px' }}
                  >
                    <option value="senior_manager">Service Officer</option>
                    <option value="manager">Service Manager</option>
                    <option value="engineer">Field Engineer</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '8px', minHeight: '44px' }}>
            {loading ? 'Processing...' : isLoginMode ? 'Sign In' : 'Register Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
              setSuccess('');
            }}
            style={{ fontSize: isMobile ? '12px' : '12.5px', background: 'none', border: 'none', color: 'var(--primary)', padding: 0 }}
          >
            {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>

      </div>
    </div>
  );
}
