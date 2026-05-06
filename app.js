import express from "express";
import { PORT } from "./config/env.js";
import authRouter from "./routes/auth.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import userRouter from "./routes/user.route.js";

const app = express();

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/users", userRouter);

app.listen(PORT, () => {
  console.log(
    `Subscription tracker API is running on http://localhost:${PORT}`,
  );
});

export default app;
