import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes.js';
import schoolsRoutes from './modules/schools/schools.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import studentsRoutes from './modules/students/students.routes.js';
import feesRoutes from './modules/fees/fees.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import resultsRoutes from './modules/results/results.routes.js';
import promotionRoutes from './modules/promotion/promotion.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import recruitmentRoutes from './modules/recruitment/recruitment.routes.js';
import developerRoutes from './modules/developer/developer.routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/promotion', promotionRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/developer', developerRoutes);

// Every uncaught error becomes a generic 500 to the client — real detail goes to the server log only.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Something went wrong' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`EduCore API listening on :${port}`));
