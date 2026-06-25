import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = '/api';

function App() {
  const [email, setEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [userToken, setUserToken] = useState(() => localStorage.getItem('userToken') || '');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('directory'); // 'directory', 'profile', 'calculator'
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  
  // Custom Toast State
  const [toasts, setToasts] = useState([]);

  // Data lists
  const [collectors, setCollectors] = useState([]);
  const [loadingCollectors, setLoadingCollectors] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Form Inputs
  const [authInputs, setAuthInputs] = useState({ name: '', email: '', phone: '', password: '' });
  const [calcInputs, setCalcInputs] = useState({ plastic: '', paper: '', metal: '', glass: '', ewaste: '' });
  const [calcResult, setCalcResult] = useState('');
  const [showProceed, setShowProceed] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  // Custom Toast Handler
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize and Sync Pathname for backward compatibility
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('profile')) {
      setView('profile');
    } else if (path.includes('calculate') || path.includes('calculator')) {
      setView('calculator');
    } else {
      setView('directory');
    }
  }, []);

  // Fetch Collectors list on mount
  useEffect(() => {
    async function fetchCollectors() {
      setLoadingCollectors(true);
      try {
        const res = await fetch(`${API_URL}/collectors`);
        if (!res.ok) throw new Error('Failed to load collectors');
        const data = await res.json();
        setCollectors(data);
      } catch (err) {
        console.error('Could not load collectors:', err);
        showToast('Could not load waste collectors. Please refresh.', 'error');
      } finally {
        setLoadingCollectors(false);
      }
    }
    fetchCollectors();
  }, []);

  // Fetch user profile when email/token changes or is set
  useEffect(() => {
    if (!email || !userToken) {
      setUser(null);
      return;
    }
    
    async function fetchProfile() {
      setLoadingProfile(true);
      try {
        const res = await fetch(`${API_URL}/profile/${encodeURIComponent(email)}`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        if (!res.ok) {
          throw new Error('User profile not found');
        }
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
        showToast('Session expired. Please log in again.', 'warning');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userToken');
        setEmail('');
        setUserToken('');
      } finally {
        setLoadingProfile(false);
      }
    }
    
    fetchProfile();
  }, [email, userToken]);

  // Handle Authentication (Login/Register)
  const handleAuth = async (e) => {
    e.preventDefault();
    const { name, email: inputEmail, phone, password } = authInputs;

    if (!inputEmail.trim() || !password) {
      showToast('Please fill out all required fields!', 'warning');
      return;
    }

    if (authMode === 'register' && (!name.trim() || !phone.trim())) {
      showToast('Please fill out name and phone number for registration!', 'warning');
      return;
    }

    setLoadingAction(true);
    const url = authMode === 'register' ? `${API_URL}/auth/register` : `${API_URL}/auth/login`;
    const payload = authMode === 'register' 
      ? { name: name.trim(), email: inputEmail.trim(), phone: phone.trim(), password }
      : { email: inputEmail.trim(), password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const savedEmail = inputEmail.trim().toLowerCase();
        localStorage.setItem('userEmail', savedEmail);
        localStorage.setItem('userToken', data.token);
        setEmail(savedEmail);
        setUserToken(data.token);
        setUser(data.user);
        setView('directory');
        setAuthInputs({ name: '', email: '', phone: '', password: '' });
        showToast(authMode === 'register' ? 'Registration successful!' : 'Logged in successfully!', 'success');
      } else {
        showToast(data.message || 'Authentication failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error. Ensure the backend server is running.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle calculation submission
  const handleCalculate = async (e) => {
    e.preventDefault();
    if (!email || !userToken) {
      showToast('Please register a profile first!', 'warning');
      setView('directory');
      return;
    }

    const plastic = parseFloat(calcInputs.plastic) || 0;
    const paper = parseFloat(calcInputs.paper) || 0;
    const metal = parseFloat(calcInputs.metal) || 0;
    const glass = parseFloat(calcInputs.glass) || 0;
    const ewaste = parseFloat(calcInputs.ewaste) || 0;

    if (plastic + paper + metal + glass + ewaste === 0) {
      showToast('Please enter at least one material quantity.', 'warning');
      return;
    }

    setLoadingAction(true);
    try {
      const res = await fetch(`${API_URL}/calculate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ plastic, paper, metal, glass, ewaste }),
      });
      const data = await res.json();

      if (data.success) {
        setCalcResult(`You earned: ${data.earned} points 🌱 | Total: ${data.totalPoints} points 🌱`);
        setShowProceed(true);
        showToast(`Successfully added ${data.earned} Green Points!`, 'success');
        
        // Refresh profile data to get updated points and history
        const profileRes = await fetch(`${API_URL}/profile/${encodeURIComponent(email)}`, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        if (profileRes.ok) {
          const updatedUser = await profileRes.json();
          setUser(updatedUser);
        }
      } else {
        showToast('Calculation error: ' + data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error during calculation.', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userToken');
      setEmail('');
      setUserToken('');
      setUser(null);
      setView('directory');
      showToast('Logged out successfully.', 'info');
    }
  };

  // Mock upload file handler
  const handleUploadFile = () => {
    if (!uploadFile) {
      showToast('Please select a file first!', 'warning');
      return;
    }
    showToast(`File "${uploadFile.name}" selected! Upload complete.`, 'success');
    setUploadFile(null);
  };

  // Helper: Format materials history breakdown
  const formatHistoryMaterials = (historyItem) => {
    if (historyItem.materials) {
      return Object.entries(historyItem.materials)
        .filter(([, kg]) => kg > 0)
        .map(([mat, kg]) => `${mat}: ${kg}kg`)
        .join(', ');
    }
    return historyItem.material || 'Mixed';
  };

  // Helper: Get user's initials
  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Helper: Get Toast Icon
  const getToastIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  // ----------------------------------------------------
  // RENDER VIEWS
  // ----------------------------------------------------

  // 1. Setup Profile Screen (If guest / not registered)
  if (!email || !userToken || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌱</span> clear.connect
          </h1>
        </header>
        
        <div className="setup-container animate-fade-in" style={{ margin: 'auto' }}>
          
          {/* Sign In / Sign Up Tabs */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.75rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
            <span 
              style={{ cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem', color: authMode === 'login' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: authMode === 'login' ? '3px solid var(--color-primary)' : 'none', paddingBottom: '9px', marginBottom: '-12px', transition: 'var(--transition-fast)' }} 
              onClick={() => setAuthMode('login')}
            >
              Sign In
            </span>
            <span 
              style={{ cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem', color: authMode === 'register' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: authMode === 'register' ? '3px solid var(--color-primary)' : 'none', paddingBottom: '9px', marginBottom: '-12px', transition: 'var(--transition-fast)' }} 
              onClick={() => setAuthMode('register')}
            >
              Sign Up
            </span>
          </div>

          <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Your Profile'}</h2>
          
          <form onSubmit={handleAuth}>
            {authMode === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={authInputs.name}
                  onChange={(e) => setAuthInputs({ ...authInputs, name: e.target.value })}
                  required
                />
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={authInputs.email}
                onChange={(e) => setAuthInputs({ ...authInputs, email: e.target.value })}
                required
              />
            </div>
            
            {authMode === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={authInputs.phone}
                  onChange={(e) => setAuthInputs({ ...authInputs, phone: e.target.value })}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Password</label>
              <input
                type="password"
                placeholder="••••••"
                value={authInputs.password}
                onChange={(e) => setAuthInputs({ ...authInputs, password: e.target.value })}
                required
              />
            </div>
            
            <button type="submit" disabled={loadingAction} style={{ marginTop: '0.75rem' }}>
              {loadingAction ? (
                <>
                  <span className="spinner"></span> Authenticating...
                </>
              ) : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
        </div>

        {/* Toasts */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span className="toast-icon">{getToastIcon(toast.type)}</span>
              <span className="toast-message">{toast.message}</span>
              <button className="toast-close" onClick={() => removeToast(toast.id)}>✕</button>
              <div className="toast-progress"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Logged In Screens (Shared Header with Navigation Tabs)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Floating Modern Header */}
      <header>
        <div style={{ display: 'flex', width: '100%', maxWidth: '850px', justifyContent: 'space-between', alignItems: 'center', margin: '0 auto' }}>
          <h1 style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setView('directory')}>
            <span>🌱</span> clear.connect
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span 
              style={{ fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', color: view === 'directory' ? '#ffffff' : '#a2dedb', transition: 'var(--transition-fast)' }}
              onClick={() => setView('directory')}
            >
              Directory
            </span>
            <span 
              style={{ fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', color: view === 'calculator' ? '#ffffff' : '#a2dedb', transition: 'var(--transition-fast)' }}
              onClick={() => {
                setCalcResult('');
                setShowProceed(false);
                setCalcInputs({ plastic: '', paper: '', metal: '', glass: '', ewaste: '' });
                setView('calculator');
              }}
            >
              Calculator
            </span>
            
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', padding: '4px 12px 4px 6px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.15)' }}
              onClick={() => setView('profile')}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ffffff', color: 'var(--color-primary-dark)', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                {getUserInitials()}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                {user.greenPoints || 0} pts
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* VIEW: DIRECTORY */}
      {view === 'directory' && (
        <div className="container animate-fade-in">
          
          {/* Points Rates dashboard widget */}
          <div className="rewards">
            <h2>♻️ Green Points System</h2>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--color-primary-dark)', fontSize: '0.9rem', opacity: 0.85 }}>
              Collect materials and earn points based on their category rates.
            </p>
            <div className="rewards-grid">
              <div className="rewards-badge">
                <div className="material-name">Plastic</div>
                <div className="points-rate">10 <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>pts/kg</span></div>
              </div>
              <div className="rewards-badge">
                <div className="material-name">Paper</div>
                <div className="points-rate">10 <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>pts/kg</span></div>
              </div>
              <div className="rewards-badge">
                <div className="material-name">Metal</div>
                <div className="points-rate">10 <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>pts/5kg</span></div>
              </div>
              <div className="rewards-badge">
                <div className="material-name">Glass</div>
                <div className="points-rate">10 <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>pts/5kg</span></div>
              </div>
              <div className="rewards-badge">
                <div className="material-name">E-Waste</div>
                <div className="points-rate">10 <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>pts/10kg</span></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-primary-dark)', margin: 0 }}>
              Registered Collectors
            </h2>
            <button onClick={() => {
              setCalcResult('');
              setShowProceed(false);
              setCalcInputs({ plastic: '', paper: '', metal: '', glass: '', ewaste: '' });
              setView('calculator');
            }}>
              Open Calculator 🌱
            </button>
          </div>

          {/* Grid list of Collectors */}
          <div className="collector-grid">
            {loadingCollectors ? (
              <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '3rem' }}>
                <span className="spinner" style={{ borderTopColor: 'var(--color-primary)', width: '30px', height: '30px' }}></span>
                <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>Loading collectors...</p>
              </div>
            ) : collectors.length === 0 ? (
              <p style={{ textAlign: 'center', gridColumn: '1 / -1', color: 'var(--color-text-muted)' }}>No collectors found.</p>
            ) : (
              collectors.map((c) => (
                <div key={c._id || c.name} className="card">
                  <h3>{c.name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ margin: 0 }}>
                      <strong>Materials:</strong> <span style={{ color: 'var(--color-primary-dark)', fontWeight: 600 }}>{c.materials.join(', ')}</span>
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Contact:</strong> {c.contact}
                    </p>
                    {c.area && (
                      <p style={{ margin: 0 }}>
                        <strong>Area:</strong> {c.area}
                      </p>
                    )}
                  </div>
                  <button 
                    style={{ width: '100%', marginTop: '1.25rem' }} 
                    onClick={() => {
                      setCalcResult('');
                      setShowProceed(false);
                      setCalcInputs({ plastic: '', paper: '', metal: '', glass: '', ewaste: '' });
                      setView('calculator');
                    }}
                  >
                    View Details
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Styled geo-tagged upload container */}
          <div className="upload-container">
            <h3>📤 Geo-Tagged Dump Sites</h3>
            <p>Upload files or geotagged photos to help report dumping sites in your locality.</p>
            
            <div className="file-input-wrapper">
              <input
                type="file"
                id="fileUpload"
                onChange={(e) => setUploadFile(e.target.files[0])}
              />
            </div>
            
            <button onClick={handleUploadFile} disabled={!uploadFile}>
              Submit Photo
            </button>
          </div>
        </div>
      )}

      {/* VIEW: CALCULATOR */}
      {view === 'calculator' && (
        <div className="container animate-fade-in">
          <div className="calculator-container">
            <h2>Recycle Calculator</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '-0.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Select your recycled materials quantities below to update your points.
            </p>
            
            <form onSubmit={handleCalculate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Plastic (kg)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={calcInputs.plastic}
                  onChange={(e) => setCalcInputs({ ...calcInputs, plastic: e.target.value })}
                  min="0"
                  step="any"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Paper (kg)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={calcInputs.paper}
                  onChange={(e) => setCalcInputs({ ...calcInputs, paper: e.target.value })}
                  min="0"
                  step="any"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Metal (kg)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={calcInputs.metal}
                  onChange={(e) => setCalcInputs({ ...calcInputs, metal: e.target.value })}
                  min="0"
                  step="any"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Glass (kg)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={calcInputs.glass}
                  onChange={(e) => setCalcInputs({ ...calcInputs, glass: e.target.value })}
                  min="0"
                  step="any"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>E-Waste (kg)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={calcInputs.ewaste}
                  onChange={(e) => setCalcInputs({ ...calcInputs, ewaste: e.target.value })}
                  min="0"
                  step="any"
                />
              </div>
              
              <button type="submit" disabled={loadingAction}>
                {loadingAction ? (
                  <>
                    <span className="spinner"></span> Calculating...
                  </>
                ) : 'Apply & Save Points'}
              </button>
            </form>

            {calcResult && <div id="result">{calcResult}</div>}

            {showProceed && (
              <button className="btn" style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)', boxShadow: 'var(--shadow-accent)', marginTop: '0.5rem' }} onClick={() => setView('profile')}>
                See Profile Details
              </button>
            )}

            <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => setView('directory')}>
              Back to Directory
            </button>
          </div>
        </div>
      )}

      {/* VIEW: PROFILE */}
      {view === 'profile' && (
        <div className="container animate-fade-in">
          <div className="profile-container">
            <div className="profile-pic-container">
              <div className="profile-pic">
                {getUserInitials()}
              </div>
            </div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <p>{user.phone}</p>
            
            <div className="points-badge">
              <span>🌱</span> Total Points: {user.greenPoints || 0}
            </div>

            <h3>Recycling Transaction History</h3>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Material Breakdown</th>
                    <th>Weight (kg)</th>
                    <th>Points Earned</th>
                    <th>Transaction Date</th>
                  </tr>
                </thead>
                <tbody>
                  {!user.history || user.history.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>No transactions recorded yet</td>
                    </tr>
                  ) : (
                    [...user.history].reverse().map((h, i) => (
                      <tr key={h._id || i}>
                        <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>{formatHistoryMaterials(h)}</td>
                        <td>{h.totalKg ?? h.kg ?? '-'} kg</td>
                        <td style={{ fontWeight: 700, color: 'var(--color-accent-dark)' }}>+{h.points} pts</td>
                        <td>{new Date(h.date).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setView('directory')}>
                ⬅ Back to Directory
              </button>
              <button className="btn logout-btn" style={{ flex: 1 }} onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern custom toast component wrapper */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">{getToastIcon(toast.type)}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>✕</button>
            <div className="toast-progress"></div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;
