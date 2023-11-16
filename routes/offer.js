require("dotenv").config();

const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: "drjozatzx",
  api_key: "522448521911844",
  api_secret: "bZLUczCdD4rU1-eM0cAL4hY7Axk",
});

const isAuthenticated = require("../middlewares/isAuthenticated");
const Offer = require("../models/Offer");
const User = require("../models/User");

//CREATE
//Publish an offer
router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      //Get parameters, new Offer
      const { title, description, price, condition, city, brand, size, color } =
        req.body;
      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          {
            MARQUE: brand,
          },
          {
            TAILLE: size,
          },
          {
            ÉTAT: condition,
          },
          {
            COULEUR: color,
          },
          {
            EMPLACEMENT: city,
          },
        ],
        owner: req.user,
      });
      //File -> cloudinary
      if (req.files) {
        const file = req.files.picture;
        const convertedFile = `data:${
          file.mimetype
        };base64,${file.data.toString("base64")}`;
        const sentFile = await cloudinary.uploader.upload(convertedFile, {
          folder: "vinted/offers",
          public_id: newOffer.id,
        });
        const { secure_url } = sentFile;
        newOffer.product_image = { secure_url };
      }
      //Save new Offer
      await newOffer.save();
      return res
        .status(201)
        .json({ message: "Offer successfully published", offer: newOffer });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.put("/offer/modify/:id", fileUpload(), async (req, res) => {
  try {
    //Check offer (by id)
    const offerId = req.params.id;
    const foundOffer = await Offer.findById(offerId).populate("owner");
    if (!foundOffer) {
      return res.status(400).json({ message: "This offer does not exist" });
    }
    //Check token
    const ownerToken = foundOffer.owner.token;
    const userToken = req.headers.authorization.replace("Bearer ", "");
    if (ownerToken !== userToken) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    //Get req.body
    const { title, description, price, condition, city, brand, size, color } =
      req.body;
    //Update offer
    const updatedOffer = await Offer.findByIdAndUpdate(offerId, {
      product_name: title,
      product_description: description,
      product_price: price,
      product_details: [
        {
          MARQUE: brand,
        },
        {
          TAILLE: size,
        },
        {
          ÉTAT: condition,
        },
        {
          COULEUR: color,
        },
        {
          EMPLACEMENT: city,
        },
      ],
    });
    //Get req.files.picture
    if (req.files) {
      const file = req.files.picture;
      //Convert file & send to cloudinary
      const convertedFile = `data:${file.mimetype};base64,${file.data.toString(
        "base64"
      )}`;
      await cloudinary.uploader.upload(convertedFile, {
        folder: "vinted/offers",
        public_id: updatedOffer.id,
      });
    }
    //Response
    return res.status(201).json({
      message: "Offer successfully updated",
      offer: await Offer.findById(updatedOffer.id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/offer/remove/:id", async (req, res) => {
  try {
    //Check offer by id
    const offerId = req.params.id;
    const foundOffer = await Offer.findById(offerId).populate("owner");
    if (!foundOffer) {
      return res.status(401).json({ message: "This offer does not exist" });
    }
    //Check token
    const ownerToken = foundOffer.owner.token;
    const userToken = req.headers.authorization.replace("Bearer ", "");
    if (userToken !== ownerToken) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    //Delete offer
    await Offer.findByIdAndDelete(offerId);
    //Response
    return res.status(200).json({ message: "Offer successfully removed" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
