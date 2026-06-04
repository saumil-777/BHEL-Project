require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const routes = require('./routes');
const db = require('./config/database');

const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

// Attach io to request
app.use((req, res, next) => { req.io = io; next(); });

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-org', (orgId) => {
    socket.join(`org-${orgId}`);
    console.log(`Socket ${socket.id} joined org-${orgId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Run migrations and start
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Test DB connection
    await db.raw('SELECT 1');
    console.log('✅ Database connected');

    // Run migrations
    await db.migrate.latest({ directory: path.join(__dirname, 'migrations') });
    console.log('✅ Migrations applied');

    // Seed if empty
    const orgCount = await db('organizations').count('id as c').first();
    if (+orgCount.c === 0) {
      await db.seed.run({ directory: path.join(__dirname, 'migrations'), specific: '003_seed_data.js' });
      console.log('✅ Seed data inserted');
    }

    httpServer.listen(PORT, () => {
      console.log(`\n🚀 SMIMP Server running on port ${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   Health: http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error('\n❌ Server start failed!');
    console.error('   Error:', err.message || err);
    if (err.code === 'ECONNREFUSED') {
      console.error('\n   ⚠️  Cannot connect to PostgreSQL!');
      console.error('   Make sure PostgreSQL is installed and running on port 5432.');
      console.error('   DATABASE_URL:', process.env.DATABASE_URL);
      console.error('\n   Quick fix:');
      console.error('   1. Open Windows Services (services.msc)');
      console.error('   2. Find "postgresql-x64-17" and click Start');
      console.error('   3. Then run: npm run dev\n');
    } else if (err.code === '3D000') {
      console.error('\n   ⚠️  Database "smimp_db" does not exist!');
      console.error('   Run the setup script: .\\setup-database.ps1\n');
    } else if (err.code === '28P01') {
      console.error('\n   ⚠️  Authentication failed! Wrong password.');
      console.error('   Check DATABASE_URL in server/.env\n');
    }
    process.exit(1);
  }
}

start();

module.exports = { app, io };
