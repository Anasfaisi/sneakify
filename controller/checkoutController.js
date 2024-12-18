const User = require("../model/user");
const bcrypt = require("bcrypt");
const Product = require("../model/products");
const Address = require("../model/address");
const Cart = require("../model/cart");
const Order = require("../model/order");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const Razorpay = require("razorpay");
const crypto = require("crypto");


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
  

    // Map products from the cart
    const products = cart.products.map((item) => ({
      id: item.productId._id,
      name: item.productId.name,
      description: item.productId.description,
      size: item.size || "Default",
      imageUrl: item.productId.images[0], 
      price: item.price,
      quantity: item.quantity,
      total: item.quantity * item.price,
    }));

    // Calculate totals
    const totalItemsPrice = cart.grandTotal;
    const shippingCharge = totalItemsPrice > 3000 ? 0 : 100;
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
    // Step 1: Check stock and map products
    for (const item of cart.products) {
      const product = await Product.findOne({ _id: item.productId });
      const sizeStock = product.sizes.find((size) => size.size === item.size);
      if (!sizeStock || sizeStock.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name} in size ${
            item.size
          }. Only ${sizeStock ? sizeStock.stock : 0} available.`,
        });
      }

      // Add the item to the products array after checking the stock

      console.log(item.quantity)
      console.log(item.price);
      console.log(cart.couponDiscount);
      console.log(cart.gst);
      console.log(cart.discount?cart.discount:0);
      
      const total = (item.quantity * (cart.couponDiscount))+(cart.gst)-(cart.discount?cart.discount:0) ;
      totalAmount += total;
      console.log(totalAmount)
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

    const shippingCharge = totalAmount > 3000 ? 0 : 100;
    const grandTotal = totalAmount + shippingCharge;
    // const totalDiscount = (cart.couponDiscount)+(cart.discount??0)
    // console.log(cart.couponDiscount)
    // console.log(cart.couponDiscount??0)
    console.log(grandTotal,"---grandTotal")

    const orderId = `ORD-${uuidv4()
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase()}`;
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
      // totalDiscount
    });

    await newOrder.save();
    await Cart.deleteOne({ userId });

    res
      .status(200)
      .json({
        message: "Order placed successfully!",
        orderId: newOrder._id,
        displayOrderId: newOrder.orderId,
      });
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
   const cart = await Cart.findOne({userId:req.session.passport.user})
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    res.render("users/orderPlaced", { order,cart });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).send("An error occurred.");
  }
};

//==============================================================



const razorpay = new Razorpay({
    key_id: process.env.RAZOR_PAY_ID,
    key_secret: process.env.RAZOR_PAY_KEY,
});

// Endpoint to create Razorpay order
exports.createOrder = async (req, res) => {
  console.log("it is reaching in razor pay create order")
    const { amount, currency = "INR" } = req.body;
    console.log(amount,currency);
    try {
        const order = await razorpay.orders.create({
            amount: amount * 100, 
            currency,
            receipt: `receipt_${new Date().getTime()}`,
        });
        console.log(order,"order")
        res.status(200).json({ success: true, order,RAZOR_PAY_ID:process.env.RAZOR_PAY_ID });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


   
