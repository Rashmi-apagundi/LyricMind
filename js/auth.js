/* ======================================================
   LYRICMIND AI — AUTH MODULE
   ====================================================== */

import { loadState, saveState } from './db.js';
import { api, setToken, getToken } from './api.js';

export async function initAuth(onLogin) {
  const loginPage = document.getElementById('login-page');
  const appShell = document.getElementById('app-shell');
  const form = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');

  // Check URL query parameters for Spotify redirect values
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  const spotifyStatus = urlParams.get('spotify');

  if (tokenFromUrl) {
    setToken(tokenFromUrl);
  }

  // Clear query parameters from URL so they don't linger
  if (tokenFromUrl || spotifyStatus) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const state = loadState();

  if (spotifyStatus === 'success') {
    state.spotifyConnected = true;
    saveState(state);
    setTimeout(() => {
      import('./app.js').then(({ showToast }) => {
        showToast('🎵', 'Spotify connected successfully!');
      });
    }, 800);
  } else if (spotifyStatus === 'premium_required') {
    state.spotifyConnected = true;
    saveState(state);
    setTimeout(() => {
      import('./app.js').then(({ showToast }) => {
        showToast('⚠️', 'Spotify connected, but API access is restricted.');
      });
      alert('Spotify API Connection Warning:\n\nSpotify recently changed its policy. The owner of the Spotify Developer App (the creator of the Client ID/Secret) must have an active paid Spotify Premium subscription to call the Web API.\n\nSince the developer account is currently Free, Spotify is returning a 403 error. LyricMind will show connected, but cannot fetch your song history until the developer account is Premium.');
    }, 800);
  } else if (spotifyStatus === 'failed') {
    setTimeout(() => {
      import('./app.js').then(({ showToast }) => {
        showToast('⚠️', 'Failed to connect Spotify. Try again.');
      });
    }, 800);
  }

  const token = getToken();

  if (token) {
    try {
      const profile = await api.getProfile();
      state.user = profile;
      state.isLoggedIn = true;
      state.spotifyConnected = profile.spotifyConnected;
      state.joinDate = profile.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : null;

      // Sync fresh data from database (override any stale localStorage)
      try {
        const journals = await api.getJournals();
        state.journals = journals;
      } catch (e) {
        console.warn('Could not fetch journals, using cached data:', e.message);
        if (!state.journals) state.journals = [];
      }

      try {
        const memories = await api.getMemories();
        state.diary = memories;
      } catch (e) {
        console.warn('Could not fetch memories, using cached data:', e.message);
        if (!state.diary) state.diary = [];
      }

      saveState(state);
      showApp(appShell, loginPage);
      onLogin(state);
      return;
    } catch (e) {
      console.warn('Session expired or server unavailable, showing login screen', e.message);
      setToken(null);
      state.user = null;
      state.isLoggedIn = false;
      state.journals = [];
      state.diary = [];
      saveState(state);
    }
  }

  loginPage.classList.add('active');

  // ── Step 1: Form submit → show Spotify onboarding step
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('input-name').value.trim();
    const gender = document.getElementById('input-gender').value;
    const age = parseInt(document.getElementById('input-age').value.trim());
    const education = document.getElementById('input-education').value;

    // Validation
    if (!name || !gender || !age || !education) {
      shakeButton(loginBtn);
      return;
    }

    // Store form data temporarily and show Spotify onboarding step
    showSpotifyOnboardingStep({ name, gender, age, education }, loginBtn, appShell, loginPage, state, onLogin);
  });
}

/**
 * Show the Spotify onboarding intermediate step
 */
function showSpotifyOnboardingStep(userData, loginBtn, appShell, loginPage, state, onLogin) {
  const formCard = document.querySelector('.login-card');
  const onboardingCard = document.getElementById('spotify-onboarding-card');

  if (!onboardingCard) return;

  // Hide form, show onboarding card
  formCard.style.opacity = '0';
  formCard.style.transform = 'scale(0.95)';
  formCard.style.transition = 'all 0.3s ease';

  setTimeout(() => {
    formCard.style.display = 'none';
    onboardingCard.style.display = 'flex';
    onboardingCard.style.opacity = '0';
    onboardingCard.style.transform = 'scale(0.95)';
    setTimeout(() => {
      onboardingCard.style.opacity = '1';
      onboardingCard.style.transform = 'scale(1)';
      onboardingCard.style.transition = 'all 0.35s ease';
    }, 20);
  }, 300);

  // Handle "Connect Spotify" button
  const connectBtn = document.getElementById('onboarding-connect-btn');
  const skipBtn = document.getElementById('onboarding-skip-btn');
  const backBtn = document.getElementById('onboarding-back-btn');

  // Back button
  if (backBtn) {
    backBtn.onclick = () => {
      onboardingCard.style.opacity = '0';
      onboardingCard.style.transform = 'scale(0.95)';
      setTimeout(() => {
        onboardingCard.style.display = 'none';
        formCard.style.display = '';
        formCard.style.opacity = '1';
        formCard.style.transform = 'scale(1)';
      }, 300);
    };
  }

  // Connect Spotify
  if (connectBtn) {
    connectBtn.onclick = async () => {
      connectBtn.classList.add('loading');
      connectBtn.disabled = true;
      try {
        const queryParams = new URLSearchParams({
          onboarding: 'true',
          name: userData.name,
          gender: userData.gender,
          age: userData.age,
          education: userData.education
        });
        const res = await api.getSpotifyConnectUrl(queryParams.toString());
        window.location.href = res.url;
      } catch (err) {
        console.error('Failed to initiate Spotify connection:', err.message);
        connectBtn.classList.remove('loading');
        connectBtn.disabled = false;
      }
    };
  }

  // Skip — login without Spotify
  if (skipBtn) {
    skipBtn.onclick = async () => {
      skipBtn.classList.add('loading');
      skipBtn.disabled = true;
      try {
        const response = await api.login(userData);
        setToken(response.token);

        state.user = response.user;
        state.isLoggedIn = true;
        state.spotifyConnected = response.user.spotifyConnected;
        state.joinDate = response.user.createdAt
          ? new Date(response.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        try {
          const journals = await api.getJournals();
          state.journals = journals;
        } catch (e) {
          state.journals = [];
        }

        try {
          const memories = await api.getMemories();
          state.diary = memories;
        } catch (e) {
          state.diary = [];
        }

        saveState(state);
        showApp(appShell, loginPage);
        onLogin(state);
      } catch (err) {
        console.error('Login failed:', err.message);
        skipBtn.classList.remove('loading');
        skipBtn.disabled = false;
      }
    };
  }
}

function showApp(appShell, loginPage) {
  loginPage.classList.remove('active');
  loginPage.style.display = 'none';
  appShell.classList.remove('hidden');
  appShell.style.display = '';
}

function shakeButton(btn) {
  btn.style.animation = 'shake 0.4s ease';
  btn.addEventListener('animationend', () => {
    btn.style.animation = '';
  }, { once: true });
}

// Add shake keyframes dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
`;
document.head.appendChild(shakeStyle);
