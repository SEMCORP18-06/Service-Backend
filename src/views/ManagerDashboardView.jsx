import React, { useState, useEffect, useRef } from 'react';
import useResponsive from '../hooks/useResponsive.js';
import { socket } from '../socket';
import { 
  Building, User, Mail, Phone, Calendar, Clock, 
  MessageSquare, Send, CheckCircle2, AlertCircle, 
  PlusCircle, RefreshCw, Layers, TrendingUp, BarChart3, Users
} from 'lucide-react';

export default function ManagerDashboardView({ userRole = 'manager' }) {
  const { isMobile, isTablet } = useResponsive();
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  
  // User Management State
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' or 'raise'
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Engineers & Assignment
  const [engineers, setEngineers] = useState([]);
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  const [scheduledSlot, setScheduledSlot] = useState('');
  
  // Real-time Service Logs
  const [logs, setLogs] = useState([]);
  const [logInput, setLogInput] = useState('');
  const logsEndRef = useRef(null);

  // WhatsApp Two-Way Messaging
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  // Manual Raise Ticket Form States
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [manualCompanyId, setManualCompanyId] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [manualCustomProductName, setManualCustomProductName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Manager Edit Ticket States
  const [isEditing, setIsEditing] = useState(false);
  const [editProductName, setEditProductName] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editEtaAssigned, setEditEtaAssigned] = useState('');
  const [editEtaInProgress, setEditEtaInProgress] = useState('');
  const [editEtaResolved, setEditEtaResolved] = useState('');

  // Invoice Modal States
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceSpareParts, setInvoiceSpareParts] = useState('');
  const [invoiceServiceCost, setInvoiceServiceCost] = useState('');
  const [invoiceSparePartsCost, setInvoiceSparePartsCost] = useState('');
  const [invoicePurchaseDate, setInvoicePurchaseDate] = useState('');

  // Mobile Collapsible Section States
  const [dispatchOpenMobile, setDispatchOpenMobile] = useState(false);
  const [logsOpenMobile, setLogsOpenMobile] = useState(false);
  const [chatOpenMobile, setChatOpenMobile] = useState(false);

  const [manualCompanyInput, setManualCompanyInput] = useState('');
  const [manualSuggestions, setManualSuggestions] = useState([]);
  const [manualShowSuggestions, setManualShowSuggestions] = useState(false);

  const getSuggestionsList = (val) => {
    const query = val.trim().toLowerCase();
    if (!query) return [];

    const queryTokens = query.split(/\s+/).filter(Boolean);
    
    const scored = companies.map(c => {
      const nameLower = c.name.toLowerCase();
      let score = 0;

      // Clean name of common suffixes
      const cleanName = nameLower
        .replace(/\bltd\b|\blimited\b|\bpvt\b|\bprivate\b/g, '')
        .trim();

      // 1. Exact match (cleaned)
      if (cleanName === query) {
        score = 100;
      }
      // 2. Starts with entire query
      else if (nameLower.startsWith(query)) {
        score = 80;
      }
      // 3. Word starts with query (e.g. "Industries" starts with "ind" in "Aarti Industries")
      else if (nameLower.split(/\s+/).some(word => word.startsWith(query))) {
        score = 60;
      }
      // 4. Contains entire query phrase
      else if (nameLower.includes(query)) {
        score = 40;
      }
      // 5. Multi-token match (all query tokens exist in company name)
      else {
        const matchesAllTokens = queryTokens.every(token => 
          nameLower.split(/\s+/).some(word => word.startsWith(token) || word.includes(token))
        );
        if (matchesAllTokens) {
          if (queryTokens[0] && nameLower.startsWith(queryTokens[0])) {
            score = 30;
          } else {
            score = 20;
          }
        }
      }

      return { company: c, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.company.name.localeCompare(b.company.name);
      })
      .map(item => item.company)
      .slice(0, 15);
  };

  const handleManualCompanyInputChange = (e) => {
    const val = e.target.value;
    setManualCompanyInput(val);
    setManualCompanyId(val);

    if (val.trim().length > 0) {
      setManualSuggestions(getSuggestionsList(val));
      setManualShowSuggestions(true);
    } else {
      setManualSuggestions([]);
      setManualShowSuggestions(false);
    }
  };

  const handleSelectManualSuggestion = (s) => {
    setManualCompanyInput(s.name);
    setManualCompanyId(s.id);
    setManualSuggestions([]);
    setManualShowSuggestions(false);
  };

  // Fetch all initial data
  useEffect(() => {
    fetchTickets();
    fetchEngineers();
    fetchCompanies();
    fetchProducts();
    if (userRole === 'senior_manager') {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    setUserLoading(true);
    try {
      const res = await fetch('https://service-backend-jhq0.onrender.com/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setUserLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        throw new Error("Failed to update role");
      }
      setSuccessMsg("User role updated successfully.");
      setError("");
      fetchUsers();
      fetchEngineers();
    } catch (err) {
      console.error(err);
      setError("Failed to update user role.");
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch('https://service-backend-jhq0.onrender.com/api/tickets');
      const data = await res.json();
      setTickets(data);
      // Update selected ticket in place if it's already selected
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    }
  };

  const fetchEngineers = async () => {
    try {
      const res = await fetch('https://service-backend-jhq0.onrender.com/api/engineers');
      const data = await res.json();
      setEngineers(data);
    } catch (err) {
      console.error("Error fetching engineers:", err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('https://service-backend-jhq0.onrender.com/api/companies');
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('https://service-backend-jhq0.onrender.com/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  // Handle Filtering
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredTickets(tickets);
    } else if (statusFilter === 'escalated') {
      setFilteredTickets(tickets.filter(t => t.is_escalated));
    } else {
      setFilteredTickets(tickets.filter(t => t.status === statusFilter));
    }
  }, [tickets, statusFilter]);



  // Load selected ticket details, logs, and chat
  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setSelectedEngineerId(ticket.assigned_engineer_id || '');
    setIsEditing(false); // Reset edit mode

    // Initialize edit fields
    setEditProductName(ticket.product_name || '');
    setEditSerialNumber(ticket.serial_number || '');
    setEditEmail(ticket.client_email || '');
    setEditPhone(ticket.client_whatsapp || '');
    setEditDesc(ticket.description || '');
    setEditEtaAssigned(ticket.eta_assigned ? new Date(ticket.eta_assigned).toISOString().slice(0, 10) : '');
    setEditEtaInProgress(ticket.eta_in_progress ? new Date(ticket.eta_in_progress).toISOString().slice(0, 10) : '');
    setEditEtaResolved(ticket.eta_resolved ? new Date(ticket.eta_resolved).toISOString().slice(0, 10) : '');
    
    // Format date string for datetime-local input
    if (ticket.scheduled_slot) {
      const d = new Date(ticket.scheduled_slot);
      const formatted = d.toISOString().slice(0, 16);
      setScheduledSlot(formatted);
    } else {
      setScheduledSlot('');
    }

    // Join room for service logs
    socket.emit('join_ticket', ticket.id);

    // Join room for WhatsApp chat updates
    const cleanNum = ticket.client_whatsapp.replace(/\D/g, '');
    socket.emit('join_chat', cleanNum);

    // Fetch Logs
    fetchLogs(ticket.id);

    // Fetch WhatsApp Messages
    fetchWhatsAppHistory(cleanNum);

    if (isMobile) {
      setShowDetailOnMobile(true);
    }
  };

  const fetchLogs = async (ticketId) => {
    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${ticketId}/logs`);
      const data = await res.json();
      setLogs(data);
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWhatsAppHistory = async (whatsapp) => {
    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/whatsapp/messages/${whatsapp}`);
      const data = await res.json();
      setChatMessages(data);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error(err);
    }
  };

  // Real-time socket event listeners
  useEffect(() => {
    const handleNewLog = (newLog) => {
      if (selectedTicket && newLog.ticket_id === selectedTicket.id) {
        setLogs((prev) => {
          if (prev.some(l => l.id === newLog.id)) return prev;
          return [...prev, newLog];
        });
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    const handleNewWhatsAppMessage = (msg) => {
      if (selectedTicket) {
        const cleanClientNum = selectedTicket.client_whatsapp.replace(/\D/g, '');
        const cleanMsgNum = msg.client_whatsapp.replace(/\D/g, '');
        if (cleanClientNum === cleanMsgNum) {
          setChatMessages((prev) => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    };

    const handleGlobalUpdate = () => {
      fetchTickets();
    };

    socket.on('new_log', handleNewLog);
    socket.on('new_whatsapp_message', handleNewWhatsAppMessage);
    socket.on('ticket_created', handleGlobalUpdate);
    socket.on('ticket_updated', handleGlobalUpdate);
    socket.on('escalation_check_complete', handleGlobalUpdate);

    return () => {
      socket.off('new_log', handleNewLog);
      socket.off('new_whatsapp_message', handleNewWhatsAppMessage);
      socket.off('ticket_created', handleGlobalUpdate);
      socket.off('ticket_updated', handleGlobalUpdate);
      socket.off('escalation_check_complete', handleGlobalUpdate);
    };
  }, [selectedTicket]);

  // Add visit log comment
  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!logInput.trim() || !selectedTicket) return;

    const text = logInput;
    setLogInput('');

    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${selectedTicket.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: 1, // Manager
          author_name: "Sanjay Kumar (Manager)",
          comment: text
        })
      });
      if (res.ok) {
        fetchTickets(); // Refresh lists
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send WhatsApp message directly to Client from portal
  const handleSendWhatsApp = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedTicket) return;

    const text = chatInput;
    setChatInput('');

    try {
      const res = await fetch('https://service-backend-jhq0.onrender.com/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          client_whatsapp: selectedTicket.client_whatsapp,
          message_text: text
        })
      });
      if (res.ok) {
        // Will be updated via socket listener
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Assign ticket to engineer
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedEngineerId || !scheduledSlot || !selectedTicket) {
      setError("Please select both an engineer and a time slot.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${selectedTicket.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineerId: selectedEngineerId,
          scheduledSlot: new Date(scheduledSlot).toISOString()
        })
      });

      if (!res.ok) throw new Error("Assignment failed.");
      
      const updated = await res.json();
      setSelectedTicket(updated);
      setSuccessMsg("Engineer assigned & notifications pushed to WhatsApp successfully!");
      fetchTickets();
    } catch (err) {
      console.error(err);
      setError("Error assigning engineer.");
    } finally {
      setLoading(false);
    }
  };

  // Manager saves modified ticket details
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccessMsg('');
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: editProductName,
          serial_number: editSerialNumber,
          client_email: editEmail,
          client_whatsapp: editPhone,
          description: editDesc,
          eta_assigned: editEtaAssigned ? new Date(editEtaAssigned).toISOString() : null,
          eta_in_progress: editEtaInProgress ? new Date(editEtaInProgress).toISOString() : null,
          eta_resolved: editEtaResolved ? new Date(editEtaResolved).toISOString() : null
        })
      });

      if (!res.ok) throw new Error("Failed to save changes.");
      
      const updated = await res.json();
      setSelectedTicket(updated);
      setIsEditing(false);
      setSuccessMsg("Ticket details updated successfully!");
      fetchTickets();
    } catch (err) {
      console.error(err);
      setError("Error updating ticket details.");
    }
  };

  // Manually Raise Ticket
  const handleManualRaise = async (e) => {
    e.preventDefault();
    if (!manualCompanyId || !manualProductName || !manualEmail || !manualPhone || !manualDesc) {
      setError("Please fill out all fields.");
      return;
    }

    if (manualProductName === 'Other' && !manualCustomProductName.trim()) {
      setError("Please enter the product name manually.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('https://service-backend-jhq0.onrender.com/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: manualCompanyId,
          product_name: manualProductName === 'Other' ? manualCustomProductName : manualProductName,
          client_whatsapp: manualPhone,
          client_email: manualEmail,
          description: manualDesc
        })
      });

      if (!res.ok) throw new Error("Could not raise ticket.");
      const ticket = await res.json();
      
      setSuccessMsg(`Ticket ${ticket.ticket_number} created successfully!`);
      // Reset form
      setManualCompanyId('');
      setManualCompanyInput('');
      setManualSuggestions([]);
      setManualProductName('');
      setManualCustomProductName('');
      setManualEmail('');
      setManualPhone('');
      setManualDesc('');
      fetchTickets();
      setActiveTab('tickets'); // Switch back to listing
    } catch (err) {
      console.error(err);
      setError("Failed to create ticket.");
    } finally {
      setLoading(false);
    }
  };

  // Close ticket function
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'closed',
          author_id: 1,
          author_name: "Sanjay Kumar (Manager)"
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '12px 0' : '20px 0' }}>
      
      {/* Header Controls */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '12px' : '20px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '10px' }}><Layers size={isMobile ? 20 : 24} style={{ color: 'var(--primary)' }} /> Service Manager Panel</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Assign tasks, dispatch engineers, and communicate directly via WhatsApp.</p>
        </div>
        
        <div style={{ display: 'flex', gap: isMobile ? '6px' : '12px', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${activeTab === 'tickets' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('tickets'); setError(''); setSuccessMsg(''); }}
            style={{ padding: isMobile ? '8px 12px' : '12px 24px', fontSize: isMobile ? '12px' : '14px' }}
          >
            Ticket Workspace
          </button>
          <button 
            className={`btn ${activeTab === 'raise' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('raise'); setError(''); setSuccessMsg(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: isMobile ? '8px 12px' : '12px 24px', fontSize: isMobile ? '12px' : '14px' }}
          >
            <PlusCircle size={14} /> Raise Ticket
          </button>
          {userRole === 'senior_manager' && (
            <>
              <button 
                className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveTab('analytics'); setError(''); setSuccessMsg(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: isMobile ? '8px 12px' : '12px 24px', fontSize: isMobile ? '12px' : '14px' }}
              >
                <TrendingUp size={14} /> Analytics
              </button>
              <button 
                className={`btn ${activeTab === 'manage-users' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setActiveTab('manage-users'); setError(''); setSuccessMsg(''); fetchUsers(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: isMobile ? '8px 12px' : '12px 24px', fontSize: isMobile ? '12px' : '14px' }}
              >
                <Users size={14} /> Manage Users
              </button>
            </>
          )}
          <button 
            onClick={fetchTickets}
            className="btn btn-secondary"
            style={{ padding: isMobile ? '8px 12px' : '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Reload Tickets"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
          {successMsg}
        </div>
      )}

      {activeTab === 'raise' && (
        /* Manual Ticket Raising Form */
        <div className="card-glass animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', padding: isMobile ? '20px' : '32px', width: '100%' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '18px' }}>Log a Direct Client Complaint</h2>
          <form onSubmit={handleManualRaise} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <label htmlFor="man-company">Company</label>
              <input
                type="text"
                id="man-company"
                value={manualCompanyInput}
                onChange={handleManualCompanyInputChange}
                onFocus={() => {
                  if (manualCompanyInput.trim().length > 0) {
                    setManualSuggestions(getSuggestionsList(manualCompanyInput));
                  }
                  setManualShowSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setManualShowSuggestions(false), 250);
                }}
                placeholder="Type company name (e.g. APEX)"
                required
                autoComplete="off"
              />
              {manualShowSuggestions && manualSuggestions.length > 0 && (
                <ul className="suggestions-list" style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  listStyle: 'none',
                  padding: '4px 0',
                  margin: '4px 0 0 0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {manualSuggestions.map((s) => (
                    <li
                      key={s.id}
                      onMouseDown={() => handleSelectManualSuggestion(s)}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-tertiary)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label htmlFor="man-product">Product Name</label>
              <select 
                id="man-product"
                value={manualProductName} 
                onChange={(e) => {
                  setManualProductName(e.target.value);
                  if (e.target.value !== 'Other') setManualCustomProductName('');
                }}
                required
              >
                <option value="">-- Select Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.product_name}>{p.product_name} ({p.product_code})</option>
                ))}
                <option value="Other">Other (Enter Manually)</option>
              </select>

              {manualProductName === 'Other' && (
                <div style={{ marginTop: '10px' }}>
                  <label htmlFor="man-custom-product" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Type Custom Product Name
                  </label>
                  <input
                    id="man-custom-product"
                    type="text"
                    value={manualCustomProductName}
                    onChange={(e) => setManualCustomProductName(e.target.value)}
                    placeholder="Enter manual product name (e.g. SPECIAL DRILL SKID)"
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="man-email">Client Email</label>
              <input 
                id="man-email"
                type="email" 
                value={manualEmail} 
                onChange={(e) => setManualEmail(e.target.value)} 
                placeholder="client@company.com" 
                required 
              />
            </div>

            <div>
              <label htmlFor="man-phone">Client WhatsApp Phone Number</label>
              <input 
                id="man-phone"
                type="text" 
                value={manualPhone} 
                onChange={(e) => setManualPhone(e.target.value)} 
                placeholder="e.g. 9988776655" 
                required 
              />
            </div>

            <div>
              <label htmlFor="man-desc">Problem Description</label>
              <textarea 
                id="man-desc"
                rows="4" 
                value={manualDesc} 
                onChange={(e) => setManualDesc(e.target.value)} 
                placeholder="Describe the client issue..." 
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Register Ticket'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'tickets' && (
        /* Main Tickets Workspace */
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '280px 1fr' : '320px 1fr'), gap: isMobile ? '16px' : '20px', minHeight: '600px' }} className="animate-fade-in">
          
          {/* Ticket Listing Column */}
          {(!isMobile || !showDetailOnMobile) && (
          <div className="card-glass" style={{ padding: isMobile ? '14px' : '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
            <div>
              <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>Filters</h3>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '13px' }}
              >
                <option value="all">All Statuses ({tickets.length})</option>
                <option value="open">Open ({tickets.filter(t => t.status === 'open').length})</option>
                <option value="escalated">Escalated ({tickets.filter(t => t.is_escalated).length})</option>
                <option value="assigned">Assigned ({tickets.filter(t => t.status === 'assigned').length})</option>
                <option value="in_progress">In Progress ({tickets.filter(t => t.status === 'in_progress').length})</option>
                <option value="resolved">Resolved ({tickets.filter(t => t.status === 'resolved').length})</option>
                <option value="closed">Closed ({tickets.filter(t => t.status === 'closed').length})</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                  No tickets found matching this filter.
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isActive = selectedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTicket(t)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: isActive ? 'var(--primary-light)' : 'var(--bg-secondary)',
                        border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'var(--font-heading)' }}>{t.ticket_number}</span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {t.is_escalated && (
                            <span className="badge badge-danger" style={{ fontSize: '9px', padding: '2px 6px' }}>
                              ⚠️ Escalated
                            </span>
                          )}
                          <span className={`badge badge-${t.status}`} style={{ fontSize: '9px', padding: '2px 6px' }}>{t.status}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.product_name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span>{t.company_name}</span>
                        <span>{new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          )}
          
          {/* Ticket Workspace Column */}
          {selectedTicket && (!isMobile || showDetailOnMobile) ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: isMobile ? '16px' : '20px' }}>
              
              {/* Workspace Left: Ticket Info, Logs, Assignment */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {isMobile && (
                  <button className="mobile-back-btn" onClick={() => setShowDetailOnMobile(false)}>← Back to List</button>
                )}
                
                {/* Details Card */}
                <div className="card-glass" style={{ padding: isMobile ? '14px' : '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {isEditing ? (
                    <form onSubmit={handleSaveChanges} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Edit Ticket Details</h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11px' }}>Product Name</label>
                          <input type="text" value={editProductName} onChange={(e) => setEditProductName(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px' }}>Specific Product Serial No</label>
                          <input type="text" value={editSerialNumber} onChange={(e) => setEditSerialNumber(e.target.value)} placeholder="Enter Specific Product/Serial No" />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px' }}>Client Email</label>
                          <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
                        </div>
                        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                          <label style={{ fontSize: '11px' }}>Client WhatsApp Number</label>
                          <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px' }}>Tentative ETA: In Progress</label>
                          <input type="date" value={editEtaInProgress} onChange={(e) => setEditEtaInProgress(e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px' }}>Tentative ETA: Resolved</label>
                          <input type="date" value={editEtaResolved} onChange={(e) => setEditEtaResolved(e.target.value)} />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px' }}>Complaint Description</label>
                        <textarea rows="3" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} required style={{ fontSize: '12.5px' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)} style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Save Changes</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {selectedTicket.is_escalated && (
                        <div style={{ 
                          backgroundColor: 'var(--danger-light)', 
                          color: 'var(--danger)', 
                          padding: '10px 14px', 
                          borderRadius: '8px', 
                          fontSize: '12.5px', 
                          fontWeight: 600, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          marginBottom: '10px', 
                          border: '1px solid rgba(239, 68, 68, 0.2)' 
                        }}>
                          <AlertCircle size={15} />
                          <span>Escalated to Senior Manager (Unassigned for &gt; 24 Hours)</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-heading)' }}>{selectedTicket.ticket_number}</h2>
                          <span className={`badge badge-${selectedTicket.status}`} style={{ marginTop: '4px' }}>{selectedTicket.status}</span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => setIsEditing(true)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--border-focus)', color: 'var(--border-focus)' }}
                          >
                            Edit Details
                          </button>
                          {selectedTicket.status !== 'closed' && (
                            <button 
                              onClick={handleCloseTicket}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid var(--danger)', color: 'var(--danger)' }}
                            >
                              Close Ticket
                            </button>
                          )}
                        </div>
                      </div>

                       <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                        <div>🏢 Company: <strong>{selectedTicket.company_name}</strong></div>
                        <div>🔧 Product: <strong>{selectedTicket.product_name}</strong></div>
                        <div>🏷️ Specific Product No: <strong>{selectedTicket.serial_number || 'N/A'}</strong></div>
                        <div>📧 Email: <strong>{selectedTicket.client_email}</strong></div>
                        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>📱 WhatsApp: <strong>{selectedTicket.client_whatsapp}</strong></div>
                      </div>

                      <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '10px' }}>Tentative status completion timeframes</div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                          <div>🕒 In Progress:<br/><strong style={{ color: '#10b981' }}>{selectedTicket.eta_in_progress ? new Date(selectedTicket.eta_in_progress).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</strong></div>
                          <div>🕒 Resolved:<br/><strong style={{ color: '#f59e0b' }}>{selectedTicket.eta_resolved ? new Date(selectedTicket.eta_resolved).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</strong></div>
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}>Description</div>
                        <p style={{ color: 'var(--text-secondary)' }}>{selectedTicket.description}</p>
                      </div>

                      {/* Service Resolution Details (Visible to Manager/Senior Manager) */}
                      {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (selectedTicket.final_comments || selectedTicket.service_form_image) && (
                        <div style={{ 
                          padding: '14px', 
                          backgroundColor: 'var(--bg-tertiary)', 
                          borderRadius: '8px', 
                          fontSize: '12.5px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '10px',
                          border: '1px dashed var(--accent)' 
                        }}>
                          <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            🛠️ Service Resolution Details
                          </div>
                          
                          {selectedTicket.final_comments && (
                            <div>
                              <strong style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', textTransform: 'uppercase' }}>Engineer Comments</strong>
                              <p style={{ color: 'var(--text-primary)', margin: '4px 0 0 0', fontStyle: 'italic', fontSize: '13px' }}>
                                "{selectedTicket.final_comments}"
                              </p>
                            </div>
                          )}

                          {selectedTicket.service_form_image && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <strong style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', textTransform: 'uppercase' }}>Service Form Attachment</strong>
                              <div style={{ position: 'relative', marginTop: '4px' }}>
                                <img 
                                  src={selectedTicket.service_form_image} 
                                  alt="Service Form" 
                                  style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'block' }} 
                                />
                                <a 
                                  href={selectedTicket.service_form_image} 
                                  download={`service-form-${selectedTicket.ticket_number}.png`}
                                  className="btn btn-secondary"
                                  style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    padding: '6px 12px', 
                                    fontSize: '11px', 
                                    marginTop: '8px',
                                    border: '1px solid var(--border-color)'
                                  }}
                                >
                                  📥 Download Service Form Image
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Internal Status for Manager & Senior Manager */}
                      {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                        <div style={{ 
                          padding: '14px', 
                          backgroundColor: 'var(--bg-tertiary)', 
                          borderRadius: '8px', 
                          fontSize: '12px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '8px',
                          border: '1px solid var(--border-color)' 
                        }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                            <span>🔒 Internal Status (Manager View Only)</span>
                            <span className={`badge badge-${(selectedTicket.internal_status || 'Pending').toLowerCase().replace(/\s+/g, '-')}`} style={{ margin: 0, padding: '2px 8px', fontSize: '10px' }}>
                              {selectedTicket.internal_status || 'Pending'}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                            <select
                              value={selectedTicket.internal_status || 'Pending'}
                              onChange={async (e) => {
                                const newIntStatus = e.target.value;
                                try {
                                  const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${selectedTicket.id}/internal-status`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ internalStatus: newIntStatus })
                                  });
                                  if (res.ok) {
                                    const updated = await res.json();
                                    setSelectedTicket(updated);
                                    fetchTickets();
                                  }
                                } catch (err) {
                                  console.error("Error updating internal status:", err);
                                }
                              }}
                              style={{ 
                                flex: 1, 
                                padding: '6px 10px', 
                                fontSize: '12px', 
                                borderRadius: '6px', 
                                backgroundColor: 'var(--bg-secondary)', 
                                border: '1px solid var(--border-color)', 
                                color: 'var(--text-primary)' 
                              }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Authenticating Final Payment">Authenticating Final Payment</option>
                              <option value="Final Payment received">Final Payment received</option>
                              <option value="Invoiced">Invoiced</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              setInvoiceSpareParts(selectedTicket.invoice_spare_parts || '');
                              setInvoiceServiceCost(selectedTicket.invoice_service_cost || '');
                              setInvoiceSparePartsCost(selectedTicket.invoice_spare_parts_cost || '');
                              setInvoicePurchaseDate(selectedTicket.purchase_date ? new Date(selectedTicket.purchase_date).toISOString().slice(0, 10) : '');
                              setShowInvoiceModal(true);
                            }}
                            style={{ width: '100%', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            📄 Generate / Edit Invoice
                          </button>

                          {selectedTicket.invoice_total_amount !== undefined && selectedTicket.invoice_total_amount !== null && (
                            <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '9.5px', textTransform: 'uppercase', marginBottom: '2px' }}>🧾 Invoice Details</div>
                              <div>⚙️ Spare Parts: <strong style={{ color: 'var(--text-primary)' }}>{selectedTicket.invoice_spare_parts || 'None'}</strong></div>
                              <div>💵 Service Cost: <strong style={{ color: 'var(--text-primary)' }}>₹{selectedTicket.invoice_total_amount === (selectedTicket.invoice_spare_parts_cost || 0) ? 0 : selectedTicket.invoice_service_cost} {selectedTicket.invoice_total_amount === (selectedTicket.invoice_spare_parts_cost || 0) && '(Warranty Active)'}</strong></div>
                              <div>🔩 Spare Parts Cost: <strong style={{ color: 'var(--text-primary)' }}>₹{selectedTicket.invoice_spare_parts_cost || 0}</strong></div>
                              <div>💰 Final Amount: <strong style={{ color: 'var(--accent)', fontSize: '12px' }}>₹{selectedTicket.invoice_total_amount}</strong></div>
                              <div>📅 Purchase Date: <strong style={{ color: 'var(--text-primary)' }}>{selectedTicket.purchase_date ? new Date(selectedTicket.purchase_date).toLocaleDateString() : 'N/A'}</strong></div>
                            </div>
                          )}

                        </div>
                      )}
                    </>
                  )}
                </div>

                 <div className="card-glass" style={{ padding: isMobile ? '12px 16px' : '20px' }}>
                   <h3 
                     onClick={() => isMobile && setDispatchOpenMobile(!dispatchOpenMobile)}
                     style={{ 
                       fontSize: '15px', 
                       marginBottom: (!isMobile || dispatchOpenMobile) ? '12px' : '0', 
                       display: 'flex', 
                       alignItems: 'center', 
                       justifyContent: 'space-between',
                       cursor: isMobile ? 'pointer' : 'default',
                       userSelect: 'none'
                     }}
                   >
                     <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <Calendar size={18} style={{ color: 'var(--accent)' }} /> Dispatch Engineer
                     </span>
                     {isMobile && (
                       <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                         {dispatchOpenMobile ? '▲' : '▼'}
                       </span>
                     )}
                   </h3>
                   
                   {(!isMobile || dispatchOpenMobile) && (
                     <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                         <div>
                           <label htmlFor="assign-eng" style={{ fontSize: '12px' }}>Select Available Engineer</label>
                           <select 
                             id="assign-eng"
                             value={selectedEngineerId} 
                             onChange={(e) => setSelectedEngineerId(e.target.value)}
                             required
                           >
                             <option value="">-- Choose Engineer --</option>
                             {engineers.map(e => (
                               <option key={e.id} value={e.id}>{e.name} {e.is_available ? '(Available)' : '(Busy)'}</option>
                             ))}
                           </select>
                         </div>

                         <div>
                           <label htmlFor="assign-slot" style={{ fontSize: '12px' }}>Schedule Time Slot</label>
                           <input 
                             id="assign-slot"
                             type="datetime-local" 
                             value={scheduledSlot}
                             onChange={(e) => setScheduledSlot(e.target.value)}
                             required
                           />
                         </div>
                       </div>

                       <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', width: isMobile ? '100%' : 'auto', minHeight: '44px' }} disabled={loading}>
                         {loading ? 'Dispatching...' : 'Assign Engineer'}
                       </button>
                     </form>
                   )}
                 </div>

                {/* Service Logs / Comments Card */}
                <div className="card-glass" style={{ padding: isMobile ? '12px 16px' : '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  <h3 
                    onClick={() => isMobile && setLogsOpenMobile(!logsOpenMobile)}
                    style={{ 
                      fontSize: '15px', 
                      borderBottom: (!isMobile || logsOpenMobile) ? '1px solid var(--border-color)' : 'none', 
                      paddingBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: isMobile ? 'pointer' : 'default',
                      userSelect: 'none',
                      marginBottom: 0
                    }}
                  >
                    <span>Service Logs (Real-time Timeline)</span>
                    {isMobile && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {logsOpenMobile ? '▲' : '▼'}
                      </span>
                    )}
                  </h3>
                  
                  {(!isMobile || logsOpenMobile) && (
                    <>
                      <div style={{ maxHeight: isMobile ? '160px' : '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                        {logs.length === 0 ? (
                          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', padding: '12px' }}>No logs registered yet.</div>
                        ) : (
                          <div className="timeline">
                            {logs.map((log) => (
                              <div key={log.id} className="timeline-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.author_name}</span>
                                  <span>{new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', backgroundColor: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                  {log.comment}
                                </p>
                              </div>
                            ))}
                            <div ref={logsEndRef} />
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleAddLog} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <input 
                          type="text" 
                          value={logInput} 
                          onChange={(e) => setLogInput(e.target.value)} 
                          placeholder="Add system comment or internal note..." 
                          style={{ borderRadius: '24px', padding: '8px 16px', fontSize: '12px' }}
                          required 
                        />
                        <button type="submit" className="btn btn-secondary" style={{ padding: '0 16px', borderRadius: '24px', fontSize: '12px', minHeight: '38px' }}>Add Log</button>
                      </form>
                    </>
                  )}
                </div>

              </div>

              {/* Workspace Right: Direct WhatsApp Messaging */}
              <div className="card-glass" style={{ padding: isMobile ? '12px 16px' : '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: isMobile ? 'none' : '2px solid rgba(16, 185, 129, 0.1)' }}>
                <div 
                  onClick={() => isMobile && setChatOpenMobile(!chatOpenMobile)}
                  style={{ 
                    borderBottom: (!isMobile || chatOpenMobile) ? '1px solid var(--border-color)' : 'none', 
                    paddingBottom: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    color: 'var(--success)',
                    cursor: isMobile ? 'pointer' : 'default',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={20} />
                    <div>
                      <h3 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>WhatsApp Live Chat</h3>
                      {!isMobile && <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Converse directly with Client ({selectedTicket.client_whatsapp})</p>}
                    </div>
                  </div>
                  {isMobile && (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {chatOpenMobile ? '▲' : '▼'}
                    </span>
                  )}
                </div>

                {(!isMobile || chatOpenMobile) && (
                  <>
                    {isMobile && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '-4px' }}>
                        Client Number: <strong>{selectedTicket.client_whatsapp}</strong>
                      </div>
                    )}
                    {/* Message display container */}
                    <div style={{
                      flex: 1,
                      maxHeight: isMobile ? '250px' : '420px',
                      minHeight: isMobile ? '200px' : '350px',
                      overflowY: 'auto',
                      backgroundColor: 'var(--bg-primary)',
                      backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 0)',
                      backgroundSize: '16px 16px',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      {chatMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-tertiary)', fontSize: '12px' }}>No chat history found.</div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isManager = msg.sender === 'manager';
                          const isBot = msg.sender === 'bot';
                          
                          let bubbleBg = 'var(--bg-secondary)';
                          let textCol = 'var(--text-primary)';
                          let borderCol = 'var(--border-color)';
                          let align = 'flex-start';
                          let senderName = 'Client';

                          if (isManager) {
                            bubbleBg = 'var(--primary-light)';
                            borderCol = 'rgba(99, 102, 241, 0.2)';
                            align = 'flex-end';
                            senderName = 'You (Manager)';
                          } else if (isBot) {
                            bubbleBg = 'var(--warning-light)';
                            borderCol = 'rgba(245, 158, 11, 0.2)';
                            align = 'flex-start';
                            senderName = 'Bot Automated';
                          }

                          return (
                            <div 
                              key={msg.id}
                              style={{
                                alignSelf: align,
                                backgroundColor: bubbleBg,
                                color: textCol,
                                border: `1px solid ${borderCol}`,
                                padding: '8px 12px',
                                borderRadius: isManager ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                maxWidth: '85%',
                                fontSize: '12.5px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                whiteSpace: 'pre-line'
                              }}
                            >
                              <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '2px', textTransform: 'uppercase' }}>
                                {senderName}
                              </div>
                              <div>{msg.message_text}</div>
                              <div style={{ fontSize: '8px', color: 'var(--text-tertiary)', textAlign: 'right', marginTop: '2px' }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Send chat input */}
                    <form onSubmit={handleSendWhatsApp} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)} 
                        placeholder="Type WhatsApp message..." 
                        style={{ borderRadius: '24px', padding: '10px 16px', fontSize: '13px' }}
                        required 
                      />
                      <button type="submit" className="btn btn-primary" style={{ borderRadius: '50%', padding: 0, width: isMobile ? '44px' : '40px', height: isMobile ? '44px' : '40px', minHeight: isMobile ? '44px' : '40px', minWidth: isMobile ? '44px' : '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Send size={16} />
                      </button>
                    </form>
                  </>
                )}
              </div>

            </div>
          ) : (!isMobile || !showDetailOnMobile) && (
            <div className="card-glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px' : '40px', color: 'var(--text-tertiary)', flex: 1 }}>
              <AlertCircle size={isMobile ? 32 : 40} style={{ marginBottom: '12px', color: 'var(--primary)' }} />
              <h3 style={{ fontSize: isMobile ? '14px' : '16px', textAlign: 'center' }}>Select a ticket from the left workspace list to manage details.</h3>
            </div>
          )}

        </div>
      )}

      {activeTab === 'analytics' && (
        /* Analytics & DB Stats View */
        <div className="card-glass animate-fade-in" style={{ padding: isMobile ? '16px' : '32px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div>
            <h2 style={{ fontSize: isMobile ? '18px' : '20px', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 style={{ color: 'var(--primary)' }} /> Database Metrics & Analytics</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Live system summary of ticket statuses and engineer workload distribution.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
            
            {/* Status Breakdown Card */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '15px', marginBottom: '16px', fontWeight: 700 }}>Ticket Status Distribution</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Open', key: 'open', color: 'var(--primary)' },
                  { label: 'Assigned', key: 'assigned', color: 'var(--accent)' },
                  { label: 'In Progress', key: 'in_progress', color: '#10b981' },
                  { label: 'Resolved', key: 'resolved', color: '#f59e0b' },
                  { label: 'Closed', key: 'closed', color: 'var(--text-tertiary)' }
                ].map(({ label, key, color }) => {
                  const count = tickets.filter(t => t.status === key).length;
                  const percent = tickets.length > 0 ? (count / tickets.length) * 100 : 0;
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span>{label}</span>
                        <strong>{count} ({percent.toFixed(0)}%)</strong>
                      </div>
                      <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: color, transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* General Database Summary Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr', gap: '12px' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Total Registered Tickets</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>{tickets.length}</div>
                </div>
                <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <Layers size={20} />
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Escalated Tickets</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-heading)' }}>{tickets.filter(t => t.is_escalated).length}</div>
                </div>
                <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                  <AlertCircle size={20} />
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Active Issues (Unresolved)</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-heading)' }}>{tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length}</div>
                </div>
                <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent)' }}>
                  <AlertCircle size={20} />
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Completed Cases</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-heading)' }}>{tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length}</div>
                </div>
                <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </div>

          </div>

          {/* Engineer Performance Breakdown Table */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '16px', fontWeight: 700 }}>Engineer Ticket Load Status</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Engineer Name</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Total Assigned</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Assigned</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>In Progress</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Resolved</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Closed</th>
                    <th style={{ padding: '10px', width: '150px' }}>Workload Index</th>
                  </tr>
                </thead>
                <tbody>
                  {engineers.map(eng => {
                    const engTickets = tickets.filter(t => t.assigned_engineer_id === eng.id);
                    const assignedCount = engTickets.filter(t => t.status === 'assigned').length;
                    const progressCount = engTickets.filter(t => t.status === 'in_progress').length;
                    const resolvedCount = engTickets.filter(t => t.status === 'resolved').length;
                    const closedCount = engTickets.filter(t => t.status === 'closed').length;
                    
                    const activeCount = assignedCount + progressCount;
                    const workloadPercent = Math.min((activeCount / 5) * 100, 100);
                    const workloadColor = activeCount >= 4 ? 'var(--danger)' : activeCount >= 2 ? 'var(--warning)' : '#10b981';

                    return (
                      <tr key={eng.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 600 }}>{eng.name}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ 
                            padding: '3px 8px', 
                            borderRadius: '12px', 
                            fontSize: '11px', 
                            backgroundColor: eng.is_available ? 'rgba(16, 185, 129, 0.1)' : 'var(--danger-light)', 
                            color: eng.is_available ? '#10b981' : 'var(--danger)' 
                          }}>
                            {eng.is_available ? 'Available' : 'Busy'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700 }}>{engTickets.length}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--accent)' }}>{assignedCount}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#10b981' }}>{progressCount}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: '#f59e0b' }}>{resolvedCount}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--text-tertiary)' }}>{closedCount}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ height: '6px', flex: 1, backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${workloadPercent}%`, height: '100%', backgroundColor: workloadColor }}></div>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: workloadColor }}>{activeCount} Active</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>Unassigned (Backlog)</td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-tertiary)' }}>N/A</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700 }}>{tickets.filter(t => !t.assigned_engineer_id).length}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--accent)' }}>{tickets.filter(t => !t.assigned_engineer_id && t.status === 'open').length}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>-</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {tickets.filter(t => !t.assigned_engineer_id).length} ticket(s) awaiting dispatch
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manage-users' && userRole === 'senior_manager' && (
        <div className="card-glass animate-fade-in" style={{ padding: isMobile ? '16px' : '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: isMobile ? '18px' : '20px', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}><Users style={{ color: 'var(--primary)' }} /> User Directory & Role Assignment</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Review registered staff, check verification status, and assign system access permissions.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
            />
            <button className="btn btn-secondary" onClick={fetchUsers} disabled={userLoading} style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={14} className={userLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {userLoading && <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Loading registered users...</div>}

          {!userLoading && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 10px' }}>User Name</th>
                    <th style={{ padding: '12px 10px' }}>Email Address</th>
                    <th style={{ padding: '12px 10px' }}>Verification Status</th>
                    <th style={{ padding: '12px 10px' }}>Assigned System Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => {
                    const q = userSearch.toLowerCase().trim();
                    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                  }).map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '14px 10px', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '14px 10px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 600,
                          backgroundColor: u.is_verified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                          color: u.is_verified ? '#10b981' : '#f59e0b' 
                        }}>
                          {u.is_verified ? 'Verified' : 'Pending Verification'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            outline: 'none',
                            fontWeight: u.role === 'none' ? 'normal' : '600'
                          }}
                        >
                          <option value="none">Suspended / No Role</option>
                          <option value="senior_manager">Service Officer (Senior Manager)</option>
                          <option value="manager">Service Manager (Manager)</option>
                          <option value="engineer">Field Engineer</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {users.filter(u => {
                    const q = userSearch.toLowerCase().trim();
                    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                  }).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showInvoiceModal && selectedTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card-glass" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
          }}>
            <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginTop: 0 }}>
              📄 Generate Invoice
            </h3>
            
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Ticket: <strong>{selectedTicket.ticket_number}</strong><br/>
              Created: <strong>{new Date(selectedTicket.created_at).toLocaleDateString()}</strong>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${selectedTicket.id}/invoice`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sparePartsUsed: invoiceSpareParts,
                    serviceCost: invoiceServiceCost,
                    sparePartsCost: invoiceSparePartsCost,
                    purchaseDate: invoicePurchaseDate
                  })
                });
                if (res.ok) {
                  const updated = await res.json();
                  setSelectedTicket(updated);
                  fetchTickets();
                  setShowInvoiceModal(false);
                } else {
                  alert("Failed to generate invoice.");
                }
              } catch (err) {
                console.error("Error generating invoice:", err);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Purchase / Installation Date</label>
                <input 
                  type="date" 
                  value={invoicePurchaseDate} 
                  onChange={(e) => setInvoicePurchaseDate(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Spare Parts Used</label>
                <textarea 
                  value={invoiceSpareParts} 
                  onChange={(e) => setInvoiceSpareParts(e.target.value)} 
                  placeholder="Enter parts separated by commas (e.g. O-Ring, Heating Element)"
                  style={{ width: '100%', height: '80px', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Service Cost (₹)</label>
                  <input 
                    type="number" 
                    value={invoiceServiceCost} 
                    onChange={(e) => setInvoiceServiceCost(e.target.value)} 
                    placeholder="e.g. 150"
                    required
                    min="0"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Spare Parts Cost (₹)</label>
                  <input 
                    type="number" 
                    value={invoiceSparePartsCost} 
                    onChange={(e) => setInvoiceSparePartsCost(e.target.value)} 
                    placeholder="e.g. 75"
                    required
                    min="0"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Warranty Calculation Summary */}
              {(() => {
                if (!invoicePurchaseDate) return null;
                const purchase = new Date(invoicePurchaseDate);
                const created = new Date(selectedTicket.created_at);
                let months = (created.getFullYear() - purchase.getFullYear()) * 12 + (created.getMonth() - purchase.getMonth());
                if (created.getDate() < purchase.getDate()) {
                  months--;
                }
                const isWarranty = months <= 18 && months >= 0;
                const finalServiceCharge = isWarranty ? 0 : (parseFloat(invoiceServiceCost) || 0);
                const finalPartsCharge = parseFloat(invoiceSparePartsCost) || 0;
                const totalCost = finalServiceCharge + finalPartsCharge;

                return (
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: isWarranty ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: `1px solid ${isWarranty ? '#10b981' : '#f59e0b'}`,
                    fontSize: '12.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ color: 'var(--text-primary)' }}>Warranty Status: <strong style={{ color: isWarranty ? '#10b981' : '#f59e0b' }}>{isWarranty ? 'ACTIVE' : 'EXPIRED'}</strong> ({months} months since purchase)</div>
                    <div style={{ color: 'var(--text-primary)' }}>Service Cost: <strong>₹{finalServiceCharge} {isWarranty && '(Waived - Free of Cost)'}</strong></div>
                    <div style={{ color: 'var(--text-primary)' }}>Spare Parts Cost: <strong>₹{finalPartsCharge}</strong></div>
                    <div style={{ color: 'var(--text-primary)' }}>Total Cost: <strong style={{ fontSize: '14px', color: 'var(--accent)' }}>₹{totalCost}</strong></div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowInvoiceModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Save & Generate
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
