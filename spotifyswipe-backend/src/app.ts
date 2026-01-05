// app.ts (your middleware hub)
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import authRoutes from './routes/auth';
import playlistRoutes from './routes/playlists';
import spotifyRoutes from './routes/spotify';
import swipeRoutes from './routes/swipe';

const app = express();

app.use(helmet());
app.use(cors({
	origin: ['http://127.0.0.1:3000', 'http://localhost:3000', process.env.FRONTEND_URL || 'http://127.0.0.1:3000'],
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/swipe', swipeRoutes);

export default app;
