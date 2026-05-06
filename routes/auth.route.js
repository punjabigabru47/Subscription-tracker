import { Router } from "express";

const authRouter = Router();

authRouter.post("/sign-up", (req, res) => {
  res.send({ title: "Sign Up", message: "Sign up successful" });
});

authRouter.post("/sign-in", (req, res) => {
  res.send({ title: "Sign In", message: "Sign in successful" });
});

authRouter.post("/sign-out", (req, res) => {
  res.send({ title: "Sign Out", message: "Sign out successful" });
});

export default authRouter;
