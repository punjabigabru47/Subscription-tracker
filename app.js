import express from "express";
const app = express();

//routes
app.get("/", (req, res) => {
  res.send("Welcome to the subscription tracker API");
});

app.listen(3000, () => {
  console.log("Subscription tracker API is running on http://localhost:3000");
});

export default app;
