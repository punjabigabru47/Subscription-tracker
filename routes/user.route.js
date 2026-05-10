import { Router } from "express";
import { getUser, getUsers } from "../controllers/user.controller.js";
import { authorize } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.get("/", getUsers);

userRouter.get("/:id", authorize, getUser);

userRouter.post("/", (req, res) => {
  res.send({ title: "User", message: " create a new User" });
});

userRouter.put("/:id", (req, res) => {
  res.send({ title: "User", message: " update a User by id" });
});

userRouter.delete("/:id", (req, res) => {
  res.send({ title: "User", message: " delete a User by id" });
});

export default userRouter;
