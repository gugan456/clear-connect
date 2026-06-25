// ===== CONFIGURATION =====
// Use a relative path so it works on any host (localhost or deployed server)
const API_URL = '/api';

// ===== UTILS =====
function getCurrentUserEmail() {
  return localStorage.getItem('userEmail');
}

function setCurrentUserEmail(email) {
  localStorage.setItem('userEmail', email);
}

function clearUserSession() {
  localStorage.removeItem('userEmail');
}

// ===== FUNCTIONS =====

// 1. Fetch Collectors from API and Render (Index Page)
async function loadAndRenderCollectors() {
  const container = document.getElementById('collectorList');
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/collectors`);
    if (!res.ok) throw new Error('Failed to load collectors');
    const collectors = await res.json();
    renderCollectors(collectors);
  } catch (err) {
    console.error('Could not load collectors:', err);
    container.innerHTML = '<p style="color:#c0392b;">Could not load collectors. Please refresh.</p>';
  }
}

function renderCollectors(list) {
  const container = document.getElementById('collectorList');
  if (!container) return;
  container.innerHTML = '';

  if (!list || list.length === 0) {
    container.innerHTML = '<p>No collectors found.</p>';
    return;
  }

  list.forEach(c => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${c.name}</h3>
      <p><strong>Materials:</strong> ${c.materials.join(', ')}</p>
      <p><strong>Contact:</strong> ${c.contact}</p>
      ${c.area ? `<p><strong>Area:</strong> ${c.area}</p>` : ''}
      <button onclick="window.location.href='calculator.html'">View Details</button>
    `;
    container.appendChild(card);
  });
}

// 2. Save Profile (Signup/Login)
async function saveProfile() {
  const name  = (document.getElementById('name')?.value  || document.getElementById('setupName')?.value  || '').trim();
  const email = (document.getElementById('email')?.value || document.getElementById('setupEmail')?.value || '').trim();
  const phone = (document.getElementById('phone')?.value || document.getElementById('setupPhone')?.value || '').trim();

  if (!name || !email || !phone) {
    alert('Please fill all fields!');
    return;
  }

  const btn = document.querySelector('#profileSetup button, .setup-container .btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    const res = await fetch(`${API_URL}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone }),
    });
    const data = await res.json();

    if (data.success) {
      setCurrentUserEmail(email);
      if (window.location.pathname.endsWith('profile.html')) {
        loadProfile();
      } else {
        window.location.href = 'index.html';
      }
    } else {
      alert('Error saving profile: ' + data.message);
    }
  } catch (err) {
    console.error(err);
    alert('Server error. Ensure backend is running.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Profile'; }
  }
}

// 3. Load Profile (Profile Page)
async function loadProfile() {
  const email = getCurrentUserEmail();
  if (!email) {
    document.getElementById('profileSection').style.display = 'none';
    document.getElementById('setupSection').style.display   = 'block';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/profile/${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('User not found');
    const user = await res.json();

    document.getElementById('setupSection').style.display   = 'none';
    document.getElementById('profileSection').style.display = 'block';

    document.getElementById('userName').textContent  = user.name  || 'User';
    document.getElementById('userEmail').textContent = user.email || '';
    document.getElementById('userPhone').textContent = user.phone || '';
    document.getElementById('points').textContent    = user.greenPoints || 0;

    // Populate History
    const historyTable = document.getElementById('historyTable');
    historyTable.innerHTML = '';

    if (!user.history || user.history.length === 0) {
      historyTable.innerHTML = "<tr><td colspan='4'>No history yet</td></tr>";
    } else {
      // Show newest entries first
      [...user.history].reverse().forEach(h => {
        // Build a readable materials summary from the breakdown object
        const matSummary = h.materials
          ? Object.entries(h.materials)
              .filter(([, kg]) => kg > 0)
              .map(([mat, kg]) => `${mat}: ${kg}kg`)
              .join(', ')
          : (h.material || 'Mixed');

        historyTable.innerHTML += `
          <tr>
            <td>${matSummary}</td>
            <td>${h.totalKg ?? h.kg ?? '-'}</td>
            <td>${h.points}</td>
            <td>${new Date(h.date).toLocaleString()}</td>
          </tr>
        `;
      });
    }

  } catch (err) {
    console.error(err);
    alert('Could not load profile. Please sign in again.');
    clearUserSession();
    window.location.reload();
  }
}

// 4. Calculate Points (Calculator Page)
async function calculateAndSavePoints() {
  const email = getCurrentUserEmail();
  if (!email) {
    alert('Please log in first!');
    window.location.href = 'index.html';
    return;
  }

  const plastic = parseFloat(document.getElementById('plastic')?.value) || 0;
  const paper   = parseFloat(document.getElementById('paper')?.value)   || 0;
  const metal   = parseFloat(document.getElementById('metal')?.value)   || 0;
  const glass   = parseFloat(document.getElementById('glass')?.value)   || 0;
  const ewaste  = parseFloat(document.getElementById('ewaste')?.value)  || 0;

  if (plastic + paper + metal + glass + ewaste === 0) {
    alert('Please enter at least one material quantity.');
    return;
  }

  const btn = document.querySelector('.container button');
  if (btn) { btn.disabled = true; btn.textContent = 'Calculating...'; }

  try {
    const res = await fetch(`${API_URL}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, plastic, paper, metal, glass, ewaste }),
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('result').innerText =
        `You earned: ${data.earned} points 🌱 | Total: ${data.totalPoints} points 🌱`;
      document.getElementById('proceedBtn').style.display = 'inline-block';
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    console.error(err);
    alert('Server error.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Apply'; }
  }
}

// 5. Logout
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    clearUserSession();
    window.location.href = 'index.html';
  }
}

// ===== INITIALIZATION =====
window.onload = () => {
  const path  = window.location.pathname;
  const email = getCurrentUserEmail();

  // Route: index.html
  if (path.endsWith('index.html') || path === '/' || path.endsWith('/index')) {
    if (email) {
      document.getElementById('mainContent').style.display = 'block';
      loadAndRenderCollectors(); // fetch from API
    } else {
      document.getElementById('profileSetup').style.display = 'block';
    }
  }

  // Route: profile.html
  if (path.includes('profile')) {
    loadProfile();
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
  }

  // Route: calculator.html
  if (path.includes('calculate') || path.includes('calculator')) {
    if (!email) window.location.href = 'index.html';
  }
};
