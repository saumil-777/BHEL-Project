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

// Allowed Origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://bhel-project-gray.vercel.app',
  'https://bhel-project-klfmutijg-saumil-singhals-projects.vercel.app'
];

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

// Attach io to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log('Blocked CORS Origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
);

// 404
app.use((req, res) =>
  res.status(404).json({
    error: 'Route not found'
  })
);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
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
    await db.raw('SELECT 1');
    console.log('✅ Database connected');

    await db.migrate.latest({
      directory: path.join(__dirname, 'migrations')
    });
    console.log('✅ Migrations applied');

    const orgCount = await db('organizations')
      .count('id as c')
      .first();

    if (+orgCount.c === 0) {
      await db.seed.run({
        directory: path.join(__dirname, 'migrations'),
        specific: '003_seed_data.js'
      });

      console.log('✅ Seed data inserted');
    }

    httpServer.listen(PORT, () => {
      console.log(`🚀 SMIMP Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server start failed!', err);
    process.exit(1);
  }
}

start();

module.exports = { app, io };