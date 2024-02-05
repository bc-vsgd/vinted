const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const axios = require("axios");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isAuthenticated = require("../middlewares/isAuthenticated");
const convertFile = require("../utils/convertFile");
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
      const {
        title,
        description,
        price,
        condition,
        city,
        brand,
        size,
        color,
        payment,
      } = req.body;
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
          { "MODES DE PAIEMENT": payment },
        ],
        owner: req.user,
      });
      // console.log(req.files);
      //Upload files to Cloudinary
      if (req.files) {
        //One file
        if (req.files.picture.length === undefined) {
          const convertedFile = convertFile(req.files.picture);
          const sentFile = await cloudinary.uploader.upload(convertedFile, {
            folder: `vinted/offers/${newOffer.id}`,
            public_id: "preview",
          });
          newOffer.product_image = sentFile;
          newOffer.product_pictures.push(sentFile);
        }
        //Many files
        else {
          for (let i = 0; i < req.files.picture.length; i++) {
            const picture = req.files.picture[i];
            //First file
            if (i === 0) {
              const convertedFile = convertFile(picture);
              const sentFile = await cloudinary.uploader.upload(convertedFile, {
                folder: `vinted/offers/${newOffer.id}`,
                public_id: "preview",
              });
              newOffer.product_image = sentFile;
              newOffer.product_pictures.push(sentFile);
            }
            //Other files
            else {
              const convertedFile = convertFile(picture);
              const sentFile = await cloudinary.uploader.upload(convertedFile, {
                folder: `vinted/offers/${newOffer.id}`,
              });
              newOffer.product_pictures.push(sentFile);
            }
          }
        }
      }

      //Save new Offer in DB
      await newOffer.save();

      //Response
      return res
        .status(201)
        .json({ message: "Offer successfully published", offer: newOffer });
    } catch (error) {
      // return res.status(500).json({ message: "Internal server error" });
      return res.status(500).json({ message: error.message });
    }
  }
);

//READ
//Get offers with filters
router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, page } = req.query;
    //Title, priceMax, priceMin
    const filter = {};
    if (title) {
      filter.product_name = new RegExp(title, "i");
    }
    if (priceMin && priceMax) {
      filter.product_price = { $gte: Number(priceMin), $lte: Number(priceMax) };
    } else if (priceMin) {
      filter.product_price = { $gte: Number(priceMin) };
    } else if (priceMax) {
      filter.product_price = { $lte: Number(priceMax) };
    }
    //Sort
    const sortFilter = {};
    if (sort) {
      sortFilter.product_price = sort.replace("price-", "");
    }
    //Page (default 10 results / page)
    const limit = 30;
    let skip = 0;
    if (page) {
      skip = (Number(page) - 1) * limit;
    }
    //Filter offers
    const offers = await Offer.find(filter)
      .sort(sortFilter)
      .limit(limit)
      .skip(skip)
      .populate("owner");
    //Response
    if (offers.length === 0) {
      return res.status(200).json({ message: "No offer for the moment ..." });
    }
    return res.status(200).json({ count: offers.length, offers });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

//READ
//Get offer by id
router.get("/offer/:id", async (req, res) => {
  try {
    const offerId = req.params.id;
    // console.log("back >>> route offer/:id >>>>", offerId);
    // DATA BASE REQUEST
    //
    const foundOffer = await Offer.findById(offerId).populate({
      path: "owner",
      select: "account.username account.avatar",
    });
    if (!foundOffer) {
      return res.status(400).json({ message: "This offer id does not exist" });
    }
    return res
      .status(200)
      .json({ offer: await Offer.findById(offerId).populate("owner") });
    //
    // API REQUEST
    //
    // const url = "https://lereacteur-vinted-api.herokuapp.com/offers";

    // const response = await axios.get(url);
    // const offers = response.data.offers;
    // const indexFound = offers.findIndex((offer) => offer._id === offerId);
    // return res.status(200).json(offers[indexFound]);
    //
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

//UPDATE
//Update by ID
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
    //Publication: all fields filled
    //Update: Only changed values in req.body
    if (title) {
      foundOffer.product_name = title;
    }
    if (description) {
      foundOffer.product_description = description;
    }
    if (price) {
      foundOffer.product_price = price;
    }
    const details = foundOffer.product_details;
    for (let i = 0; i < details.length; i++) {
      if (details[i].ÉTAT) {
        if (condition) {
          details[i].ÉTAT = condition;
        }
      }
      if (details[i].MARQUE) {
        if (brand) {
          details[i].MARQUE = brand;
        }
      }
      if (details[i].TAILLE) {
        if (size) {
          details[i].TAILLE = size;
        }
      }
      if (details[i].COULEUR) {
        if (color) {
          details[i].COULEUR = color;
        }
      }
      if (details[i].EMPLACEMENT) {
        if (city) {
          details[i].EMPLACEMENT = city;
        }
      }
    }

    //Update files: only main picture
    if (req.files) {
      //Destroy previous picture
      await cloudinary.uploader.destroy(foundOffer.product_image.public_id);
      //Upload
      const picture = req.files.picture;
      const convertedFile = convertFile(picture);
      const sentFile = await cloudinary.uploader.upload(convertedFile, {
        folder: `vinted/offers/${foundOffer.id}`,
        public_id: "preview",
      });
      //Modify offer
      foundOffer.product_image = sentFile;
      foundOffer.product_pictures[0] = sentFile;
    }

    //Save in DB
    foundOffer.markModified("product_details");
    await foundOffer.save();

    //Response
    return res.status(201).json({
      message: "Offer successfully updated",
      offer: foundOffer,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
    // return res.status(500).json({ message: error.message });
  }
});

//DELETE
//Delete by id
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
    //Remove file(s) from cloudinary folder
    //In case of no picture attached (for axios test)
    if (foundOffer.product_pictures.length !== 0) {
      for (let i = 0; i < foundOffer.product_pictures.length; i++) {
        const public_id = foundOffer.product_pictures[i].public_id;
        await cloudinary.uploader.destroy(public_id);
      }
      //Remove folder from cloudinary
      await cloudinary.api.delete_folder(`vinted/offers/${offerId}`);
    }

    //Delete offer from DB
    await Offer.findByIdAndDelete(offerId);

    //Response
    return res.status(200).json({ message: "Offer successfully removed" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
