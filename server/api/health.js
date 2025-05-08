// Simple health check endpoint
module.exports = (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'Live Poll API is running',
    timestamp: new Date().toISOString()
  });
};
