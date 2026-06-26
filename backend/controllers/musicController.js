import User from '../models/User.js';
import Music from '../models/Music.js';
import jwt from 'jsonwebtoken';
import { classifyTrackMoods, generateMusicPsychologyInsight } from '../ai/groqClient.js';

/**
 * Helper: Refresh Spotify access token if expired or near expiry (less than 1 min left).
 * If refresh fails (e.g., revoked token, old app), marks user as disconnected gracefully.
 */
async function getValidAccessToken(user) {
  if (!user.spotifyConnected || !user.spotifyRefreshToken) {
    throw new Error('Spotify is not connected for this user.');
  }

  const now = new Date();
  // If access token is valid and has at least 60 seconds left, reuse it
  if (user.spotifyAccessToken && user.spotifyTokenExpiry && new Date(user.spotifyTokenExpiry).getTime() - now.getTime() > 60000) {
    return user.spotifyAccessToken;
  }

  console.log(`Refreshing Spotify access token for user ${user._id}...`);

  try {
    const authHeader = 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.spotifyRefreshToken
      })
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`Spotify token endpoint returned non-JSON for user ${user._id}:`, responseText.slice(0, 200));
      throw new Error('Spotify token endpoint returned non-JSON response');
    }

    if (!response.ok) {
      console.warn(`Spotify token refresh failed for user ${user._id} (${data.error}). Marking as disconnected.`);
      // Gracefully mark Spotify as disconnected so stale tokens don't keep failing
      user.spotifyConnected = false;
      user.spotifyAccessToken = undefined;
      user.spotifyRefreshToken = undefined;
      await user.save();
      throw new Error(data.error_description || data.error || 'Failed to refresh Spotify token');
    }

    user.spotifyAccessToken = data.access_token;
    user.spotifyTokenExpiry = new Date(Date.now() + data.expires_in * 1000);
    if (data.refresh_token) {
      user.spotifyRefreshToken = data.refresh_token;
    }
    await user.save();
    return user.spotifyAccessToken;
  } catch (error) {
    console.warn('getValidAccessToken error (non-fatal):', error.message);
    throw error;
  }
}

/**
 * Helper: Parse Spotify API responses and update user error state if needed
 */
async function handleSpotifyResponse(response, user) {
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    if (responseText.includes('Active premium subscription required')) {
      if (user && user.spotifyError !== 'premium_required') {
        user.spotifyError = 'premium_required';
        await user.save();
      }
      throw new Error('PREMIUM_REQUIRED');
    }
    throw new Error('Spotify API returned non-JSON response');
  }

  if (!response.ok) {
    if (responseText.includes('Active premium subscription required')) {
      if (user && user.spotifyError !== 'premium_required') {
        user.spotifyError = 'premium_required';
        await user.save();
      }
      throw new Error('PREMIUM_REQUIRED');
    }
    throw new Error(data.error?.message || data.message || 'Spotify API error');
  }

  // If successful, and user has error, clear it
  if (user && user.spotifyError) {
    user.spotifyError = undefined;
    await user.save();
  }

  return data;
}

/**
 * Helper: Sync recently played tracks from Spotify to MongoDB
 */
export async function syncSpotifyTracks(user) {
  try {
    const accessToken = await getValidAccessToken(user);

    const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await handleSpotifyResponse(response, user);
    const items = data.items || [];

    if (items.length === 0) {
      return;
    }

    // Filter out items already saved in database
    const newItems = [];
    for (const item of items) {
      const playedAt = new Date(item.played_at);
      const exists = await Music.findOne({ userId: user._id, playedAt });
      if (!exists) {
        newItems.push(item);
      }
    }

    if (newItems.length === 0) {
      return; // All tracks are already synced
    }

    // Extract unique tracks for mood classification
    const uniqueTracksMap = new Map();
    newItems.forEach(item => {
      const name = item.track.name;
      const artist = item.track.artists[0]?.name || 'Unknown';
      const key = `${name.toLowerCase()} - ${artist.toLowerCase()}`;
      if (!uniqueTracksMap.has(key)) {
        uniqueTracksMap.set(key, { name, artist });
      }
    });

    const uniqueTracks = Array.from(uniqueTracksMap.values());

    // Classify moods via Groq
    const classifications = await classifyTrackMoods(uniqueTracks);
    const classificationMap = {};
    classifications.forEach(c => {
      const key = `${c.name.toLowerCase()} - ${c.artist.toLowerCase()}`;
      classificationMap[key] = {
        mood: c.mood || 'Chill',
        emoji: c.emoji || '🎵'
      };
    });

    // Create and save new track logs
    const tracksToInsert = newItems.map(item => {
      const name = item.track.name;
      const artist = item.track.artists[0]?.name || 'Unknown';
      const album = item.track.album?.name || '';
      const albumArt = item.track.album?.images?.[0]?.url || '';
      const popularity = item.track.popularity || 0;
      const key = `${name.toLowerCase()} - ${artist.toLowerCase()}`;
      const mapped = classificationMap[key] || { mood: 'Chill', emoji: '🎵' };

      return {
        userId: user._id,
        name,
        artist,
        album,
        albumArt,
        popularity,
        mood: mapped.mood,
        emoji: mapped.emoji,
        playedAt: new Date(item.played_at)
      };
    });

    await Music.insertMany(tracksToInsert);
    console.log(`Successfully synced ${tracksToInsert.length} new Spotify tracks for user ${user.name}`);
  } catch (error) {
    console.error('Error syncing Spotify tracks:', error.message);
  }
}

