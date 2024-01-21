const axios = require("axios");
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
app.use(userRoutes);
app.use(offerRoutes);

app.get("/", async (req, res) => {
  try {
    const url = "https://lereacteur-vinted-api.herokuapp.com/offers";

    const response = await axios.get(url);
    const data = response.data;
    // return res.status(200).json({ message: "Welcome to Vinted home page !" });
    return res.status(200).json({ data });
  } catch (error) {
    // return res.status(500).json({ message: "Internal server error" });
    return res.status(500).json({ message: error.message });
  }
});

app.all("*", (req, res) => {
  return res.status(404).json({ message: "Page not found ..." });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running ...");
});
