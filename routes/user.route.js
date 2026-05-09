import { Router } from "express";
import { getUser, getUsers } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/", getUsers);

userRouter.get("/:id", getUser);

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
