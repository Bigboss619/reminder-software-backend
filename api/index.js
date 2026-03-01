import express from 'express';
import serverless from "serverless-http";
import cors from 'cors';
import assetRoutes from '../src/routes/asset.routes.js';
import authRoutes from '../src/routes/auth.routes.js';
import adminRoutes from '../src/routes/admin.routes.js';
import userRoutes from '../src/routes/user.routes.js';
import cronRoutes from '../src/routes/cron.routes.js';
import errorMiddleware from '../src/middlewares/error.midlleware.js'

const app = express();
app.use(cors()); //allow requests from frontend
app.use(express.json());


app.use("/api/assets", assetRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/send-reminder", cronRoutes);

app.use(errorMiddleware);

app.get("/", (req, res) => {
    res.send("API is running...")
});

export default serverless(app);
