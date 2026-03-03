import express from 'express';
import serverless from "serverless-http";
import cors from 'cors';

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

app.use(
    cors({
        origin: "https://reminder-software.vercel.app",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    })
);

// Handle preflight requests manually for Vercel
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', 'https://reminder-software.vercel.app');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Allow-Credentials', 'true');
        return res.status(204).end();
    }
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root endpoint - must be defined FIRST
app.get("/", (req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).send("API is running...");
});

// Health check endpoint for Vercel
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Import and use routes
import assetRoutes from './routes/asset.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import userRoutes from './routes/user.routes.js';
import cronRoutes from './routes/cron.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import errorMiddleware from './middlewares/error.midlleware.js';

app.use("/api/assets", assetRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/send-reminders", cronRoutes);
app.use("/api", notificationRoutes);

app.use(errorMiddleware);

// Only start server locally (not on Vercel)
const PORT = process.env.PORT || 5000;
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export default serverless(app);

