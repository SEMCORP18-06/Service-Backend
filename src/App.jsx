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
    const saved = localStorage.getItem('proequip_tab');
    return saved || 'ticket-gen';
  });
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const saved = localStorage.getItem('proequip_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Persist tab and user to localStorage on change
  useEffect(() => {
    localStorage.setItem('proequip_tab', currentTab);
  }, [currentTab]);

  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem('proequip_user', JSON.stringify(loggedInUser));
    } else {
      localStorage.removeItem('proequip_user');
    }
  }, [loggedInUser]);

  const handleLogin = (user) => {
    setLoggedInUser(user);
    setCurrentTab('staff');
  };

  const handleLogout = () => {
    localStorage.removeItem('proequip_user');
    localStorage.removeItem('proequip_tab');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentTab('ticket-gen')}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Wrench size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', lineHeight: 1.1, fontWeight: 800 }}>PRO-EQUIP</h1>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Service Portal</span>
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
        © 2026 Process Equipment Service Management Portal & WhatsApp Chatbot. All rights reserved.
      </footer>

      {/* Floating Interactive WhatsApp Simulator Widget */}
      <WhatsAppSimulator />

    </div>
  );
}
