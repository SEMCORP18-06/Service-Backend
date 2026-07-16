import React, { useState, useEffect, useRef } from 'react';
import useResponsive from '../hooks/useResponsive.js';
import { socket } from '../socket';
import { ClipboardList, User, Phone, Mail, Clock, Send, ShieldAlert, Award } from 'lucide-react';

export default function EngineerDashboardView({ user }) {
  const { isMobile } = useResponsive();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [logs, setLogs] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [finalComments, setFinalComments] = useState('');
  const [serviceFormImage, setServiceFormImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    fetchAssignedTickets();
  }, [user]);

  const fetchAssignedTickets = async () => {
    if (!user) return;
    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets?engineerId=${user.id}`);
      const data = await res.json();
      setTickets(data);
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error(err);
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

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setStatusInput(ticket.status);
    fetchLogs(ticket.id);
    socket.emit('join_ticket', ticket.id);
    if (isMobile) setShowDetailOnMobile(true);
  };

  // Socket listener for logs
  useEffect(() => {
    if (!selectedTicket) return;

    const handleNewLog = (newLog) => {
      if (newLog.ticket_id === selectedTicket.id) {
        setLogs((prev) => {
          if (prev.some(l => l.id === newLog.id)) return prev;
          return [...prev, newLog];
        });
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    const handleGlobalUpdate = () => {
      fetchAssignedTickets();
    };

    socket.on('new_log', handleNewLog);
    socket.on('ticket_updated', handleGlobalUpdate);

    return () => {
      socket.off('new_log', handleNewLog);
      socket.off('ticket_updated', handleGlobalUpdate);
    };
  }, [selectedTicket]);

  // Image Change Handler (Base64 Reader)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setServiceFormImage(reader.result); // Base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  // Update Status
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!statusInput || !selectedTicket) return;

    if (statusInput === 'resolved' && selectedTicket.status !== 'resolved') {
      setShowResolveModal(true);
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusInput,
          author_id: user.id,
          author_name: `${user.name} (Engineer)`
        })
      });

      if (!res.ok) throw new Error("Status update failed.");
      
      const updated = await res.json();
      setSelectedTicket(updated);
      setStatusInput(updated.status);
      setSuccess("Ticket status updated successfully!");
      fetchAssignedTickets();
    } catch (err) {
      console.error(err);
      setError("Error changing ticket status.");
    }
  };

  // Submit modal resolution details
  const handleCompleteResolution = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    if (!serviceFormImage) {
      setError("Please upload a picture of the service form.");
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          author_id: user.id,
          author_name: `${user.name} (Engineer)`,
          final_comments: finalComments,
          service_form_image: serviceFormImage
        })
      });

      if (!res.ok) throw new Error("Resolution submission failed.");

      const updated = await res.json();
      setSelectedTicket(updated);
      setStatusInput('resolved');
      setSuccess("Ticket successfully resolved with service form details!");
      setShowResolveModal(false);
      setFinalComments('');
      setServiceFormImage('');
      fetchAssignedTickets();
    } catch (err) {
      console.error(err);
      setError("Error resolving ticket.");
    } finally {
      setLoading(false);
    }
  };

  // Add visit comment
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
          author_id: user.id,
          author_name: `${user.name} (Engineer)`,
          comment: text
        })
      });
      if (res.ok) {
        fetchAssignedTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '12px 0' : '20px 0' }}>
      <div>
        <h1 style={{ fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '10px' }}><Award size={isMobile ? 20 : 24} style={{ color: 'var(--primary)' }} /> Service Engineer Panel</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Welcome back, <strong>{user.name}</strong>. View your assigned tickets and log service actions.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedTicket && !isMobile ? '1fr 1.2fr' : '1fr', gap: isMobile ? '16px' : '24px' }} className="animate-fade-in">
        
        {/* Left Column: Assigned Tickets list */}
        {(!isMobile || !showDetailOnMobile) && (
        <div className="card-glass" style={{ padding: isMobile ? '14px' : '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
          <h3>Your Assigned Complaints</h3>
          
          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
              No assigned tickets at the moment. Keep up the good work!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tickets.map((t) => {
                const isActive = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'var(--primary-light)' : 'var(--bg-secondary)',
                      border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'var(--font-heading)' }}>{t.ticket_number}</span>
                      <span className={`badge badge-${t.status}`} style={{ fontSize: '9px', padding: '2px 6px' }}>{t.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{t.product_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Client: <strong>{t.company_name}</strong>
                    </div>
                    {t.scheduled_slot && (
                      <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> Visit: {new Date(t.scheduled_slot).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* Right Column: Ticket details & Action logs */}
        {selectedTicket && (!isMobile || showDetailOnMobile) ? (
          <div className="card-glass" style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px' }}>
            {isMobile && (
              <button className="mobile-back-btn" onClick={() => { setShowDetailOnMobile(false); }} style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)', marginBottom: '4px' }}>← Back to List</button>
            )}
            
            {/* Header Details */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-start', gap: isMobile ? '12px' : '0' }}>
              <div>
                <span className={`badge badge-${selectedTicket.status}`} style={{ marginBottom: '6px' }}>{selectedTicket.status}</span>
                <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontFamily: 'var(--font-heading)' }}>{selectedTicket.ticket_number}</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Equipment: {selectedTicket.product_name} ({selectedTicket.product_code})</p>
              </div>
              <div style={{ textAlign: isMobile ? 'left' : 'right', fontSize: '12px' }}>
                <div>Company: <strong>{selectedTicket.company_name}</strong></div>
                <div>Contact: <strong>{selectedTicket.client_whatsapp}</strong></div>
              </div>
            </div>

            {/* Description details */}
            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px' }}>
              <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Complaint Description</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedTicket.description}</p>
            </div>

            {/* Status change selector */}
            <div style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '10px' }}>
              <h4 style={{ fontSize: '13px', marginBottom: '8px' }}>Update Status</h4>
              <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px' }}
                >
                  <option value="assigned">Assigned (Scheduled)</option>
                  <option value="in_progress">In Progress (At Client Site)</option>
                  <option value="resolved">Resolved (Work Completed)</option>
                </select>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                  Update
                </button>
              </form>
            </div>

            {/* Logs Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <h3 style={{ fontSize: isMobile ? '13px' : '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Visit History & Logs</h3>

              <div style={{ maxHeight: isMobile ? '160px' : '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                {logs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>No logs registered.</div>
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

              {/* Add comment / log */}
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Log service action, spare parts used, or visit details..."
                  style={{ borderRadius: '24px', padding: '8px 16px', fontSize: '12.5px' }}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={16} />
                </button>
              </form>
            </div>

          </div>
        ) : (!isMobile || !showDetailOnMobile) && (
          <div className="card-glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '24px' : '40px', color: 'var(--text-tertiary)' }}>
            <ShieldAlert size={isMobile ? 32 : 40} style={{ marginBottom: '12px', color: 'var(--primary)' }} />
            <h3 style={{ fontSize: isMobile ? '14px' : undefined }}>Select a ticket from the {isMobile ? 'list' : 'left panel list'} to view details and update log.</h3>
          </div>
        )}
      </div>

      {/* Resolve Ticket Modal */}
      {showResolveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card-glass" style={{
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'fadeIn 0.25s ease forwards'
          }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>
              📝 Complete Ticket Resolution
            </h3>
            
            <form onSubmit={handleCompleteResolution} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="modal-comments" style={{ fontSize: '12px', fontWeight: 600 }}>Final Action & Service Comments</label>
                <textarea
                  id="modal-comments"
                  rows="4"
                  value={finalComments}
                  onChange={(e) => setFinalComments(e.target.value)}
                  placeholder="Specify action taken, parts replaced, and recommendations..."
                  required
                  style={{ fontSize: '13px', padding: '10px 12px' }}
                />
              </div>

              <div>
                <label htmlFor="modal-image" style={{ fontSize: '12px', fontWeight: 600 }}>Upload Picture of Service Form</label>
                <input
                  id="modal-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
                  style={{ fontSize: '12px', padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', width: '100%' }}
                />
                {serviceFormImage && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img 
                      src={serviceFormImage} 
                      alt="Service Form Preview" 
                      style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '6px', border: '1px solid var(--border-color)' }} 
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowResolveModal(false);
                    setFinalComments('');
                    setServiceFormImage('');
                  }}
                  style={{ padding: '8px 16px', fontSize: '12.5px' }}
                  disabled={loading}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '12.5px' }}
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit & Resolve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
