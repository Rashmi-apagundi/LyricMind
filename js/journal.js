/* ======================================================
   LYRICMIND AI — JOURNAL MODULE
   ====================================================== */

import { loadState, saveState } from './db.js';
import { showToast } from './app.js';
import { api } from './api.js';

let voiceInterval = null;
let voiceTimerInterval = null;
let voiceSeconds = 0;
let isRecording = false;

const transcriptionPhrases = [
  "I've been thinking about how I approach my goals lately...",
  "There's something about the quiet morning hours that helps me think clearly...",
  "I realize that when I get overwhelmed, it's usually because I'm trying to do too much at once...",
  "Today I want to focus on being present rather than productive..."
];

export function initJournal(state) {
  setupEditor(state);
  setupVoiceRecording(state);
  setupSpotify(state);
}

function setupEditor(state) {
  const textarea = document.getElementById('journal-textarea');
  const charcount = document.getElementById('journal-charcount');
  const saveBtn = document.getElementById('journal-save-btn');
  const greeting = document.getElementById('journal-greeting');
  const dateEl = document.getElementById('journal-date');

  // Greeting
  const hour = new Date().getHours();
  let greet = 'Good evening';
  if (hour < 12) greet = 'Good morning';
  else if (hour < 17) greet = 'Good afternoon';

  const userName = state.user ? state.user.name.split(' ')[0] : 'there';
  greeting.textContent = `${greet}, ${userName}`;

  const now = new Date();
  dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Character count
  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    charcount.textContent = `${len} character${len !== 1 ? 's' : ''}`;
    saveBtn.disabled = len === 0;
  });

  // Save
  saveBtn.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) return;

    saveBtn.disabled = true;
    const origText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';

    try {
      const source = textarea.dataset.source || 'typed';
      const entry = await api.saveJournal(text, source);

      state.journals.unshift(entry);
      saveState(state);

      textarea.value = '';
      textarea.dataset.source = 'typed';
      charcount.textContent = '0 characters';
      saveBtn.disabled = true;

      showToast('✨', 'Journal entry saved successfully');
    } catch (err) {
      console.error(err);
      showToast('⚠️', 'Failed to save journal entry');
      saveBtn.disabled = false;
    } finally {
      saveBtn.textContent = origText;
    }
  });
}

function setupVoiceRecording(state) {
  const recordBtn = document.getElementById('voice-record-btn');
  const visualizer = document.getElementById('voice-visualizer');
  const statusEl = document.getElementById('voice-status');
  const timerEl = document.getElementById('voice-timer');
  const transcriptionEl = document.getElementById('voice-transcription');
  const transcriptionText = document.getElementById('voice-transcription-text');

  recordBtn.addEventListener('click', () => {
    if (isRecording) {
      stopRecording(recordBtn, visualizer, statusEl, timerEl, transcriptionEl, transcriptionText, state);
    } else {
      startRecording(recordBtn, visualizer, statusEl, timerEl, transcriptionEl, transcriptionText);
    }
  });
}

