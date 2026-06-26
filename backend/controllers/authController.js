import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Generate JWT token helper
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'lyricmind_secret_key', {
    expiresIn: '30d'
  });
};

// Helper to format user object (include all Spotify fields)
function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    gender: user.gender,
    age: user.age,
    education: user.education,
    spotifyConnected: user.spotifyConnected,
    spotifyDisplayName: user.spotifyDisplayName,
    spotifyEmail: user.spotifyEmail,
    spotifyUserId: user.spotifyUserId,
    spotifyAvatar: user.spotifyAvatar,
    spotifyLastSync: user.spotifyLastSync,
    spotifyError: user.spotifyError,
    createdAt: user.createdAt
  };
}

/**
 * @desc    Mock Google Login / Registration
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    const { name, gender, age, education, email } = req.body;
    
    // Default email if not sent by front-end
    const userEmail = email || `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`;

    let user = await User.findOne({ email: userEmail });

    if (user) {
      // Update fields if they have changed or are being provided
      user.name = name || user.name;
      user.gender = gender !== undefined ? gender : user.gender;
      user.age = age !== undefined ? age : user.age;
      user.education = education !== undefined ? education : user.education;
      await user.save();
    } else {
      user = await User.create({
        email: userEmail,
        name,
        gender,
        age,
        education
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: formatUser(user)
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error during authentication" });
  }
};

/**
 * @desc    Get Current User Profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json(formatUser(user));
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error("Profile fetch error:", error.message);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

/**
 * @desc    Update User Profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.gender = req.body.gender !== undefined ? req.body.gender : user.gender;
      user.age = req.body.age !== undefined ? req.body.age : user.age;
      user.education = req.body.education !== undefined ? req.body.education : user.education;
      
      const updatedUser = await user.save();

      res.json(formatUser(updatedUser));
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error("Profile update error:", error.message);
    res.status(500).json({ message: "Server error updating profile" });
  }
};
