import React, { useState } from 'react';
import './App.css';

/**
 * Anonymous Ticket Frontend for Silent Issue Tracker.
 * Minimalistic, light-themed SPA for ticket submission, history, and status.
 * Communicates with backend via REST API (OpenAPI spec compliant).
 * PRIMARY:   #1976d2
 * ACCENT:    #ff9800
 * SECONDARY: #424242
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function TicketForm({ onSuccess }) {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketInfo, setTicketInfo] = useState(null);

  // PUBLIC_INTERFACE
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTicketInfo(null);

    // Call backend
    try {
      const res = await fetch(`${BACKEND_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, description: description || null }),
      });
      if (res.status === 201) {
        const data = await res.json();
        setTicketInfo(data);
        onSuccess && onSuccess(data.ticket_id);
        setSummary('');
        setDescription('');
      } else if (res.status === 400 || res.status === 422) {
        setError('Please enter a summary. Summary is required.');
      } else {
        setError('Submission failed. Try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="block box">
      <h2 className="block-title">Submit a New Ticket</h2>
      <form className="ticket-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Summary<span style={{color: 'var(--accent-color)'}}>*</span></label>
          <input
            className="input"
            type="text"
            value={summary}
            maxLength={100}
            required
            onChange={e => setSummary(e.target.value)}
            placeholder="Brief issue summary"
          />
        </div>
        <div className="form-row">
          <label>Description</label>
          <textarea
            className="input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional details (max 500 chars)"
            maxLength={500}
            rows={3}
          />
        </div>
        <button
          type="submit"
          className="btn btn-block"
          disabled={loading || !summary.trim()}
        >
          {loading ? 'Submitting...' : 'Submit Ticket'}
        </button>
        {error && <div className="form-error">{error}</div>}
      </form>
      {ticketInfo &&
        <div className="ticket-receipt">
          <div className="ticket-receipt-title accent">Ticket Submitted!</div>
          <div className="ticket-receipt-id">
            Your ticket code: <span className="copyable">{ticketInfo.ticket_id}</span>
          </div>
          <div className="ticket-receipt-status">Status: <b>{ticketInfo.status}</b></div>
          <div className="ticket-receipt-note">
            Save/<b>copy your code</b> to check your ticket's status later. <br/> We never ask for personal info!
          </div>
        </div>
      }
    </div>
  );
}

function TicketStatus() {
  const [ticketId, setTicketId] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // PUBLIC_INTERFACE
  async function handleCheck(e) {
    e.preventDefault();
    setLoading(true);
    setTicket(null);
    setErr('');
    try {
      const res = await fetch(`${BACKEND_URL}/tickets/${encodeURIComponent(ticketId.trim())}`);
      if (res.status === 200) {
        setTicket(await res.json());
      } else if (res.status === 404) {
        setErr('No ticket found for that code.');
      } else {
        setErr('Could not retrieve ticket. Try again.');
      }
    } catch {
      setErr('Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="block box">
      <h2 className="block-title">Check Ticket Status</h2>
      <form className="status-form" onSubmit={handleCheck}>
        <div className="form-row">
          <label>Ticket Code</label>
          <input
            className="input"
            value={ticketId}
            onChange={e => setTicketId(e.target.value)}
            maxLength={64}
            placeholder="Enter your ticket code"
            required
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <button className="btn btn-block" type="submit" disabled={loading || !ticketId.trim()}>
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </form>
      {err && <div className="form-error">{err}</div>}
      {ticket &&
        <div className="ticket-status-box">
          <div className="ticket-status-title accent">Ticket Info</div>
          <div><b>Code:</b> <span className="copyable">{ticket.ticket_id}</span></div>
          <div><b>Status:</b> {ticket.status}</div>
          <div><b>Created:</b> {new Date(ticket.created_at).toLocaleString()}</div>
          <div><b>Summary:</b> {ticket.summary}</div>
        </div>
      }
    </div>
  );
}

function TicketHistory() {
  const [tickets, setTickets] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // PUBLIC_INTERFACE
  async function fetchHistory() {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`${BACKEND_URL}/ticket-history?limit=10`);
      if (res.ok) {
        setTickets(await res.json());
      } else {
        setErr('Could not load ticket history.');
      }
    } catch {
      setErr('Network error.');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="block box">
      <h2 className="block-title">Recent Ticket History</h2>
      {loading && <div>Loading...</div>}
      {err && <div className="form-error">{err}</div>}
      {!loading && !err &&
        <div className="history-list">
          {tickets.length === 0 && <div>No recent tickets.</div>}
          {tickets.map((t) => (
            <div className="history-row" key={t.ticket_id}>
              <span className="history-code">{t.ticket_id.slice(0, 12)}</span>
              <span className={`history-status status-${t.status.toLowerCase()}`}>{t.status}</span>
              <span className="history-date">{new Date(t.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      }
      <button className="btn btn-small btn-refresh" onClick={fetchHistory} style={{marginTop:12}}>Refresh</button>
    </div>
  );
}

function App() {
  // SPA tab state for navigation
  const [tab, setTab] = useState('submit');
  const [lastTicketCode, setLastTicketCode] = useState('');

  return (
    <div className="app">
      <nav className="navbar">
        <div className="container" style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
          <div className="logo"><span className="logo-symbol">*</span> Silent Issue Tracker</div>
          <div>
            <button
              className={`btn nav-btn ${tab==='submit' ? 'active' : ''}`}
              onClick={()=>setTab('submit')}
            >Submit</button>
            <button
              className={`btn nav-btn ${tab==='status' ? 'active' : ''}`}
              onClick={()=>setTab('status')}
            >Status</button>
            <button
              className={`btn nav-btn ${tab==='history' ? 'active' : ''}`}
              onClick={()=>setTab('history')}
            >History</button>
          </div>
        </div>
      </nav>
      <main>
        <div className="container content">
          <div style={{paddingTop:48}}></div>
          {tab === 'submit' && <TicketForm onSuccess={code => {setLastTicketCode(code); setTab('status');}} />}
          {tab === 'status' && <TicketStatus initialTicketCode={lastTicketCode} />}
          {tab === 'history' && <TicketHistory />}
        </div>
      </main>
      <footer className="footer"><div className="container">Built with <span className="logo-symbol">#1976d2</span> Minimalism · No accounts, no tracking, pure privacy.</div></footer>
    </div>
  );
}

export default App;
