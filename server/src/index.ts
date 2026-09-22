import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import placesRoutes from './routes/places';
import youtubeRoutes from './routes/youtube';
import leadsRoutes from './routes/leads';
import aiRoutes from './routes/ai';
import settingsRoutes from './routes/settings';
import dashboardRoutes from './routes/dashboard';
import whatsappRoutes from './routes/whatsapp';
import repliesRoutes from './routes/replies';
import emailRoutes from './routes/email';
import platformsRoutes from './routes/platforms';
import connectionsRoutes from './routes/connections';
import googleAuthRoutes from './routes/googleAuth';
import contentRoutes from './routes/content';
import excelRoutes from './routes/excel';
import assistantRoutes from './routes/assistant';
import { initDatabase } from './db/database';
import { initializeWhatsApp } from './services/whatsappService';
import { startGmailInboxPolling } from './services/googleOAuthService';

dotenv.config();

// Prevent server exit on puppeteer/wwebjs async errors on Windows
process.on('uncaughtException', (err) => {
  console.error('[Process Warning] Uncaught Exception (handled safely):', err.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Process Warning] Unhandled Rejection (handled safely):', reason?.message || reason);
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/places', placesRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/replies', repliesRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/assistant', assistantRoutes);

// Static uploads directory for media files
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the setup guide as plain text
app.get('/SETUP.md', (_req: Request, res: Response) => {
  const candidates = [
    path.resolve(__dirname, '../../SETUP.md'),
    path.resolve(__dirname, '../../../SETUP.md'),
    path.resolve(process.cwd(), 'SETUP.md'),
    path.resolve(process.cwd(), '../SETUP.md'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (found) {
    res.type('text/plain').sendFile(found);
  } else {
    res.status(404).send('SETUP.md not found.');
  }
});

// Serve built React frontend (client/dist) — no separate Vite dev server needed
const possibleDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
];

let clientDist = possibleDistPaths[0];
for (const p of possibleDistPaths) {
  if (fs.existsSync(path.join(p, 'index.html'))) {
    clientDist = p;
    break;
  }
}

app.use(express.static(clientDist));

// SPA fallback — all non-API routes serve index.html so React Router works
app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Initialize DB, auto-restore WhatsApp session and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`🚀 Outreach Engine running on port ${PORT}`);
    console.log(`🌐 Open in browser: http://localhost:${PORT}`);
    console.log(`🔗 API Base:        http://localhost:${PORT}/api`);
    console.log(`===========================================`);

    // Auto-restore saved WhatsApp connection on server start
    initializeWhatsApp(false).catch((err) => {
      console.log('[WhatsApp Startup] Auto-connect notice:', err.message || err);
    });

    // Poll Gmail inbox for real replies from known leads (no-op if Gmail isn't connected)
    startGmailInboxPolling();
  });
});
