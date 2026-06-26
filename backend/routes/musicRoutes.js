import express from 'express';
import {
  connectSpotify,
  spotifyCallback,
  disconnectSpotify,
  getRecentTracks,
  getTopTracks,
  getTopArtists,
  getPlaylists,
  getMusicInsight
} from '../controllers/musicController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/music/connect - Conditional Authentication
router.get('/connect', (req, res, next) => {
  if (req.query.onboarding === 'true') {
    return next();
  }
  return protect(req, res, next);
}, connectSpotify);

// GET /api/music/callback - Public OAuth Callback
router.get('/callback', spotifyCallback);

// POST /api/music/disconnect - Private
router.post('/disconnect', protect, disconnectSpotify);

// Private data routes
router.get('/recent', protect, getRecentTracks);
router.get('/top-tracks', protect, getTopTracks);
router.get('/top-artists', protect, getTopArtists);
router.get('/playlists', protect, getPlaylists);

// AI music psychology insight
router.get('/insight', protect, getMusicInsight);

export default router;
