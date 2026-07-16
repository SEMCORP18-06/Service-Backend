import React, { useState, useEffect } from 'react';
import useResponsive from './hooks/useResponsive.js';
import ThemeToggle from './components/ThemeToggle';
import WhatsAppSimulator from './components/WhatsAppSimulator';
import TicketGenView from './views/TicketGenView';
import ClientDashboardView from './views/ClientDashboardView';
import LoginView from './views/LoginView';
import ManagerDashboardView from './views/ManagerDashboardView';
import EngineerDashboardView from './views/EngineerDashboardView';
import { Wrench, Shield, Search, FileText, LogOut, User } from 'lucide-react';

export default function App() {
  const { isMobile } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, isMobile]);

  const [currentTab, setCurrentTab] = useState(() => {
    const saved = localStorage.getItem('semcorp_tab');
    return saved || 'ticket-gen';
  });
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const saved = localStorage.getItem('semcorp_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Persist tab and user to localStorage on change
  useEffect(() => {
    localStorage.setItem('semcorp_tab', currentTab);
  }, [currentTab]);

  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem('semcorp_user', JSON.stringify(loggedInUser));
    } else {
      localStorage.removeItem('semcorp_user');
    }
  }, [loggedInUser]);

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  const handleLogin = (user) => {
    setLoggedInUser(user);
    setCurrentTab('staff');
  };

  const handleLogout = () => {
    localStorage.removeItem('semcorp_user');
    localStorage.removeItem('semcorp_tab');
    setLoggedInUser(null);
    setCurrentTab('staff');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Premium Header Nav Bar */}
      <header style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: isMobile ? '10px 16px' : '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'background-color var(--transition-normal)'
      }}>
        
        {/* Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setCurrentTab('ticket-gen')}>
          <div style={{
            background: '#ffffff',
            padding: '4px 8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <img src="/semco_logo.png" alt="SEMCO Logo" style={{ height: isMobile ? '28px' : '32px', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? '18px' : '22px', lineHeight: 1.1, fontWeight: 800 }}>SEMCORP</h1>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Process & Vacuum Systems</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="desktop-nav" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleTabChange('ticket-gen')}
            className={`btn ${currentTab === 'ticket-gen' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={16} /> Register Complaint
          </button>
          
          <button
            onClick={() => handleTabChange('client-dash')}
            className={`btn ${currentTab === 'client-dash' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Search size={16} /> Client Dashboard
          </button>
          
          <button
            onClick={() => handleTabChange('staff')}
            className={`btn ${currentTab === 'staff' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Shield size={16} /> Staff Workspace
          </button>
        </nav>

        {/* Global Controls & Auth State */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          <div className="desktop-auth">
            {loggedInUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '8px', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', padding: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <User size={16} />
                </div>
                <div style={{ fontSize: '12px', lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 600 }}>{loggedInUser.name}</div>
                  <div style={{ color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{loggedInUser.role}</div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="btn btn-secondary"
                  style={{ padding: '6px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Log Out"
                >
                  <LogOut size={14} style={{ color: 'var(--danger)' }} />
                </button>
              </div>
            )}

            <ThemeToggle />
          </div>

          {/* Hamburger button for mobile */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>

      </header>

      {/* Mobile Navigation Drawer Overlay */}
      <div className={`mobile-nav-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)} />

      {/* Mobile Navigation Drawer */}
      <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'active' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>Menu</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loggedInUser && (
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', minHeight: '32px' }}
                title="Log Out"
              >
                <LogOut size={14} /> Log Out
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-secondary"
              style={{ padding: '6px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
        </div>

        {loggedInUser && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', padding: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <User size={16} />
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.2, flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{loggedInUser.name}</div>
              <div style={{ color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{loggedInUser.role}</div>
            </div>
          </div>
        )}

        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <button
            onClick={() => handleTabChange('ticket-gen')}
            className={`drawer-nav-item ${currentTab === 'ticket-gen' ? 'active' : ''}`}
          >
            <FileText size={18} /> Register Complaint
          </button>
          <button
            onClick={() => handleTabChange('client-dash')}
            className={`drawer-nav-item ${currentTab === 'client-dash' ? 'active' : ''}`}
          >
            <Search size={18} /> Client Dashboard
          </button>
          <button
            onClick={() => handleTabChange('staff')}
            className={`drawer-nav-item ${currentTab === 'staff' ? 'active' : ''}`}
          >
            <Shield size={18} /> Staff Workspace
          </button>
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <ThemeToggle />
        </div>
      </div>

      {/* Main View Container */}
      <main style={{ flex: 1, padding: isMobile ? '12px' : '24px', position: 'relative' }}>
        
        {currentTab === 'ticket-gen' && <TicketGenView />}
        
        {currentTab === 'client-dash' && <ClientDashboardView />}
        
        {currentTab === 'staff' && (
          !loggedInUser ? (
            <LoginView onLogin={handleLogin} />
          ) : (loggedInUser.role === 'manager' || loggedInUser.role === 'senior_manager') ? (
            <ManagerDashboardView userRole={loggedInUser.role} />
          ) : (
            <EngineerDashboardView user={loggedInUser} />
          )
        )}

      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: isMobile ? '16px' : '24px',
        fontSize: isMobile ? '11px' : '12px',
        color: 'var(--text-tertiary)',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        © 2026 SEMCO Groups. All rights reserved.
      </footer>

      {/* Floating Interactive WhatsApp Simulator Widget */}
      <WhatsAppSimulator />

    </div>
  );
}
