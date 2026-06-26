/* ======================================================
   LYRICMIND AI — API SERVICE CLIENT
   ====================================================== */

const BASE_URL = '/api';

export function getToken() {
  return localStorage.getItem('lyricmind_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('lyricmind_token', token);
  } else {
    localStorage.removeItem('lyricmind_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

export const api = {
  // Auth
  login: (userData) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  getProfile: () => request('/auth/profile'),
  updateProfile: (profileData) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  }),

  // Journal
  saveJournal: (text, source = 'typed') => request('/journal', {
    method: 'POST',
    body: JSON.stringify({ text, source })
  }),
  getJournals: () => request('/journal'),

  // Memory Vault
  saveMemory: (memoryData) => request('/memory', {
    method: 'POST',
    body: JSON.stringify(memoryData)
  }),
  getMemories: () => request('/memory'),
  toggleMemoryFavorite: (id) => request(`/memory/${id}/favorite`, {
    method: 'PATCH'
  }),
  searchMemories: (query) => request(`/memory/search?q=${encodeURIComponent(query)}`),

  // Music Sync
  getSpotifyConnectUrl: (queryString = '') => request(`/music/connect${queryString ? '?' + queryString : ''}`),
  disconnectSpotify: () => request('/music/disconnect', {
    method: 'POST'
  }),
  getRecentTracks: () => request('/music/recent'),
  getTopTracks: (range = 'medium_term') => request(`/music/top-tracks?range=${range}`),
  getTopArtists: (range = 'medium_term') => request(`/music/top-artists?range=${range}`),
  getPlaylists: () => request('/music/playlists'),
  getMusicInsight: () => request('/music/insight'),

  // AI Intelligence
  getDailyReflection: () => request('/ai/reflection'),
  getWeeklyReport: () => request('/ai/weekly-report'),
  getPersonalityProfile: () => request('/ai/personality'),
  getGrowthTrajectory: () => request('/ai/trajectory'),
  getThoughtsClusters: () => request('/ai/clusters'),

  // Self-Reflection Chat (RAG)
  askSelfReflection: (question) => request('/ai/self-reflect', {
    method: 'POST',
    body: JSON.stringify({ question })
  })
};
