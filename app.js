import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pathToFileURL } from "node:url";
import { CORS_ORIGIN, PORT } from "./config/env.js";
import { connectToDatabase } from "./database/database.js";
import { arcjetMiddleware } from "./middlewares/arcjet.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import authRouter from "./routes/auth.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import userRouter from "./routes/user.route.js";
import workflowRouter from "./routes/workflow.route.js";

const appPort = PORT || 5500;
const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN ? CORS_ORIGIN.split(",") : true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  app.use(arcjetMiddleware);
}

app.get("/health", (req, res) => {
  void req;

  res.status(200).json({ status: "ok" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/workflow", workflowRouter);
app.use(errorMiddleware);

export const initializeApp = async () => {
  await connectToDatabase();
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await initializeApp();

  app.listen(appPort, () => {
    console.log(
      `Subscription tracker API is running on http://localhost:${appPort}`,
    );
  });
}

export default app;
