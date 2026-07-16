import React, { useState, useEffect, useRef } from 'react';
import useResponsive from '../hooks/useResponsive.js';
import { socket } from '../socket';
import { Phone, ClipboardList, CheckCircle2, ChevronRight, MessageSquare, User, Clock, Send } from 'lucide-react';

export default function ClientDashboardView() {
  const { isMobile } = useResponsive();
  const [whatsapp, setWhatsapp] = useState('9988776655');
  const [isSearched, setIsSearched] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [logs, setLogs] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const logsEndRef = useRef(null);

  // Fetch tickets for WhatsApp
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!whatsapp.trim()) return;

    setLoading(true);
    setError('');
    setSelectedTicket(null);

    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets?whatsapp=${encodeURIComponent(whatsapp)}`);
      if (!res.ok) throw new Error("Could not retrieve tickets.");
      const data = await res.json();
      setTickets(data);
      setIsSearched(true);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch tickets for this number.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs when a ticket is selected
  const fetchLogs = async (ticketId) => {
    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${ticketId}/logs`);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    fetchLogs(ticket.id);
    // Join Socket Room for this ticket to receive real-time log additions
    socket.emit('join_ticket', ticket.id);
    if (isMobile) setShowDetailOnMobile(true);
  };

  // Socket updates for real-time logs
  useEffect(() => {
    if (!selectedTicket) return;

    const handleNewLog = (newLog) => {
      setLogs((prev) => {
        if (prev.some(l => l.id === newLog.id)) return prev;
        return [...prev, newLog];
      });
      // Scroll to bottom
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    socket.on('new_log', handleNewLog);

    return () => {
      socket.off('new_log', handleNewLog);
    };
  }, [selectedTicket]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedTicket) return;

    const text = commentInput;
    setCommentInput('');

    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${selectedTicket.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: "Client (WhatsApp Contact)",
          comment: text
        })
      });
      if (!res.ok) throw new Error("Failed to add comment.");
      const newLog = await res.json();
      setLogs((prev) => [...prev, newLog]);
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      console.error(err);
      setError("Could not submit comment.");
    }
  };

  const handleReopenTicket = async () => {
    try {
      setError('');
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${selectedTicket.id}/reopen`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to reopen ticket");
      }
      const updated = await res.json();
      setSelectedTicket(updated);
      fetchLogs(updated.id);
      
      // Update tickets list in UI
      setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, status: 'open', closed_at: null } : t));
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not reopen ticket.");
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: isMobile ? '16px auto' : '40px auto', padding: '0 20px' }}>
      {!isSearched ? (
        <div className="card-glass animate-fade-in" style={{ maxWidth: '500px', margin: '60px auto', padding: '32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', marginBottom: '20px' }}>
            <ClipboardList size={36} />
          </div>
          <h2 style={{ marginBottom: '8px' }}>SEMCORP Client Support Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
            Enter your registered WhatsApp number to track all past and current tickets, check schedules, and chat with engineers.
          </p>

          {error && (
            <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'left' }}>
              <label htmlFor="lookup-whatsapp" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> WhatsApp Phone Number</label>
              <input
                id="lookup-whatsapp"
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g. 9988776655"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Searching...' : 'Access My Dashboard'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedTicket && !isMobile ? '1fr 1.2fr' : '1fr', gap: isMobile ? '16px' : '24px' }} className="animate-fade-in">
          
          {/* Left Column: Tickets list */}
          {(!isMobile || !showDetailOnMobile) && (
          <div className="card-glass" style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Your Service Tickets</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>WhatsApp: {whatsapp}</p>
              </div>
              <button 
                onClick={() => setIsSearched(false)} 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Change Number
              </button>
            </div>

            {error && (
              <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                {error}
              </div>
            )}

            {tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                No tickets registered for this number.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tickets.map((t) => {
                  const isActive = selectedTicket?.id === t.id;
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => handleSelectTicket(t)}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                        backgroundColor: isActive ? 'var(--primary-light)' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', fontFamily: 'var(--font-heading)' }}>
                            {t.ticket_number}
                          </span>
                          <span className={`badge badge-${t.status}`} style={{ fontSize: '10px' }}>
                            {t.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t.product_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          Company: {t.company_name} | Raised: {new Date(t.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <ChevronRight size={18} style={{ color: isActive ? 'var(--primary)' : 'var(--text-tertiary)' }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* Right Column: Ticket details & logs */}
          {selectedTicket && (!isMobile || showDetailOnMobile) && (
            <div className="card-glass" style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px' }}>
              {isMobile && (
                <button className="mobile-back-btn" onClick={() => { setShowDetailOnMobile(false); }} style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)', marginBottom: '4px' }}>← Back to List</button>
              )}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', gap: isMobile ? '12px' : '0' }}>
                <div>
                  <span className={`badge badge-${selectedTicket.status}`} style={{ marginBottom: '8px' }}>
                    {selectedTicket.status}
                  </span>
                  <h2 style={{ fontSize: isMobile ? '17px' : '20px', fontFamily: 'var(--font-heading)' }}>{selectedTicket.ticket_number}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Equipment: {selectedTicket.product_name} ({selectedTicket.product_code})</p>
                </div>
                <div style={{ textAlign: isMobile ? 'left' : 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div>Company: <strong>{selectedTicket.company_name}</strong></div>
                  <div>Email: <strong>{selectedTicket.client_email}</strong></div>
                  {selectedTicket.serial_number && <div>Serial No: <strong>{selectedTicket.serial_number}</strong></div>}
                </div>
              </div>

              {/* Timeline Horizontal Table-Stepper Graph (matching sketch) */}
              {(() => {
                const ticket = selectedTicket;
                const formatDate = (dateStr) => {
                  if (!dateStr) return '--';
                  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                };

                return (
                  <div style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>📈 Service Milestone Plan & Actual Timeline</h3>
                    
                    {/* Main Horizontal Timeline Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowX: 'auto', paddingBottom: '12px' }}>
                      
                      {/* Milestones and Stepper Line Row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '600px', position: 'relative' }}>
                        
                        {/* Spacer for Left Label Column */}
                        <div style={{ width: isMobile ? '60px' : '80px', flexShrink: 0 }} />

                        {/* Stepper track */}
                        <div style={{
                          position: 'absolute',
                          top: '46px', // center of circle
                          left: '125px',
                          right: '65px',
                          height: '3px',
                          backgroundColor: 'var(--bg-tertiary)',
                          zIndex: 0
                        }} />

                        {/* Stepper progress fill */}
                        <div style={{
                          position: 'absolute',
                          top: '46px',
                          left: '125px',
                          width: (() => {
                            const s = ticket.status;
                            if (s === 'open' || s === 'assigned') return '0%';
                            if (s === 'in_progress') return '50%';
                            if (s === 'resolved' || s === 'closed') return '100%';
                            return '0%';
                          })(),
                          height: '3px',
                          backgroundColor: '#10b981',
                          zIndex: 1,
                          transition: 'width 0.4s ease'
                        }} />

                        {/* Nodes and Labels */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', position: 'relative', zIndex: 2 }}>
                          {[
                            { label: 'Service Requested', key: 'open' },
                            { label: 'Engineer at site', key: 'in_progress' },
                            { label: 'Issue resolved', key: 'resolved' }
                          ].map((node, index) => {
                            const isCompleted = (() => {
                              const s = ticket.status;
                              if (node.key === 'open') return true;
                              if (node.key === 'in_progress') return s === 'in_progress' || s === 'resolved' || s === 'closed';
                              if (node.key === 'resolved') return s === 'resolved' || s === 'closed';
                              return false;
                            })();
                            const isCurrent = ticket.status === node.key || (node.key === 'open' && ticket.status === 'assigned');

                            return (
                              <div key={node.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: isMobile ? '100px' : '130px', textAlign: 'center' }}>
                                {/* Milestone Name */}
                                <div style={{ fontSize: '11px', fontWeight: 700, color: isCompleted ? 'var(--text-primary)' : 'var(--text-tertiary)', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2 }}>
                                  {node.label}
                                </div>
                                
                                {/* Node Dot */}
                                <div style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  backgroundColor: isCompleted ? '#10b981' : 'var(--bg-secondary)',
                                  border: `3px solid ${isCurrent ? '#10b981' : isCompleted ? '#a7f3d0' : 'var(--border-color)'}`,
                                  color: isCompleted ? 'white' : 'var(--text-tertiary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  marginTop: '4px',
                                  boxShadow: isCurrent ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
                                  transition: 'all 0.3s ease'
                                }}>
                                  {index + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Plan Row */}
                      <div style={{ display: 'flex', alignItems: 'center', minWidth: '600px', marginTop: '12px' }}>
                        {/* Row Label */}
                        <div style={{ width: isMobile ? '60px' : '80px', flexShrink: 0, fontSize: isMobile ? '10px' : '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Plan
                        </div>
                        {/* Values */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          {[
                            ticket.created_at,
                            ticket.eta_in_progress,
                            ticket.eta_resolved
                          ].map((date, idx) => (
                            <div key={idx} style={{ width: isMobile ? '100px' : '130px', textAlign: 'center', fontSize: isMobile ? '10px' : '12px', color: date ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: date ? 600 : 400 }}>
                              {formatDate(date)}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actual Row */}
                      <div style={{ display: 'flex', alignItems: 'center', minWidth: '600px', marginTop: '8px' }}>
                        {/* Row Label */}
                        <div style={{ width: isMobile ? '60px' : '80px', flexShrink: 0, fontSize: isMobile ? '10px' : '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Actual
                        </div>
                        {/* Values */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          {[
                            ticket.created_at,
                            ticket.in_progress_at,
                            ticket.resolved_at
                          ].map((date, idx) => (
                            <div key={idx} style={{ width: isMobile ? '100px' : '130px', textAlign: 'center', fontSize: isMobile ? '10px' : '12px', color: date ? '#10b981' : 'var(--text-tertiary)', fontWeight: date ? 700 : 400 }}>
                              {formatDate(date)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Problem Description */}
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Complaint Description</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedTicket.description}</p>
              </div>

              {/* Service Resolution Details (Visible to Clients) */}
              {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (selectedTicket.final_comments || selectedTicket.service_form_image) && (
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  borderRadius: '10px', 
                  fontSize: '12.5px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  border: '1px dashed var(--accent)' 
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
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

              {/* Engineer details if assigned */}
              {selectedTicket.engineer_name ? (
                <div style={{ border: '1px dashed var(--accent)', padding: '16px', borderRadius: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent)' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', margin: 0 }}>Assigned Engineer: {selectedTicket.engineer_name}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                      Scheduled Visit: <strong>{new Date(selectedTicket.scheduled_slot).toLocaleString()}</strong> | Contact: {selectedTicket.engineer_phone}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px dashed var(--border-color)', padding: '16px', borderRadius: '10px', color: 'var(--text-tertiary)', fontSize: '12px', textAlign: 'center' }}>
                  Awaiting Service Manager to assign a service engineer.
                </div>
              )}

              {/* Reopen Ticket Option for Clients */}
              {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (() => {
                const targetDate = selectedTicket.closed_at || selectedTicket.resolved_at;
                if (!targetDate) return true;
                const dateObj = new Date(targetDate);
                const diffTime = Math.abs(new Date() - dateObj);
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                return diffDays <= 30;
              })() && (
                <button 
                  onClick={handleReopenTicket}
                  className="btn"
                  style={{ 
                    width: '100%', 
                    background: 'linear-gradient(135deg, #f59e0b, #fb923c)', 
                    color: 'white',
                    boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)'
                  }}
                >
                  Reopen Ticket (Available within 30 days of resolution/closure)
                </button>
              )}

              {/* Service Logs / Visit Comments (Real-time Timeline) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <h3 style={{ fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Service Logs & Comments</h3>
                
                <div style={{
                  maxHeight: isMobile ? '180px' : '220px',
                  overflowY: 'auto',
                  paddingRight: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', padding: '12px' }}>
                      No comments or service logs registered yet.
                    </div>
                  ) : (
                    <div className="timeline">
                      {logs.map((log) => (
                        <div key={log.id} className="timeline-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.author_name}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} /> {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', backgroundColor: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            {log.comment}
                          </p>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  )}
                </div>

                {/* Add Service Log comment form */}
                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Add a visit comment or inquiry about this ticket..."
                    style={{ borderRadius: '24px', padding: '10px 16px', fontSize: '13px' }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={16} />
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
