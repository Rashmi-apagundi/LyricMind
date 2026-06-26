/* ======================================================
   LYRICMIND AI — PROFILE MODULE
   ====================================================== */

import { saveState, clearState } from './db.js';
import { showToast } from './app.js';
import { navigateToVault } from './memory-vault.js';
import { api, setToken } from './api.js';

export function initProfile(state) {
  setupDropdown(state);
  setupModals(state);
  setupProfilePage(state);
}

function setupDropdown(state) {
  const avatar = document.getElementById('navbar-avatar');
  const dropdown = document.getElementById('profile-dropdown');
  const nameEl = document.getElementById('dropdown-name');
  const emailEl = document.getElementById('dropdown-email');

  if (state.user) {
    const initials = state.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    avatar.textContent = initials;
    nameEl.textContent = state.user.name;
    emailEl.textContent = state.user.email || `${state.user.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
  }

  avatar.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== avatar) {
      dropdown.classList.remove('open');
    }
  });

  // Dropdown item clicks
  document.getElementById('menu-profile').addEventListener('click', () => {
    dropdown.classList.remove('open');
    navigateToProfile(state);
  });

  document.getElementById('menu-journal-history').addEventListener('click', () => {
    dropdown.classList.remove('open');
    openModal('modal-journal-history');
    renderJournalHistory(state);
  });

  document.getElementById('menu-song-history').addEventListener('click', () => {
    dropdown.classList.remove('open');
    openModal('modal-song-history');
    renderSongHistory();
  });

  document.getElementById('menu-analysis-history').addEventListener('click', () => {
    dropdown.classList.remove('open');
    openModal('modal-analysis-history');
    renderAnalysisHistory(state);
  });

  // Memory Vault → navigate to the full page
  document.getElementById('menu-personal-diary').addEventListener('click', () => {
    dropdown.classList.remove('open');
    navigateToVault(state);
  });

  document.getElementById('menu-settings').addEventListener('click', () => {
    dropdown.classList.remove('open');
    openModal('modal-settings');
    renderSettings(state);
  });

  document.getElementById('menu-logout').addEventListener('click', () => {
    dropdown.classList.remove('open');
    setToken(null);
    clearState();
    window.location.reload();
  });
}

/* ── Profile Page Navigation ── */
function navigateToProfile(state) {
  // Switch pages (deactivate all, activate profile)
  document.querySelectorAll('#app-shell .page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-profile').classList.add('active');

  // Remove active from navbar tabs
  document.querySelectorAll('.navbar__tab').forEach(t => t.classList.remove('active'));

  renderProfilePage(state);
}

/* ── Profile Page Rendering ── */
function renderProfilePage(state) {
  if (!state.user) return;

  const user = state.user;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const avatarEl = document.getElementById('profile-avatar-large');
  const nameDisplayEl = document.getElementById('profile-display-name');
  const emailEl = document.getElementById('profile-email');

  if (avatarEl) avatarEl.textContent = initials;
  if (nameDisplayEl) nameDisplayEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email || `${user.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;

  // Info values
  const educationLabels = {
    'high-school': 'High School',
    'bachelors': "Bachelor's Degree",
    'masters': "Master's Degree",
    'phd': 'PhD / Doctorate',
    'self-taught': 'Self-taught',
    'other': 'Other'
  };

  const genderLabels = {
    'male': 'Male',
    'female': 'Female',
    'non-binary': 'Non-binary',
    'prefer-not': 'Prefer not to say'
  };

  setText('profile-val-name', user.name);
  setText('profile-val-gender', genderLabels[user.gender] || user.gender);
  setText('profile-val-age', user.age ? `${user.age} years old` : '—');
  setText('profile-val-education', educationLabels[user.education] || user.education);

  // Join date
  const joinDate = state.joinDate
    || (state.user && state.user.createdAt ? new Date(state.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null)
    || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  setText('profile-val-joined', joinDate);

  // Spotify status
  if (state.spotifyConnected && user.spotifyDisplayName) {
    const syncTime = user.spotifyLastSync
      ? new Date(user.spotifyLastSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Just now';
    const emailPart = user.spotifyEmail ? ` · ${user.spotifyEmail}` : '';
    const el = document.getElementById('profile-val-spotify');
    if (user.spotifyError === 'premium_required') {
      setText('profile-val-spotify', `⚠️ Connected (Spotify API Restricted — Premium App Owner Required)`);
      if (el) el.style.color = '#ea580c';
    } else {
      setText('profile-val-spotify', `✓ ${user.spotifyDisplayName}${emailPart} · Synced ${syncTime}`);
      if (el) el.style.color = '#1DB954';
    }
  } else {
    setText('profile-val-spotify', 'Not connected');
    const el = document.getElementById('profile-val-spotify');
    if (el) el.style.color = 'var(--text-tertiary)';
  }

  // Show view, hide edit
  document.getElementById('profile-info-view').classList.remove('hidden');
  document.getElementById('profile-info-edit').classList.add('hidden');
}

/* ── Profile Page Setup ── */
function setupProfilePage(state) {
  const editBtn = document.getElementById('profile-edit-btn');
  const cancelBtn = document.getElementById('profile-cancel-btn');
  const saveBtn = document.getElementById('profile-save-btn');

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      enterEditMode(state);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      document.getElementById('profile-info-view').classList.remove('hidden');
      document.getElementById('profile-info-edit').classList.add('hidden');
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveProfileEdits(state);
    });
  }
}

function enterEditMode(state) {
  if (!state.user) return;

  document.getElementById('profile-edit-name').value = state.user.name || '';
  document.getElementById('profile-edit-gender').value = state.user.gender || 'male';
  document.getElementById('profile-edit-age').value = state.user.age || '';
  document.getElementById('profile-edit-education').value = state.user.education || 'bachelors';

  document.getElementById('profile-info-view').classList.add('hidden');
  document.getElementById('profile-info-edit').classList.remove('hidden');
}

async function saveProfileEdits(state) {
  const name = document.getElementById('profile-edit-name').value.trim();
  const gender = document.getElementById('profile-edit-gender').value;
  const age = parseInt(document.getElementById('profile-edit-age').value);
  const education = document.getElementById('profile-edit-education').value;

  if (!name) {
    showToast('⚠️', 'Name cannot be empty');
    return;
  }

  try {
    const updatedUser = await api.updateProfile({ name, gender, age, education });
    state.user = updatedUser;
    saveState(state);

    // Update header avatar + dropdown
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('navbar-avatar').textContent = initials;
    document.getElementById('dropdown-name').textContent = name;
    document.getElementById('dropdown-email').textContent = updatedUser.email;

    renderProfilePage(state);
    showToast('✓', 'Profile updated');
  } catch (err) {
    console.error(err);
    showToast('⚠️', 'Failed to save changes');
  }
}

function setupModals(state) {
  // Close buttons
  document.querySelectorAll('.modal__close').forEach(btn => {
    btn.addEventListener('click', () => {
      const overlay = btn.closest('.modal-overlay');
      closeModal(overlay.id);
    });
  });

  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(overlay => {
        closeModal(overlay.id);
      });
      const diaryForm = document.getElementById('diary-form-overlay');
      if (diaryForm) diaryForm.classList.remove('open');
    }
  });
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

