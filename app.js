import cookieParser from "cookie-parser";
import express from "express";
import { PORT } from "./config/env.js";
import { connectToDatabase } from "./database/database.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { createSubscriptionTable } from "./models/subscription.model.js";
import { createUserTable } from "./models/user.model.js";
import authRouter from "./routes/auth.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import userRouter from "./routes/user.route.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/users", userRouter);
app.use(errorMiddleware);

await connectToDatabase();
await createUserTable();
await createSubscriptionTable();

app.listen(PORT, () => {
  console.log(
    `Subscription tracker API is running on http://localhost:${PORT}`,
  );
});

export default app;
