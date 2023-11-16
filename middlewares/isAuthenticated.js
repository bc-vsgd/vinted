const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization.replace("Bearer ", "");
  const foundUser = await User.findOne({ token });
  if (!foundUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = foundUser;
  next();
};
module.exports = isAuthenticated;
