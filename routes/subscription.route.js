import { Router } from "express";

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

subscriptionRouter.post("/", (req, res) => {
  res.send({
    title: "Subscription",
    message: " create a new Subscription",
  });
});

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

subscriptionRouter.get("/user/:id", (req, res) => {
  res.send({
    title: "Subscriptions",
    message: " get all Subscriptions by user id",
  });
});

subscriptionRouter.put("/:id/cancel", (req, res) => {
  res.send({
    title: "Subscription",
    message: "Cancel a Subscription by id",
  });
});

export default subscriptionRouter;
