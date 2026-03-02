import express from 'express';
import serverless from "serverless-http";
import cors from 'cors';
import assetRoutes from '../routes/asset.routes.js';
import authRoutes from '../routes/auth.routes.js';
import adminRoutes from '../routes/admin.routes.js';
import userRoutes from '../routes/user.routes.js';
import cronRoutes from '../routes/cron.routes.js';
import errorMiddleware from '../middlewares/error.midlleware.js'

const app = express();
app.use(cors()); //allow requests from frontend
app.use(express.json());


app.use("/assets", assetRoutes);
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/users", userRoutes);
app.use("/send-reminders", cronRoutes);

app.use(errorMiddleware);

app.get("/", (req, res) => {
    res.json({ message: "API is running..." });
});

export default serverless(app);

