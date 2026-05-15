import { Router } from "express";
import {
  createSubscription,
  getUserSubscriptions,
} from "../controllers/subscription.controller.js";
import { authorize } from "../middlewares/auth.middleware.js";
const subscriptionRouter = Router();

subscriptionRouter.get("/", (req, res) => {
  res.send({
    title: "Subscriptions",
    message: " get all Subscriptions",
  });
});

subscriptionRouter.get("/upcoming-renewals", (req, res) => {
  res.send({
    title: "Subscriptions",
    message: " get all upcoming renewals",
  });
});

subscriptionRouter.get("/:id", (req, res) => {
  res.send({
    title: "Subscription",
    message: " get a Subscription by id",
  });
});

subscriptionRouter.post("/", authorize, createSubscription);

subscriptionRouter.put("/:id", (req, res) => {
  res.send({
    title: "Subscription",
    message: "Update a Subscription by id",
  });
});

subscriptionRouter.delete("/:id", (req, res) => {
  res.send({
    title: "Subscription",
    message: "Delete a Subscription by id",
  });
});

subscriptionRouter.get("/user/:id", authorize, getUserSubscriptions);

subscriptionRouter.put("/:id/cancel", (req, res) => {
  res.send({
    title: "Subscription",
    message: "Cancel a Subscription by id",
  });
});

export default subscriptionRouter;