/**
 * @desc    Generate Spotify Authorization URL
 * @route   GET /api/music/connect
 * @access  Public / Private (Dynamic based on query parameter)
 */
export const connectSpotify = async (req, res) => {
  try {
    const { onboarding, name, gender, age, education } = req.query;

    let state = '';
    if (onboarding === 'true') {
      const userData = { name, gender, age: parseInt(age), education };
      const base64 = Buffer.from(JSON.stringify(userData)).toString('base64');
      state = `onboarding_${base64}`;
    } else {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized access" });
      }
      state = `authorized_${req.user._id}`;
    }

    const scopes = [
      'user-read-recently-played',
      'user-top-read',
      'playlist-read-private',
      'user-read-email'
    ].join(' ');

    const spotifyAuthUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scopes,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      state: state,
      show_dialog: 'true'
    }).toString();

    res.json({ url: spotifyAuthUrl });
  } catch (error) {
    console.error('Error in connectSpotify:', error.message);
    res.status(500).json({ message: 'Server error generating Spotify link' });
  }
};

/**
 * @desc    OAuth Callback page handler
 * @route   GET /api/music/callback
 * @access  Public
 */
export const spotifyCallback = async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    console.error('Spotify callback missing code or state');
    return res.redirect('http://localhost:5177/?spotify=failed');
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Spotify token exchange error:', data);
      return res.redirect('http://localhost:5177/?spotify=failed');
    }

    const { access_token, refresh_token, expires_in } = data;
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    // Fetch Spotify profile
    let spotifyDisplayName = '';
    let spotifyEmail = '';
    let spotifyUserId = '';
    let spotifyAvatar = '';
    let isPremiumError = false;
    try {
      const profileResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        spotifyDisplayName = profileData.display_name || profileData.id || '';
        spotifyEmail = profileData.email || '';
        spotifyUserId = profileData.id || '';
        spotifyAvatar = profileData.images?.[0]?.url || '';
      } else {
        const errText = await profileResponse.text();
        console.error('Spotify profile response not ok:', errText);
        if (errText.includes('Active premium subscription required')) {
          isPremiumError = true;
        } else {
          return res.redirect('http://localhost:5177/?spotify=failed');
        }
      }
    } catch (err) {
      console.warn('Could not fetch Spotify profile:', err.message);
      return res.redirect('http://localhost:5177/?spotify=failed');
    }

    let user;
    let isOnboardingFlow = false;

    if (state.startsWith('authorized_')) {
      const userId = state.replace('authorized_', '');
      user = await User.findById(userId);
      if (!user) {
        return res.redirect('http://localhost:5177/?spotify=failed');
      }

      user.spotifyConnected = true;
      user.spotifyAccessToken = access_token;
      user.spotifyRefreshToken = refresh_token;
      user.spotifyTokenExpiry = tokenExpiry;
      user.spotifyDisplayName = spotifyDisplayName || 'Spotify User';
      user.spotifyEmail = spotifyEmail || '';
      user.spotifyUserId = spotifyUserId || '';
      user.spotifyAvatar = spotifyAvatar || '';
      user.spotifyLastSync = new Date();
      user.spotifyError = isPremiumError ? 'premium_required' : undefined;
      await user.save();

    } else if (state.startsWith('onboarding_')) {
      const base64Data = state.replace('onboarding_', '');
      const userData = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf-8'));
      const { name, gender, age, education } = userData;

      const email = `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
      user = await User.findOne({ email });

      if (user) {
        user.name = name;
        user.gender = gender;
        user.age = age;
        user.education = education;
        user.spotifyConnected = true;
        user.spotifyAccessToken = access_token;
        user.spotifyRefreshToken = refresh_token;
        user.spotifyTokenExpiry = tokenExpiry;
        user.spotifyDisplayName = spotifyDisplayName || 'Spotify User';
        user.spotifyEmail = spotifyEmail || '';
        user.spotifyUserId = spotifyUserId || '';
        user.spotifyAvatar = spotifyAvatar || '';
        user.spotifyLastSync = new Date();
        user.spotifyError = isPremiumError ? 'premium_required' : undefined;
        await user.save();
      } else {
        user = await User.create({
          email,
          name,
          gender,
          age,
          education,
          spotifyConnected: true,
          spotifyAccessToken: access_token,
          spotifyRefreshToken: refresh_token,
          spotifyTokenExpiry: tokenExpiry,
          spotifyDisplayName: spotifyDisplayName || 'Spotify User',
          spotifyEmail: spotifyEmail || '',
          spotifyUserId: spotifyUserId || '',
          spotifyAvatar: spotifyAvatar || '',
          spotifyLastSync: new Date(),
          spotifyError: isPremiumError ? 'premium_required' : undefined
        });
      }
      isOnboardingFlow = true;
    } else {
      console.error('Invalid Spotify state parameter:', state);
      return res.redirect('http://localhost:5177/?spotify=failed');
    }

    // Sync initial tracks (if not premium error)
    if (!isPremiumError) {
      await syncSpotifyTracks(user);
    }

    // Update last sync time
    user.spotifyLastSync = new Date();
    await user.save();

    const redirectStatus = isPremiumError ? 'premium_required' : 'success';

    if (isOnboardingFlow) {
      // Create JWT token for auto-login
      const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'lyricmind_secret_key', {
        expiresIn: '30d'
      });
      return res.redirect(`http://localhost:5177/?token=${jwtToken}&spotify=${redirectStatus}`);
    } else {
      return res.redirect(`http://localhost:5177/?spotify=${redirectStatus}`);
    }
  } catch (error) {
    console.error('Error handling Spotify callback:', error);
    return res.redirect('http://localhost:5177/?spotify=failed');
  }
};

