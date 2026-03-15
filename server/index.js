require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb, closeDb } = require('./db/init');
const { ensureDirectories } = require('./services/fileParser');
const { startWatcher, stopWatcher } = require('./watcher');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
getDb();

// Ensure content directories exist
ensureDirectories();

// API Routes
app.use('/api/content', require('./routes/content'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/sprint', require('./routes/sprint'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/gamification', require('./routes/gamification'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Nazho Studio server running on http://localhost:${PORT}`);
  startWatcher();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  stopWatcher();
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopWatcher();
  closeDb();
  process.exit(0);
});
