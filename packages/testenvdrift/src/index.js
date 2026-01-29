const express = require('express');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the EnvDrift Test API',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/config', (req, res) => {
  // Return non-sensitive config info
  res.json({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    appName: process.env.APP_NAME,
    logLevel: process.env.LOG_LEVEL,
    // Never expose secrets in responses!
  });
});

// API routes
app.get('/api/users', (req, res) => {
  // Simulated user data
  res.json([
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ]);
});

app.post('/api/webhook', (req, res) => {
  // Simulated webhook handler (would use STRIPE_WEBHOOK_SECRET in real app)
  console.log('Webhook received:', req.body);
  res.json({ received: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
