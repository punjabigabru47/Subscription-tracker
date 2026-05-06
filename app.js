/* eslint-disable no-unused-vars */
import express from "express";
const app = express();

//routes
app.get("/", (res, req) => {
  res.send("Welcome to the subscription tracker API");
});

app.listen(3000, () => {
  console.log("Subscription tracker API is running on port 3000");
});
