import React, { useState, useEffect } from 'react';
import { ClipboardList, Mail, Phone, Building, Info, CheckCircle2 } from 'lucide-react';

export default function TicketGenView() {
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [productName, setProductName] = useState('');
  const [customProductName, setCustomProductName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [error, setError] = useState('');

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

  const handleCompanyInputChange = (e) => {
    const val = e.target.value;
    setCompanyInput(val);
    setSelectedCompanyId(val);

    if (val.trim().length > 0) {
      setSuggestions(getSuggestionsList(val));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (s) => {
    setCompanyInput(s.name);
    setSelectedCompanyId(s.id);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Fetch Companies & Products on Mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch('https://service-backend-jhq0.onrender.com/api/companies');
        const data = await res.json();
        setCompanies(data);
      } catch (err) {
        console.error("Error fetching companies:", err);
        setError("Could not load company listings.");
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
    fetchCompanies();
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompanyId || !productName || !email || !phone || !description) {
      setError("Please fill out all fields.");
      return;
    }

    if (productName === 'Other' && !customProductName.trim()) {
      setError("Please enter your product name manually.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('https://service-backend-jhq0.onrender.com/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompanyId,
          product_name: productName === 'Other' ? customProductName : productName,
          client_whatsapp: phone,
          client_email: email,
          description: description
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create ticket");
      }

      const ticket = await res.json();
      setCreatedTicket(ticket);
      // Reset form fields
      setSelectedCompanyId('');
      setCompanyInput('');
      setSuggestions([]);
      setProductName('');
      setCustomProductName('');
      setEmail('');
      setPhone('');
      setDescription('');
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while creating your ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
      {createdTicket ? (
        <div className="card-glass animate-fade-in" style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--success)' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: 'var(--success-light)', color: 'var(--success)', marginBottom: '20px' }}>
            <CheckCircle2 size={48} />
          </div>
          <h2 style={{ marginBottom: '12px' }}>Ticket Raised Successfully!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Your support ticket has been registered. Our service managers will assign an engineer shortly.
          </p>
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '10px', marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>Ticket Reference No.</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
              {createdTicket.ticket_number}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setCreatedTicket(null)}>
            Raise Another Ticket
          </button>
        </div>
      ) : (
        <div className="card-glass animate-fade-in" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', padding: '8px', borderRadius: '8px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px' }}>Raise Complaint Ticket</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>SEMCORP Process & Vacuum Systems Support</p>
            </div>
          </div>

          {error && (
            <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Company Name Autocomplete Input */}
            <div style={{ position: 'relative' }}>
              <label htmlFor="company-input" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Building size={16} /> Company Name</label>
              <input
                type="text"
                id="company-input"
                value={companyInput}
                onChange={handleCompanyInputChange}
                onFocus={() => {
                  if (companyInput.trim().length > 0) {
                    setSuggestions(getSuggestionsList(companyInput));
                  }
                  setShowSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 250);
                }}
                placeholder="Type company name (e.g. APEX)"
                required
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
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
                  {suggestions.map((s) => (
                    <li
                      key={s.id}
                      onMouseDown={() => handleSelectSuggestion(s)}
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

            {/* 2. Product Name Dropdown */}
            <div>
              <label htmlFor="product-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={16} /> Equipment Product Name</label>
              <select
                id="product-name"
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  if (e.target.value !== 'Other') setCustomProductName('');
                }}
                required
              >
                <option value="">-- Select Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.product_name}>{p.product_name} ({p.product_code})</option>
                ))}
                <option value="Other">Other (Enter Manually)</option>
              </select>

              {productName === 'Other' && (
                <div style={{ marginTop: '10px' }}>
                  <label htmlFor="custom-product-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Type Custom Product Name
                  </label>
                  <input
                    id="custom-product-name"
                    type="text"
                    value={customProductName}
                    onChange={(e) => setCustomProductName(e.target.value)}
                    placeholder="Enter manual product name (e.g. SPECIAL DRILL SKID)"
                    required
                  />
                </div>
              )}
            </div>

            {/* 3. Contact Email */}
            <div>
              <label htmlFor="client-email" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={16} /> Contact Email Address</label>
              <input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@company.com"
                required
              />
            </div>

            {/* 4. WhatsApp Number */}
            <div>
              <label htmlFor="client-whatsapp" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={16} /> Client WhatsApp Number</label>
              <input
                id="client-whatsapp"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9988776655"
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>We send automated updates to this WhatsApp number.</span>
            </div>

            {/* 5. Complaint Description */}
            <div>
              <label htmlFor="complaint-desc">Complaint Description</label>
              <textarea
                id="complaint-desc"
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the vacuum loss, heat exchange leakage, pump vibration, or any other issues..."
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ width: '100%' }}>
              {isSubmitting ? 'Registering Ticket...' : 'Submit Support Ticket'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
