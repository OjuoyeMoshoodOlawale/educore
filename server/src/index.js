import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes.js';
import schoolsRoutes from './modules/schools/schools.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/staff', staffRoutes);

// Every uncaught error becomes a generic 500 to the client — real detail goes to the server log only.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Something went wrong' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`EduCore API listening on :${port}`));
