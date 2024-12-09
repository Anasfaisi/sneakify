const User = require("../model/user");
const bcrypt = require("bcrypt");
const Product = require("../model/products");
const Address = require("../model/address");
const Cart = require("../model/cart");
const Order = require("../model/order");
const { v4: uuidv4 } = require("uuid");

exports.getCheckout = async (req, res) => {
  console.log("Reached in getCheckout");

  try {
    const userId = req.session.passport.user;

    const cart = await Cart.findOne({ userId }).populate("products.productId");
    if (!cart) {
      return res.redirect("/users/cart");
    }
    if (!cart) {
      return res.render("users/checkout", {
        products: [],
        totalItemsPrice: 0,
        shippingCharge: 0,
        grandTotal: 0,
        addresses: [],
      });
    }

    const addresses = await Address.find({ userId });
    console.log(addresses);

    // Map products from the cart
    const products = cart.products.map((item) => ({
      id: item.productId._id,
      name: item.productId.name,
      description: item.productId.description,
      size: item.size || "Default", // Add size logic if applicable
      imageUrl: item.productId.images[0], // Product image
      price: item.price,
      quantity: item.quantity,
      total: item.quantity * item.price,
    }));

    // Calculate totals
    const totalItemsPrice = cart.totalPrice;
    const shippingCharge = totalItemsPrice > 3000 ? 0 : 300;
    const grandTotal = totalItemsPrice + shippingCharge;

    // Render the checkout page
    res.render("users/checkout", {
      products,
      totalItemsPrice,
      grandTotal,
      shippingCharge,
      addresses,
    });
  } catch (error) {
    console.error("Error rendering checkout page:", error);
    res
      .status(500)
      .send("An error occurred while rendering the checkout page.");
  }
};

//===============================================================================

exports.placeOrder = async (req, res) => {
  console.log("reached in place order");
  try {
    const { addressDetails, paymentMethod } = req.body;
    console.log(addressDetails, paymentMethod);

    if (!addressDetails || !paymentMethod) {
      return res
        .status(400)
        .json({ message: "Missing customer details or payment method." });
    }

    const userId = req.session.passport.user;
    const cart = await Cart.findOne({ userId }).populate("products.productId");

    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: "Your cart is empty." });
    }

    let totalAmount = 0;
    const products = [];
    console.log(cart,"ahaaau gaie");
    // Step 1: Check stock and map products
    for (const item of cart.products) {
      const product = await Product.findOne({ _id: item.productId });
      const sizeStock = product.sizes.find((size) => size.size === item.size);
      if (!sizeStock || sizeStock.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name} in size ${item.size}. Only ${sizeStock ? sizeStock.stock : 0} available.`,
        });
      }
      console.log("jhgfghjhgfghjhg");

      // Add the item to the products array after checking the stock
      const total = item.quantity * item.price;
      totalAmount += total;
      products.push({
        productId: item.productId._id,
        name: item.productId.name,
        price: item.productId.price,
        size: item.size,
        quantity: item.quantity,
        total: total,
      });

      // Step 2: Decrease stock after checking
      await Product.findOneAndUpdate(
        { _id: item.productId, "sizes.size": item.size }, // Match product and size
        { $inc: { "sizes.$.stock": -item.quantity } }, // Decrease stock
        { new: true } // Return the updated document
      );
    }

    const shippingCharge = totalAmount > 500 ? 0 : 50;
    const grandTotal = totalAmount + shippingCharge;

    const orderId = `ORD-${uuidv4().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    console.log(orderId);

    const newOrder = new Order({
      orderId,
      userId,
      addressDetails,
      paymentMethod,
      products,
      totalAmount,
      shippingCharge,
      grandTotal,
      status: "pending",
      paymentStatus: "pending",
    });

    await newOrder.save();
    await Cart.deleteOne({ userId });

    res
      .status(200)
      .json({ message: "Order placed successfully!", orderId: newOrder._id,displayOrderId:newOrder.orderId });
  } catch (error) {
    console.error("Error placing order:", error);
    res
      .status(500)
      .json({ message: "An error occurred while placing the order." });
  }
};


exports.orderPlaced = async (req, res) => {
  console.log("reached in thankyou page");
  const { orderId } = req.query;
  console.log(orderId);

  try {
    const order = await Order.findById(orderId);
    console.log(order);

    if (!order) {
      return res.status(404).send("Order not found.");
    }

    res.render("users/orderPlaced", { order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send("An error occurred.");
  }
};