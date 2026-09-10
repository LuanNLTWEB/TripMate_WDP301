import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token for a user ID
 * @param {string} id - User MongoDB ObjectId
 * @returns {string} Signed JWT token
 */
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

export default generateToken;
