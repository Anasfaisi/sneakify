const User = require("../model/user");
const Product = require("../model/products");
const Wishlist = require("../model/wishlist");
const products = require("../model/products");

exports.getWishList = async (req, res) => {
  console.log("it is reached in get wishlist");
  try {
    const userId = req.session.passport?.user;
    const user = await User.findById(userId);
    const wishlist = await Wishlist.findOne({ userId: userId }).populate(
      "products"
    );

    if (wishlist == null) {
      return res.render("users/wishlist", { user, products: [] });
    }
    const products = wishlist.products;

    res.render("users/wishlist", {
      user,
      products,
    });
  } catch (error) {
    console.log(error, "error occured in getting wishlist");
    return res.status(500).json({ message: "something went wrong" });
  }
};

exports.addToWishlist = async (req, res) => {
  console.log("Reached addToWishlist");

  try {
    const userId = req.session.passport.user;
    const productId = req.body.productId;

    // Validate the user and product
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find the user's wishlist
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      // Create a new wishlist if it doesn't exist
      wishlist = new Wishlist({
        userId,
        products: [],
      });
    }

    console.log(wishlist, "new wishlist");

    // Check if the product already exists in the wishlist
    const existingProduct = wishlist.products.find(
      (item) => item._id.toString() === productId
    );
    if (existingProduct) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    // Add the product to the wishlist

    wishlist.products.push(productId);
    await wishlist.save();

    return res.status(200).json({ message: "Product added to wishlist" });
  } catch (error) {
    console.error("eror occurred in adding to wishlist:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.removeItem = async (req, res) => {
  console.log("it is reached in remove item");
  try {
    const productId = req.body.productId;
    const userId = req.session.passport.user;
    const wishlist = await Wishlist.findOne({ userId });
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(500).json({ message: "product not found" });
      }

    wishlist.products.forEach((item, index) => {
      if (item._id == productId) {
        console.log(wishlist.products, "products");
        wishlist.products.splice(index, 1);
      }
    });
    await wishlist.save();
    res.status(200).json({message:"product removed from wishlist"});
   
  } catch (error) {
    console.log(error, "error in removing product");
    res.status(500).json({ message: "something went wrong" });
  }
};
