require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');

const authRoutes = require('./routes/auth');
const cryptoRoutes = require('./routes/crypto');
const tradingRoutes = require('./routes/trading');
const currencyRoutes = require('./routes/currency');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Crypto Trading API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/currency', currencyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
// Initialize database and start server
db.initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Crypto Paper Trading API Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`💰 Initial balance: $${process.env.INITIAL_BALANCE || 10000}\n`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;