/**
 * @desc    Disconnect Spotify and clear tokens
 * @route   POST /api/music/disconnect
 * @access  Private
 */
export const disconnectSpotify = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.spotifyConnected = false;
    user.spotifyAccessToken = undefined;
    user.spotifyRefreshToken = undefined;
    user.spotifyTokenExpiry = undefined;
    user.spotifyDisplayName = undefined;
    user.spotifyEmail = undefined;
    user.spotifyUserId = undefined;
    user.spotifyAvatar = undefined;
    user.spotifyLastSync = undefined;
    user.spotifyError = undefined;
    await user.save();

    // Clean up synced music logs
    await Music.deleteMany({ userId: user._id });

    res.json({ spotifyConnected: false });
  } catch (error) {
    console.error("Error disconnecting Spotify:", error.message);
    res.status(500).json({ message: "Server error disconnecting Spotify" });
  }
};

/**
 * @desc    Get recent tracks from DB, syncing first
 * @route   GET /api/music/recent
 * @access  Private
 */
export const getRecentTracks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.spotifyConnected) {
      return res.json([]);
    }

    // Sync fresh tracks first
    await syncSpotifyTracks(user);

    // Update last sync time
    user.spotifyLastSync = new Date();
    await user.save();

    const tracks = await Music.find({ userId: req.user._id }).sort({ playedAt: -1 }).limit(50);

    const formatted = tracks.map(t => {
      const diffMs = Date.now() - new Date(t.playedAt).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor(diffMs / (1000 * 60));

      let timeLabel;
      if (diffMins < 60) timeLabel = `${diffMins}m ago`;
      else if (diffHours < 24) timeLabel = `${diffHours}h ago`;
      else if (diffDays === 1) timeLabel = 'Yesterday';
      else timeLabel = `${diffDays} days ago`;

      return {
        id: t._id,
        name: t.name,
        artist: t.artist,
        album: t.album || '',
        albumArt: t.albumArt || '',
        popularity: t.popularity || 0,
        mood: t.mood,
        emoji: t.emoji,
        day: diffDays,
        timeLabel,
        playedAt: t.playedAt
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching recent tracks:", error.message);
    res.status(500).json({ message: "Server error fetching recent tracks" });
  }
};

/**
 * @desc    Get user's top tracks
 * @route   GET /api/music/top-tracks
 * @access  Private
 */
export const getTopTracks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.spotifyConnected) {
      return res.json([]);
    }

    const accessToken = await getValidAccessToken(user);
    const timeRange = req.query.range || 'medium_term';

    const response = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=${timeRange}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    let data;
    try {
      data = await handleSpotifyResponse(response, user);
    } catch (err) {
      if (err.message === 'PREMIUM_REQUIRED') {
        return res.status(403).json({ message: 'Active premium subscription required for the owner of the app.', spotifyError: 'premium_required' });
      }
      return res.status(500).json({ message: err.message || 'Failed to fetch top tracks from Spotify' });
    }

    const items = data.items || [];
    const tracks = items.map((t, idx) => ({
      rank: idx + 1,
      name: t.name,
      artist: t.artists[0]?.name || 'Unknown',
      album: t.album?.name || '',
      albumArt: t.album?.images?.[0]?.url || '',
      popularity: t.popularity || 0,
      spotifyUrl: t.external_urls?.spotify || ''
    }));

    res.json(tracks);
  } catch (error) {
    console.error("Error fetching top tracks:", error.message);
    res.status(500).json({ message: "Server error fetching top tracks" });
  }
};

