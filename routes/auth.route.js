import { Router } from "express";
import {
  refreshToken,
  requestPasswordReset,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.get("/", (req, res) => {
  res.send({ title: "Auth", message: "Auth route is working" });
});

authRouter.post("/sign-up", signUp);

authRouter.post("/sign-in", signIn);

authRouter.post("/refresh-token", refreshToken);

authRouter.post("/sign-out", signOut);

authRouter.post("/request-password-reset", requestPasswordReset);

authRouter.post("/reset-password", resetPassword);

export default authRouter;
