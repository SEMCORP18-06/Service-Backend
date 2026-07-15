import React, { useState, useEffect } from 'react';
import ThemeToggle from './components/ThemeToggle';
import WhatsAppSimulator from './components/WhatsAppSimulator';
import TicketGenView from './views/TicketGenView';
import ClientDashboardView from './views/ClientDashboardView';
import LoginView from './views/LoginView';
import ManagerDashboardView from './views/ManagerDashboardView';
import EngineerDashboardView from './views/EngineerDashboardView';
import { Wrench, Shield, Search, FileText, LogOut, User } from 'lucide-react';

export default function App() {
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
        padding: '16px 24px',
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
            <img src="/semco_logo.png" alt="SEMCO Logo" style={{ height: '32px', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', lineHeight: 1.1, fontWeight: 800 }}>SEMCORP</h1>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Process & Vacuum Systems</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setCurrentTab('ticket-gen')}
            className={`btn ${currentTab === 'ticket-gen' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={16} /> Register Complaint
          </button>
          
          <button
            onClick={() => setCurrentTab('client-dash')}
            className={`btn ${currentTab === 'client-dash' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Search size={16} /> Client Dashboard
          </button>
          
          <button
            onClick={() => setCurrentTab('staff')}
            className={`btn ${currentTab === 'staff' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Shield size={16} /> Staff Workspace
          </button>
        </nav>

        {/* Global Controls & Auth State */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {loggedInUser && currentTab === 'staff' && (
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

      </header>

      {/* Main View Container */}
      <main style={{ flex: 1, padding: '24px', position: 'relative' }}>
        
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
        padding: '24px',
        fontSize: '12px',
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
