import express from 'express';
import serverless from "serverless-http";
import cors from 'cors';
import assetRoutes from './routes/asset.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import userRoutes from './routes/user.routes.js';
import cronRoutes from './routes/cron.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import errorMiddleware from './middlewares/error.midlleware.js'

const app = express();
app.use(cors()); //allow requests from frontend
app.use(express.json());


app.use("/api/assets", assetRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/send-reminders", cronRoutes);
app.use("/api", notificationRoutes);

app.use(errorMiddleware);

app.get("/", (req, res) => {
    res.send("API is running...")
});

// Only start server locally (not on Vercel)
const PORT = process.env.PORT || 5000;
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export const handler = serverless(app);