/* ── Journal History ── */
function renderJournalHistory(state) {
  const container = document.getElementById('journal-history-list');
  if (!state.journals || state.journals.length === 0) {
    container.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:40px 0;">No journal entries yet.</p>';
    return;
  }
  container.innerHTML = state.journals.map(j => `
    <div class="history-entry">
      <div class="history-entry__date">${j.date}${j.source === 'voice' ? ' · 🎙️ Voice' : ''}</div>
      <div class="history-entry__text">${j.text}</div>
      <span class="history-entry__mood">${j.mood}</span>
    </div>
  `).join('');
}

/* ── Song History — 4-Tab Premium View ── */
async function renderSongHistory() {
  const container = document.getElementById('song-history-list');
  container.innerHTML = `
    <div class="sh-tabs">
      <button class="sh-tab active" data-tab="recent">Recently Played</button>
      <button class="sh-tab" data-tab="top-tracks">Top Tracks</button>
      <button class="sh-tab" data-tab="artists">Top Artists</button>
      <button class="sh-tab" data-tab="playlists">Playlists</button>
    </div>
    <div id="sh-panel-recent" class="sh-panel active">
      <div class="sh-loading">⏳ Loading your listening history...</div>
    </div>
    <div id="sh-panel-top-tracks" class="sh-panel">
      <div class="sh-loading">⏳ Loading top tracks...</div>
    </div>
    <div id="sh-panel-artists" class="sh-panel">
      <div class="sh-loading">⏳ Loading top artists...</div>
    </div>
    <div id="sh-panel-playlists" class="sh-panel">
      <div class="sh-loading">⏳ Loading playlists...</div>
    </div>
  `;

  // Tab switching
  container.querySelectorAll('.sh-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.sh-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.sh-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`sh-panel-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Load all 4 tabs in parallel
  await Promise.all([
    loadRecentPanel(document.getElementById('sh-panel-recent')),
    loadTopTracksPanel(document.getElementById('sh-panel-top-tracks')),
    loadArtistsPanel(document.getElementById('sh-panel-artists')),
    loadPlaylistsPanel(document.getElementById('sh-panel-playlists'))
  ]);
}

async function loadRecentPanel(panel) {
  try {
    const tracks = await api.getRecentTracks();
    if (!tracks || tracks.length === 0) {
      panel.innerHTML = `<div class="sh-empty">
        <div class="sh-empty__icon">🎵</div>
        <p>No listening history yet. Make sure Spotify is connected and you've been listening.</p>
      </div>`;
      return;
    }

    // Group by day label
    const grouped = {};
    tracks.forEach(t => {
      const label = t.timeLabel || (t.day === 0 ? 'Today' : t.day === 1 ? 'Yesterday' : `${t.day} days ago`);
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(t);
    });

    panel.innerHTML = Object.entries(grouped).map(([dayLabel, dayTracks]) => `
      <div class="sh-day-group">
        <div class="sh-day-label">${dayLabel}</div>
        ${dayTracks.map(t => `
          <div class="sh-track-card">
            <div class="sh-track-art">
              ${t.albumArt
                ? `<img src="${t.albumArt}" alt="${escapeHtml(t.album || t.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="sh-track-art__fallback" style="display:none">${t.emoji || '🎵'}</span>`
                : `<span class="sh-track-art__fallback">${t.emoji || '🎵'}</span>`}
            </div>
            <div class="sh-track-info">
              <div class="sh-track-name">${escapeHtml(t.name)}</div>
              <div class="sh-track-artist">${escapeHtml(t.artist)}${t.album ? ` · ${escapeHtml(t.album)}` : ''}</div>
            </div>
            <span class="sh-mood-pill sh-mood-${(t.mood || 'chill').toLowerCase()}">${t.mood || 'Chill'}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  } catch (err) {
    panel.innerHTML = '<div class="sh-empty"><p>Failed to load. Make sure Spotify is connected.</p></div>';
  }
}

async function loadTopTracksPanel(panel) {
  try {
    const tracks = await api.getTopTracks('medium_term');
    if (!tracks || tracks.length === 0) {
      panel.innerHTML = `<div class="sh-empty">
        <div class="sh-empty__icon">📈</div>
        <p>No top tracks data yet. Listen more on Spotify!</p>
      </div>`;
      return;
    }
    panel.innerHTML = `
      <div class="sh-section-label">Your top tracks · Last 6 months</div>
      ${tracks.map(t => `
        <div class="sh-track-card">
          <div class="sh-rank">${t.rank}</div>
          <div class="sh-track-art">
            ${t.albumArt
              ? `<img src="${t.albumArt}" alt="${escapeHtml(t.album || t.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="sh-track-art__fallback" style="display:none">🎵</span>`
              : `<span class="sh-track-art__fallback">🎵</span>`}
          </div>
          <div class="sh-track-info">
            <div class="sh-track-name">${escapeHtml(t.name)}</div>
            <div class="sh-track-artist">${escapeHtml(t.artist)}${t.album ? ` · ${escapeHtml(t.album)}` : ''}</div>
          </div>
          ${t.popularity ? `<div class="sh-popularity">
            <div class="sh-popularity-bar" style="width:${t.popularity}%"></div>
            <span>${t.popularity}</span>
          </div>` : ''}
        </div>
      `).join('')}
    `;
  } catch (err) {
    panel.innerHTML = '<div class="sh-empty"><p>Failed to load top tracks.</p></div>';
  }
}

async function loadArtistsPanel(panel) {
  try {
    const artists = await api.getTopArtists('medium_term');
    if (!artists || artists.length === 0) {
      panel.innerHTML = `<div class="sh-empty">
        <div class="sh-empty__icon">🎤</div>
        <p>No top artists yet. Keep listening on Spotify!</p>
      </div>`;
      return;
    }
    panel.innerHTML = `
      <div class="sh-section-label">Your top artists · Last 6 months</div>
      <div class="sh-artists-grid">
        ${artists.map(a => `
          <div class="sh-artist-card">
            <div class="sh-artist-img">
              ${a.image
                ? `<img src="${a.image}" alt="${escapeHtml(a.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="sh-artist-img__fallback" style="display:none">🎤</span>`
                : `<span class="sh-artist-img__fallback">🎤</span>`}
              <div class="sh-artist-rank">#${a.rank}</div>
            </div>
            <div class="sh-artist-name">${escapeHtml(a.name)}</div>
            <div class="sh-artist-genres">
              ${(a.genres || []).map(g => `<span class="sh-genre-tag">${escapeHtml(g)}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    panel.innerHTML = '<div class="sh-empty"><p>Failed to load top artists.</p></div>';
  }
}

async function loadPlaylistsPanel(panel) {
  try {
    const playlists = await api.getPlaylists();
    if (!playlists || playlists.length === 0) {
      panel.innerHTML = `<div class="sh-empty">
        <div class="sh-empty__icon">📋</div>
        <p>No playlists found on your Spotify account.</p>
      </div>`;
      return;
    }
    panel.innerHTML = `
      <div class="sh-section-label">Your Spotify playlists</div>
      ${playlists.map(p => `
        <div class="sh-playlist-card">
          <div class="sh-playlist-img">
            ${p.image
              ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="sh-track-art__fallback" style="display:none">🎼</span>`
              : `<span class="sh-track-art__fallback">🎼</span>`}
          </div>
          <div class="sh-playlist-info">
            <div class="sh-playlist-name">${escapeHtml(p.name)}</div>
            ${p.description ? `<div class="sh-playlist-desc">${escapeHtml(p.description)}</div>` : ''}
            <div class="sh-playlist-meta">${p.tracksCount} tracks${p.owner ? ` · by ${escapeHtml(p.owner)}` : ''}</div>
          </div>
        </div>
      `).join('')}
    `;
  } catch (err) {
    panel.innerHTML = '<div class="sh-empty"><p>Failed to load playlists.</p></div>';
  }
}

/* ── Analysis History ── */
function renderAnalysisHistory(state) {
  const container = document.getElementById('analysis-history-list');
  if (!state || !state.journals || state.journals.length === 0) {
    container.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:40px 0;">No analysis history yet. Start journaling to generate insights.</p>';
    return;
  }
  container.innerHTML = state.journals.map(j => `
    <div class="analysis-history-entry">
      <div class="analysis-history-entry__date">${j.date}</div>
      <div class="analysis-history-entry__mood">
        <span class="mood-pill active">${j.mood}</span>
      </div>
      <div class="analysis-history-entry__insight">${j.text.slice(0, 150)}${j.text.length > 150 ? '...' : ''}</div>
    </div>
  `).join('');
}

/* ── Settings ── */
function renderSettings(state) {
  const spotifyToggle = document.getElementById('settings-spotify-toggle');
  spotifyToggle.checked = state.spotifyConnected;

  const spotifyDesc = document.getElementById('settings-spotify-desc');
  if (spotifyDesc) {
    if (state.spotifyConnected && state.user && state.user.spotifyDisplayName) {
      const syncTime = state.user.spotifyLastSync
        ? `Last sync: ${new Date(state.user.spotifyLastSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
        : 'Connected';
      const emailStr = state.user.spotifyEmail ? ` · ${state.user.spotifyEmail}` : '';
      if (state.user.spotifyError === 'premium_required') {
        spotifyDesc.innerHTML = `<strong style="color:#ea580c">${state.user.spotifyDisplayName} (API Restricted)</strong>${emailStr}<br><span style="font-size:0.75rem;color:#ea580c">⚠️ Spotify Premium required for Developer App Owner</span>`;
      } else {
        spotifyDesc.innerHTML = `<strong style="color:#1DB954">${state.user.spotifyDisplayName}</strong>${emailStr}<br><span style="font-size:0.75rem;opacity:0.7">${syncTime}</span>`;
      }
      spotifyDesc.style.color = '';
    } else {
      spotifyDesc.textContent = 'Sync your listening history for AI insights';
      spotifyDesc.style.color = '';
    }
  }

  // Clone toggle to remove previous listeners
  const newToggle = spotifyToggle.cloneNode(true);
  spotifyToggle.parentNode.replaceChild(newToggle, spotifyToggle);

  newToggle.addEventListener('change', async () => {
    if (newToggle.checked) {
      try {
        const res = await api.getSpotifyConnectUrl();
        window.location.href = res.url;
      } catch (err) {
        newToggle.checked = false;
        showToast('⚠️', 'Failed to connect Spotify');
      }
    } else {
      try {
        await api.disconnectSpotify();
        state.spotifyConnected = false;
        if (state.user) {
          state.user.spotifyDisplayName = undefined;
          state.user.spotifyEmail = undefined;
          state.user.spotifyLastSync = undefined;
        }
        saveState(state);
        
        const mainToggle = document.getElementById('spotify-toggle');
        if (mainToggle) mainToggle.checked = false;

        if (spotifyDesc) {
          spotifyDesc.textContent = 'Sync your listening history for AI insights';
          spotifyDesc.style.color = '';
        }
        
        // Update Spotify UI on journal page
        const statusEl = document.getElementById('spotify-status');
        const recentEl = document.getElementById('spotify-recent');
        const recentList = document.getElementById('spotify-recent-list');
        if (statusEl && recentEl && recentList) {
          statusEl.className = 'spotify-status';
          statusEl.innerHTML = '<span class="spotify-status__dot"></span>Not connected';
          recentEl.classList.remove('visible');
          recentList.innerHTML = '';
        }

        showToast('⚙️', 'Spotify disconnected');
      } catch (err) {
        newToggle.checked = true;
        showToast('⚠️', 'Spotify disconnect failed');
      }
    }
  });
}

/* ── Helper ── */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
