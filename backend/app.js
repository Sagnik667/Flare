import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import logger from './config/logger.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import ApiResponse from './utils/apiResponse.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Route Imports
import authRoutes from './modules/auth/auth.routes.js';
import sosRoutes from './modules/sos/sos.routes.js';
import locationRoutes from './modules/location/location.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import volunteerRoutes from './modules/volunteer/volunteer.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import contactRoutes from './modules/emergency-contacts/emergency-contacts.routes.js';
import resourcesRoutes from './modules/resources/resources.routes.js';

dotenv.config();

const app = express();

// 1. Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://*.leaflet.com", "https://*.openstreetmap.org", "wss://*", "ws://*"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.leaflet.com", "https://*.openstreetmap.org"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'self'"], // Allow PDF viewer rendering
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// 2. Logging & Parsing Middlewares
const morganStream = {
  write: (message) => logger.info(message.trim()),
};
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: morganStream }));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Rate Limiter
app.use(generalLimiter);

// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/emergency-contacts', contactRoutes);
app.use('/api/resources', resourcesRoutes);





// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Test Endpoint
app.get('/api/health', (req, res) => {
  return ApiResponse.success(res, 'Flare Emergency API is running normally');
});

// 5. Catch 404 Route
app.use((req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.status = 404;
  next(err);
});

// 6. Global Error Handler (MUST be last)
app.use(errorHandler);

export default app;
