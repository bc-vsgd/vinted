const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const User = require("../models/User");

//CREATE
//Sign up
router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const { username, email, password, newsletter } = req.body;
    const foundUser = await User.findOne({ email });
    if (foundUser) {
      return res.status(409).json({ message: "This email already exists" });
    }
    if (!username) {
      return res.status(400).json({ message: "Please enter a username" });
    }
    //New User
    const salt = uid2(24);
    const saltedPassword = password + salt;
    const hash = SHA256(saltedPassword).toString(encBase64);
    const token = uid2(24);

    const newUser = new User({
      email,
      account: { username },
      newsletter,
      token,
      hash,
      salt,
    });
    //Get req.files.picture
    if (req.files) {
      const file = req.files.picture;
      // console.log(file);
      const convertedFile = `data:${file.mimetype};base64,${file.data.toString(
        "base64"
      )}`;
      const sentFile = await cloudinary.uploader.upload(convertedFile, {
        folder: "vinted/users",
        public_id: newUser.id,
      });
      const { secure_url } = sentFile;
      newUser.account.avatar = secure_url;
    }
    await newUser.save();
    //Response
    return res
      .status(201)
      .json({ message: "Account successfully created !", account: newUser });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

//Log in
router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const foundUser = await User.findOne({ email });
    if (!foundUser) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    //Check if valid password
    const { salt, hash } = foundUser;
    const saltedPassword = password + salt;
    const newHash = SHA256(saltedPassword).toString(encBase64);
    if (newHash !== hash) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    //Response
    return res
      .status(200)
      .json({ message: "User successfully logged !", foundUser });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