/**
 * @desc    Get user's top artists
 * @route   GET /api/music/top-artists
 * @access  Private
 */
export const getTopArtists = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.spotifyConnected) {
      return res.json([]);
    }

    const accessToken = await getValidAccessToken(user);
    const timeRange = req.query.range || 'medium_term';

    const response = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=20&time_range=${timeRange}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    let data;
    try {
      data = await handleSpotifyResponse(response, user);
    } catch (err) {
      if (err.message === 'PREMIUM_REQUIRED') {
        return res.status(403).json({ message: 'Active premium subscription required for the owner of the app.', spotifyError: 'premium_required' });
      }
      return res.status(500).json({ message: err.message || 'Failed to fetch top artists from Spotify' });
    }

    const items = data.items || [];
    const artists = items.map((a, idx) => ({
      rank: idx + 1,
      name: a.name,
      genres: a.genres?.slice(0, 4) || [],
      image: a.images?.[0]?.url || '',
      popularity: a.popularity || 0,
      spotifyUrl: a.external_urls?.spotify || ''
    }));

    res.json(artists);
  } catch (error) {
    console.error("Error fetching top artists:", error.message);
    res.status(500).json({ message: "Server error fetching top artists" });
  }
};

/**
 * @desc    Get user's playlists
 * @route   GET /api/music/playlists
 * @access  Private
 */
export const getPlaylists = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.spotifyConnected) {
      return res.json([]);
    }

    const accessToken = await getValidAccessToken(user);

    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    let data;
    try {
      data = await handleSpotifyResponse(response, user);
    } catch (err) {
      if (err.message === 'PREMIUM_REQUIRED') {
        return res.status(403).json({ message: 'Active premium subscription required for the owner of the app.', spotifyError: 'premium_required' });
      }
      return res.status(500).json({ message: err.message || 'Failed to fetch playlists from Spotify' });
    }

    const items = data.items || [];
    const playlists = items.map(p => ({
      name: p.name,
      description: p.description ? p.description.replace(/<[^>]*>/g, '') : '',
      tracksCount: p.tracks?.total || 0,
      image: p.images?.[0]?.url || '',
      owner: p.owner?.display_name || '',
      spotifyUrl: p.external_urls?.spotify || ''
    }));

    res.json(playlists);
  } catch (error) {
    console.error("Error fetching playlists:", error.message);
    res.status(500).json({ message: "Server error fetching playlists" });
  }
};

/**
 * @desc    Get AI music psychology insight from listening patterns
 * @route   GET /api/music/insight
 * @access  Private
 */
export const getMusicInsight = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.spotifyConnected) {
      return res.json({
        headline: 'Connect Spotify for music insights',
        emotionalState: 'Unknown',
        patterns: [],
        insight: 'Connect your Spotify account to receive AI-powered psychological insights from your listening patterns.',
        focus: 0,
        energy: 0
      });
    }

    // Fetch recent tracks from DB
    const recentTracks = await Music.find({ userId: user._id })
      .sort({ playedAt: -1 })
      .limit(30);

    if (recentTracks.length === 0) {
      return res.json({
        headline: 'No listening data yet',
        emotionalState: 'Neutral',
        patterns: ['Start listening on Spotify to receive insights'],
        insight: 'Once you start listening to music, I will analyze your patterns and reveal what your music says about your emotional state.',
        focus: 50,
        energy: 50
      });
    }

    // Fetch top artists for genre data
    let topArtists = [];
    try {
      const accessToken = await getValidAccessToken(user);
      const artistResponse = await fetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=short_term', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (artistResponse.ok) {
        const artistData = await artistResponse.json();
        topArtists = (artistData.items || []).map(a => ({
          name: a.name,
          genres: a.genres?.slice(0, 3) || []
        }));
      }
    } catch (err) {
      console.warn('Could not fetch top artists for insight:', err.message);
    }

    const insight = await generateMusicPsychologyInsight(recentTracks, topArtists);
    res.json(insight);
  } catch (error) {
    console.error("Error generating music insight:", error.message);
    res.status(500).json({ message: "Server error generating music insight" });
  }
};
