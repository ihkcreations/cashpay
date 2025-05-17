const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d' // Token validity period (e.g., 30 days)
  });
};

module.exports = generateToken;