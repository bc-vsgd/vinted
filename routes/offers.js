const express = require("express");
const router = express.Router();

const Offer = require("../models/Offer");

//READ
//Get offers with filters
router.get("/offers", async (req, res) => {
  try {
    const { title, priceMin, priceMax, sort, page } = req.query;
    //Title, priceMax, priceMin
    const filter = {};
    if (title) {
      // filter.product_name = title;
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
    const limit = 10;
    let skip = 0;
    if (page) {
      skip = (Number(page) - 1) * limit;
    }
    //Filter offers
    const offers = await Offer.find(filter)
      .sort(sortFilter)
      .limit(limit)
      .skip(skip);
    //Response
    if (offers.length === 0) {
      return res.status(200).json({ message: "No offer for the moment ..." });
    }
    return res.status(200).json({ count: offers.length, offers });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
