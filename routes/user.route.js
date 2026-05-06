import { Router } from "express";

const userRouter = Router();

userRouter.get("/", (req, res) => {
  res.send({ title: "Users", message: " get all Users" });
});

userRouter.get("/:id", (req, res) => {
  res.send({ title: "User", message: " get a User by id" });
});

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
