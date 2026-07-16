import React, { useState, useEffect, useRef } from 'react';
import useResponsive from '../hooks/useResponsive.js';
import { socket } from '../socket';
import { MessageCircle, Send, Phone, User, X, Smartphone, Bot, Wrench, ShieldAlert } from 'lucide-react';

const PRESETS = [
  { name: 'Client Profile', number: '9988776655', role: 'client', description: 'Customer raising/tracking tickets' },
  { name: 'Engineer Rohan Sharma', number: '919876543211', role: 'engineer', description: 'Assigned field engineer' },
  { name: 'Engineer Amit Patel', number: '919876543212', role: 'engineer', description: 'Assigned field engineer' }
];

export default function WhatsAppSimulator() {
  const { isMobile } = useResponsive();
  const [isOpen, setIsOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('9988776655');
  const [currentRole, setCurrentRole] = useState('client');
  const [isRegistered, setIsRegistered] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [activeProducts, setActiveProducts] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  const handleToggleSelectProduct = async (msgId) => {
    if (expandedMessageId === msgId) {
      setExpandedMessageId(null);
      return;
    }

    try {
      const cleanNum = whatsappNumber.replace(/\D/g, '');
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/whatsapp/state/${cleanNum}`);
      const data = await res.json();
      if (data.products) {
        const formatted = data.products.map((p, index) => ({
          num: String(index + 1),
          name: p.product_name,
          code: p.product_code || ''
        }));
        formatted.push({
          num: String(formatted.length + 1),
          name: "Other (Enter Manually)",
          code: "OTHER"
        });
        setActiveProducts(formatted);
        setExpandedMessageId(msgId);
      }
    } catch (err) {
      console.error("Error fetching chatbot products:", err);
    }
  };

  useEffect(() => {
    if (!isRegistered || !whatsappNumber) return;

    const cleanNum = whatsappNumber.replace(/\D/g, '');
    
    // Join Socket Room for this number
    socket.emit('join_chat', cleanNum);
    console.log(`Simulator joined room: chat_${cleanNum}`);

    // Load Chat History
    fetchChatHistory(cleanNum);

    // Listen for new messages
    const handleNewMessage = (msg) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
      
      // Simulate typing indicator if message from client
      if (msg.sender === 'client') {
        setIsTyping(true);
      } else {
        setIsTyping(false);
      }
    };

    socket.on('new_whatsapp_message', handleNewMessage);

    return () => {
      socket.off('new_whatsapp_message', handleNewMessage);
    };
  }, [isRegistered, whatsappNumber]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const fetchChatHistory = async (number) => {
    try {
      const res = await fetch(`https://service-backend-jhq0.onrender.com/api/whatsapp/messages/${number}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Error fetching whatsapp history:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    if (!textToSend) setInputText('');

    try {
      const res = await fetch('https://service-backend-jhq0.onrender.com/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_whatsapp: whatsappNumber,
          message_text: text
        })
      });
      const data = await res.json();
    } catch (err) {
      console.error("Error sending simulated whatsapp message:", err);
    }
  };

  const handleSelectPreset = (preset) => {
    setWhatsappNumber(preset.number);
    setCurrentRole(preset.role);
    setIsRegistered(true);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (whatsappNumber.trim()) {
      const matched = PRESETS.find(p => p.number.replace(/\D/g, '') === whatsappNumber.replace(/\D/g, ''));
      setCurrentRole(matched ? matched.role : 'client');
      setIsRegistered(true);
    }
  };

  const handleButtonClick = (value) => {
    handleSendMessage(value);
  };

  // Determine phone theme based on role
  const isClient = currentRole === 'client';
  const themeGradient = isClient 
    ? 'linear-gradient(135deg, #075e54, #128c7e)' 
    : 'linear-gradient(135deg, #1e293b, #0f172a)';

  return (
    <>
      {/* Floating Toggle Button */}
      {(!isOpen || !isMobile) && (
        <button 
          className="btn btn-primary"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'fixed',
            bottom: isMobile ? '16px' : '24px',
            right: isMobile ? '16px' : '24px',
            borderRadius: '50%',
            width: isMobile ? '52px' : '60px',
            height: isMobile ? '52px' : '60px',
            padding: 0,
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: isMobile ? '52px' : '60px'
          }}
          title="Open WhatsApp Simulator"
        >
          {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
        </button>
      )}

      {/* Simulator Window */}
      {isOpen && (
        <div 
          className="card-glass animate-fade-in"
          style={{
            position: 'fixed',
            bottom: isMobile ? '0' : '96px',
            right: isMobile ? '0' : '24px',
            width: isMobile ? '100vw' : '380px',
            height: isMobile ? '100vh' : '600px',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: isMobile ? 'none' : `1px solid ${isClient ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
            borderRadius: isMobile ? '0' : '16px'
          }}
        >
          {/* Phone Header */}
          <div style={{
            background: themeGradient,
            color: '#ffffff',
            padding: isMobile ? '12px 14px' : '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '8px' : '12px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            {isMobile && (
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                  marginRight: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '44px',
                  minWidth: '44px'
                }}
              >
                <X size={22} />
              </button>
            )}
            <Smartphone size={18} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isClient ? <Bot size={15} /> : <Wrench size={15} />}
                {isClient ? 'WhatsApp (Client View)' : 'WhatsApp (Engineer View)'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                {isRegistered ? `Active: +${whatsappNumber}` : 'Select Profile'}
              </div>
            </div>
            {isRegistered && (
              <button 
                onClick={() => { setIsRegistered(false); setMessages([]); }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: 600
                }}
              >
                Switch View
              </button>
            )}
          </div>

          {/* Simulator Content Area */}
          {!isRegistered ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              backgroundColor: 'var(--bg-secondary)',
              gap: '16px',
              overflowY: 'auto'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#128c7e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <MessageCircle size={28} />
                </div>
                <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>WhatsApp Simulator</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Switch between Client and Engineer profiles to test two-way notifications.
                </p>
              </div>

              {/* Presets List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Quick Switch Profiles</div>
                {PRESETS.map((p, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div style={{
                      padding: '6px',
                      borderRadius: '50%',
                      backgroundColor: p.role === 'client' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                      color: p.role === 'client' ? '#128c7e' : 'var(--primary)',
                      display: 'flex'
                    }}>
                      {p.role === 'client' ? <User size={16} /> : <Wrench size={16} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>+{p.number} • {p.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ position: 'relative', margin: '8px 0', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)', padding: '0 8px', position: 'relative', zIndex: 1 }}>OR ENTER CUSTOM</span>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: 'var(--border-color)', zIndex: 0 }}></div>
              </div>

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="text" 
                  value={whatsappNumber} 
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Custom WhatsApp (e.g. 9988776655)"
                  required
                  inputMode="tel"
                  style={{ padding: '10px 14px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ background: '#128c7e', boxShadow: 'none', minHeight: '44px' }}>
                  Open Custom Chat
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Chat Messages */}
              <div style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-primary)',
                backgroundImage: 'radial-gradient(var(--border-color) 1px, transparent 0)',
                backgroundSize: '24px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {messages.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: '12px',
                    marginTop: '20px',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    {isClient 
                      ? 'Say "Hi" or "menu" to initiate the self-service chatbot menu.'
                      : 'No messages received yet. Dispatch a ticket to this engineer from the Manager Panel to see the alert here.'}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isClientMsg = msg.sender === 'client';
                    
                    let senderLabel = 'Client';
                    let labelColor = '#128c7e';
                    let bubbleBg = '#d9fdd3';
                    let borderCol = '#c2f0b9';
                    let align = 'flex-end';
                    let bubbleTextColor = '#1e293b'; // High-contrast dark text on light green client bubble

                    if (msg.sender === 'bot') {
                      senderLabel = 'Bot Automated';
                      labelColor = 'var(--primary)';
                      bubbleBg = 'var(--bg-secondary)';
                      borderCol = 'var(--border-color)';
                      align = 'flex-start';
                      bubbleTextColor = 'var(--text-primary)';
                    } else if (msg.sender === 'manager') {
                      senderLabel = 'Manager (Direct)';
                      labelColor = 'var(--accent)';
                      bubbleBg = 'var(--bg-secondary)';
                      borderCol = 'var(--border-color)';
                      align = 'flex-start';
                      bubbleTextColor = 'var(--text-primary)';
                    } else if (msg.sender === 'client' && !isClient) {
                      // If engineer viewing, and message is client, actually the client is "them" (incoming)
                      senderLabel = 'Engineer (You)';
                      labelColor = 'var(--primary)';
                      bubbleBg = '#d9fdd3';
                      borderCol = '#c2f0b9';
                      align = 'flex-end';
                      bubbleTextColor = '#1e293b';
                    }

                    return (
                      <div 
                        key={msg.id}
                        style={{
                          alignSelf: align,
                          backgroundColor: bubbleBg,
                          color: bubbleTextColor,
                          padding: '10px 14px',
                          borderRadius: align === 'flex-end' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                          maxWidth: '85%',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          fontSize: '13px',
                          wordBreak: 'break-word',
                          border: `1px solid ${borderCol}`
                        }}
                      >
                        <div style={{ 
                          fontWeight: 600, 
                          fontSize: '10px', 
                          color: labelColor,
                          marginBottom: '2px',
                          textTransform: 'uppercase'
                        }}>
                          {senderLabel}
                        </div>
                        
                        <div style={{ whiteSpace: 'pre-line' }}>{msg.message_text}</div>
                        
                        {isClient && msg.sender === 'bot' && (msg.message_text.includes('select the Product') || msg.message_text.includes('select Product')) && (() => {
                          return (
                            <div style={{ margin: '8px -14px -10px -14px' }}>
                              <button 
                                onClick={() => handleToggleSelectProduct(msg.id)}
                                style={{
                                  padding: '12px 14px',
                                  backgroundColor: 'var(--bg-secondary)',
                                  color: '#00a884',
                                  border: 'none',
                                  borderTop: '1px solid var(--border-color)',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  borderBottomLeftRadius: '15px',
                                  transition: 'background 0.2s',
                                  outline: 'none'
                                }}
                              >
                                <span style={{ fontSize: '15px', color: '#00a884', fontWeight: 'bold' }}>☰</span> See all options
                              </button>
                            </div>
                          );
                        })()}
                        
                        <div style={{ 
                          fontSize: '9px', 
                          color: 'gray', 
                          textAlign: 'right', 
                          marginTop: '4px' 
                        }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Simulated Typing Indicator */}
                {isTyping && (
                  <div style={{
                    alignSelf: 'flex-start',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic'
                  }}>
                    Typing...
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Bot Option Quick Buttons (Only on Client view) */}
              {isClient && messages.length > 0 && messages[messages.length - 1].sender === 'bot' && 
               messages[messages.length - 1].message_text.includes('1. Track a Ticket') && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  <button 
                    onClick={() => handleButtonClick('1')} 
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      border: '1px solid #128c7e',
                      backgroundColor: 'var(--bg-secondary)',
                      color: '#128c7e',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    1️⃣ Track Ticket
                  </button>
                  <button 
                    onClick={() => handleButtonClick('2')} 
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      border: '1px solid #128c7e',
                      backgroundColor: 'var(--bg-secondary)',
                      color: '#128c7e',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    2️⃣ Raise Ticket
                  </button>
                </div>
              )}

              {/* Message Input Bar */}
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '8px'
              }}>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isClient ? "Type message to Bot..." : "Type text message..."}
                  style={{
                    flex: 1,
                    borderRadius: '24px',
                    padding: '8px 16px',
                    fontSize: '13px'
                  }}
                />
                 <button 
                  onClick={() => handleSendMessage()}
                  style={{
                    backgroundColor: isClient ? '#128c7e' : 'var(--primary)',
                    border: 'none',
                    color: 'white',
                    width: isMobile ? '44px' : '36px',
                    height: isMobile ? '44px' : '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
          {/* All Options Bottom Sheet Modal */}
          {expandedMessageId && activeProducts.length > 0 && (
            <div 
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'var(--bg-secondary)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.25)',
                zIndex: 1001,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '75%',
                animation: 'slide-up 0.25s ease-out',
                borderTop: '1px solid var(--border-color)'
              }}
            >
              {/* Drag Indicator handle */}
              <div style={{
                width: '40px',
                height: '4px',
                backgroundColor: 'var(--text-tertiary)',
                opacity: 0.3,
                borderRadius: '2px',
                margin: '8px auto 0 auto',
                flexShrink: 0
              }} />

              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 20px',
                borderBottom: '1px solid var(--border-color)',
                flexShrink: 0
              }}>
                <button 
                  onClick={() => setExpandedMessageId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px'
                  }}
                >
                  <X size={20} />
                </button>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  flex: 1,
                  textAlign: 'center',
                  marginRight: '36px' // Balance out close button spacing
                }}>
                  All options
                </div>
              </div>

              {/* Options List */}
              <div style={{
                overflowY: 'auto',
                padding: '8px 0'
              }}>
                {activeProducts.map((prod) => (
                  <div 
                    key={prod.num}
                    onClick={() => {
                      handleSendMessage(prod.num);
                      setExpandedMessageId(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      userSelect: 'none'
                    }}
                    className="sheet-option"
                  >
                    {/* Reply Arrow Icon */}
                    <span style={{ 
                      color: 'var(--text-tertiary)', 
                      fontSize: '15px', 
                      fontWeight: 500
                    }}>
                      ←
                    </span>
                    <span style={{ 
                      fontSize: '14.5px', 
                      fontWeight: 500, 
                      color: 'var(--text-primary)' 
                    }}>
                      {prod.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
