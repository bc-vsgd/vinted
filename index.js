require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

mongoose.connect(`${process.env.MONGODB_URI}Vinted`);
const app = express();

app.use(cors());
app.use(express.json());
const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");
// const offersRoutes = require("./routes/offers");
app.use(userRoutes);
app.use(offerRoutes);
// app.use(offersRoutes);

app.get("/", (req, res) => {
  try {
    return res.status(200).json({ message: "Welcome to Vinted home page !" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.all("*", (req, res) => {
  return res.status(404).json({ message: "Page not found ..." });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running ...");
});