function startRecording(btn, viz, status, timer, transEl, transText) {
  isRecording = true;
  voiceSeconds = 0;

  btn.classList.add('recording');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;

  viz.classList.add('active');
  status.className = 'voice-section__status recording';
  status.textContent = 'Recording...';

  timer.textContent = '0:00';

  transEl.classList.add('visible');
  transText.innerHTML = '<span class="voice-transcription__cursor"></span>';

  // Timer
  voiceTimerInterval = setInterval(() => {
    voiceSeconds++;
    const m = Math.floor(voiceSeconds / 60);
    const s = voiceSeconds % 60;
    timer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);

  // Simulate transcription typing
  const phrase = transcriptionPhrases[Math.floor(Math.random() * transcriptionPhrases.length)];
  let charIdx = 0;
  voiceInterval = setInterval(() => {
    if (charIdx < phrase.length) {
      transText.innerHTML = phrase.substring(0, charIdx + 1) + '<span class="voice-transcription__cursor"></span>';
      charIdx++;
    }
  }, 60);

  // Randomize bar heights
  const bars = viz.querySelectorAll('.voice-visualizer__bar');
  bars.forEach(bar => {
    const delay = Math.random() * 0.4;
    const duration = 0.3 + Math.random() * 0.5;
    bar.style.animationDelay = `${delay}s`;
    bar.style.animationDuration = `${duration}s`;
  });
}

function stopRecording(btn, viz, status, timer, transEl, transText, state) {
  isRecording = false;

  clearInterval(voiceTimerInterval);
  clearInterval(voiceInterval);

  btn.classList.remove('recording');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`;

  viz.classList.remove('active');

  status.className = 'voice-section__status transcribing';
  status.textContent = 'Transcribing...';

  // Remove cursor
  const cursorEl = transText.querySelector('.voice-transcription__cursor');
  if (cursorEl) cursorEl.remove();

  setTimeout(() => {
    status.className = 'voice-section__status';
    status.textContent = 'Ready';

    // Add transcribed text to textarea
    const textarea = document.getElementById('journal-textarea');
    const existingText = textarea.value;
    const transcribed = transText.textContent;
    textarea.value = existingText ? existingText + '\n\n' + transcribed : transcribed;
    textarea.dataset.source = 'voice';

    const charcount = document.getElementById('journal-charcount');
    const saveBtn = document.getElementById('journal-save-btn');
    charcount.textContent = `${textarea.value.length} characters`;
    saveBtn.disabled = false;

    showToast('🎙️', 'Voice note transcribed');
  }, 1500);
}

function setupSpotify(state) {
  const toggle = document.getElementById('spotify-toggle');
  const statusEl = document.getElementById('spotify-status');
  const recentEl = document.getElementById('spotify-recent');
  const recentList = document.getElementById('spotify-recent-list');

  toggle.checked = state.spotifyConnected;
  updateSpotifyUI(state.spotifyConnected, statusEl, recentEl, recentList, state);

  toggle.addEventListener('change', async () => {
    if (toggle.checked) {
      try {
        const res = await api.getSpotifyConnectUrl();
        window.location.href = res.url;
      } catch (err) {
        toggle.checked = false;
        showToast('⚠️', 'Failed to connect Spotify');
      }
    } else {
      try {
        const res = await api.disconnectSpotify();
        state.spotifyConnected = false;
        if (state.user) state.user.spotifyDisplayName = undefined;
        saveState(state);

        const settingsToggle = document.getElementById('settings-spotify-toggle');
        if (settingsToggle) settingsToggle.checked = false;

        updateSpotifyUI(false, statusEl, recentEl, recentList, state);
        showToast('🎵', 'Spotify disconnected');
      } catch (err) {
        toggle.checked = true;
        showToast('⚠️', 'Spotify disconnect failed');
      }
    }
  });
}

function updateSpotifyUI(connected, statusEl, recentEl, recentList, state) {
  if (connected) {
    const displayName = (state && state.user && state.user.spotifyDisplayName) ? state.user.spotifyDisplayName : 'Spotify';
    const email = (state && state.user && state.user.spotifyEmail) ? state.user.spotifyEmail : '';
    const syncTime = (state && state.user && state.user.spotifyLastSync)
      ? new Date(state.user.spotifyLastSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Just now';

    const hasPremiumError = (state && state.user && state.user.spotifyError === 'premium_required');

    if (hasPremiumError) {
      statusEl.className = 'spotify-status connected spotify-status--error';
      statusEl.innerHTML = `
        <span class="spotify-status__dot" style="background-color:#ea580c"></span>
        <div class="spotify-connected-info">
          <div class="spotify-connected-name">${displayName} (API Restricted)</div>
          <div class="spotify-connected-meta" style="color:#ea580c;font-weight:500;">
            ⚠️ Premium required for Developer App. <a href="#" id="spotify-error-explain" style="text-decoration:underline;color:inherit;font-weight:600">Details</a>
          </div>
        </div>
      `;
      setTimeout(() => {
        const link = document.getElementById('spotify-error-explain');
        if (link) {
          link.onclick = (e) => {
            e.preventDefault();
            alert('Spotify API Access Restricted:\n\nSpotify requires the owner of the developer application (under which the Client ID is registered) to have an active paid Spotify Premium subscription.\n\nSince the developer account is currently Free, all Web API calls return 403 Forbidden. To restore connectivity, please upgrade the Spotify developer account to Premium.');
          };
        }
      }, 50);
    } else {
      statusEl.className = 'spotify-status connected spotify-status--connected';
      statusEl.innerHTML = `
        <span class="spotify-status__dot"></span>
        <div class="spotify-connected-info">
          <div class="spotify-connected-name">${displayName}${email ? ` · ${email}` : ''}</div>
          <div class="spotify-connected-meta">Spotify Connected · Last sync: ${syncTime}</div>
        </div>
      `;
    }
    recentEl.classList.add('visible');
    renderRecentTracks(recentList, state);
  } else {
    statusEl.className = 'spotify-status';
    statusEl.innerHTML = '<span class="spotify-status__dot"></span>Not connected';
    recentEl.classList.remove('visible');
    recentList.innerHTML = '';
  }
}

async function renderRecentTracks(container, state) {
  const hasPremiumError = (state && state.user && state.user.spotifyError === 'premium_required');
  if (hasPremiumError) {
    container.innerHTML = '<p style="color:var(--text-tertiary);padding:10px 0;line-height:1.4;">⚠️ No tracks synced. Spotify API returned 403 (Active Premium subscription required for developer app owner).</p>';
    return;
  }

  container.innerHTML = '<p style="color:var(--text-tertiary);padding:10px 0;">Loading tracks...</p>';
  try {
    const tracks = await api.getRecentTracks();
    const todayTracks = tracks.filter(t => t.day <= 2).slice(0, 6);
    if (todayTracks.length === 0) {
      container.innerHTML = '<p style="color:var(--text-tertiary);padding:10px 0;">No tracks logged recently. Start listening on Spotify!</p>';
    } else {
      container.innerHTML = todayTracks.map(t => `
        <div class="spotify-track">
          <div class="spotify-track__art">
            ${t.albumArt
              ? `<img src="${t.albumArt}" alt="${t.album || t.name}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'" />`
              : t.emoji || '🎵'
            }
          </div>
          <div class="spotify-track__info">
            <div class="spotify-track__name">${t.name}</div>
            <div class="spotify-track__artist">${t.artist}${t.album ? ` · ${t.album}` : ''}</div>
          </div>
          <span class="spotify-track__mood">${t.mood}</span>
        </div>
      `).join('');
    }

    // Load music psychology insight
    loadMusicInsight(container.parentElement);
  } catch (err) {
    container.innerHTML = '<p style="color:var(--text-tertiary);padding:10px 0;">Failed to load tracks.</p>';
  }
}

async function loadMusicInsight(parentSection) {
  // Remove any existing insight card
  const existing = parentSection.querySelector('.music-insight-card');
  if (existing) existing.remove();

  try {
    const insight = await api.getMusicInsight();
    if (!insight || !insight.insight) return;

    const card = document.createElement('div');
    card.className = 'music-insight-card';
    card.innerHTML = `
      <div class="music-insight-card__header">
        <div class="music-insight-card__icon">🧠</div>
        <div class="music-insight-card__title">Music Psychology</div>
      </div>
      <div class="music-insight-card__headline">${insight.headline || 'Your music reveals your inner world'}</div>
      <div class="music-insight-card__text">${insight.insight}</div>
      ${insight.genreThemes && insight.genreThemes.length > 0 ? `
        <div class="music-insight-card__tags">
          ${insight.genreThemes.map(t => `<span class="music-insight-tag">${t}</span>`).join('')}
        </div>
      ` : ''}
      ${(insight.focusScore !== undefined || insight.energyScore !== undefined) ? `
        <div class="music-scores-bar">
          <div class="music-score-item">
            <div class="music-score-label">Focus</div>
            <div class="music-score-track"><div class="music-score-fill" style="width:${insight.focusScore || 0}%"></div></div>
          </div>
          <div class="music-score-item">
            <div class="music-score-label">Energy</div>
            <div class="music-score-track"><div class="music-score-fill" style="width:${insight.energyScore || 0}%"></div></div>
          </div>
        </div>
      ` : ''}
    `;
    parentSection.appendChild(card);
  } catch (err) {
    // Silently fail — insight is supplementary
    console.warn('Music insight failed to load:', err.message);
  }
}
