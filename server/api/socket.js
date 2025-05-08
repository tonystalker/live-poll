// This file is specifically for Vercel serverless functions
const app = require('../index.js');

// Export the server instance for Vercel serverless functions
module.exports = (req, res) => {
  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }
  
  // Pass the request to the Express app
  return app(req, res);
};
