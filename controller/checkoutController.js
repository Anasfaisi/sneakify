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
      discountedPrice: item.finalDiscount,
      quantity: item.quantity,
      total: item.quantity * item.price,
    
      finalDiscount:item.productId.finalDiscount
    }));
  

    // Calculate totals

 
    const shippingCharge = cart.totalPrice > 3000 ? 0 : 100;
    const grandTotal = cart.totalPrice + shippingCharge+cart.gst-cart.couponDiscount;
    cart.grandTotal= grandTotal;
    await cart.save()
    // Render the checkout page
    res.render("users/checkout", {
      products,
      grandTotal,
      shippingCharge,
      addresses,
      cart
    });
  } catch (error) {
    console.error("Error rendering checkout page:", error);
    res
      .status(500)
      .send("An error occurred while rendering the checkout page.");
  }
};

//===============================================================================
const razorpay = new Razorpay({
  key_id: process.env.RAZOR_PAY_ID,
  key_secret: process.env.RAZOR_PAY_KEY,
});
exports.placeOrder = async (req, res) => {
  console.log("it is reaching in create order ");
  try {
    const { addressDetails, paymentMethod } = req.body;
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

    const products = [];
    for (const item of cart.products) {
      const product = await Product.findOne({ _id: item.productId });
      const sizeStock = product.sizes.find((size) => size.size === item.size);

      if (!sizeStock || sizeStock.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name} in size ${item.size}.`,
        });
      }


      products.push({
        productId: item.productId._id,
        name: item.productId.name,
        price: item.productId.price,
        size: item.size,
        quantity: item.quantity,
        image: item.productId.images[0],
        totalPrice: item.quantity * item.productId.price,
        discountedPrice: item.productId.finalDiscount,
      });

      await Product.findOneAndUpdate(
        { _id: item.productId, "sizes.size": item.size },
        { $inc: { "sizes.$.stock": -item.quantity } },
        { new: true }
      );
    }

    if (paymentMethod === "cashOnDelivery") {
       if(cart.totalPrice > 1000){
        return res.status(500).json({message:"could not proceed cash on delivery on above 1000 rs"})
       }
    }
    const shippingCharge = cart.totalPrice > 3000 ? 0 : 100;
    const orderId = `ORD-${uuidv4().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    console.log("5");


    const newOrder = new Order({
      orderId,
      userId,
      addressDetails,
      paymentMethod,
      products,
      totalAmount: cart.totalPrice,
      totalDiscount: cart.totalDiscount,
      shippingCharge,
      grandTotal: cart.grandTotal,
      gst: cart.gst,
      couponDiscount: cart.couponDiscount,
      status: "pending",
      paymentStatus: "pending",
    });
    console.log(newOrder);

   
    if (paymentMethod === "razorPay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: cart.grandTotal * 100, // Convert to paise
        currency: "INR",
        receipt: newOrder._id,
      });

      newOrder.razorpayOrderId = razorpayOrder.id;
      console.log(razorpayOrder.id)
      await newOrder.save();
      await Cart.deleteOne({userId})
      return res.status(200).json({
        message: "Order placed successfully!",
        order: newOrder,
        displayOrderId:orderId,
        razorpayOrder: razorpayOrder,
        RAZOR_PAY_ID: process.env.RAZOR_PAY_ID, // Pass Razorpay key to frontend
      });
    }
    await newOrder.save();
    await Cart.deleteOne({ userId });
    res.status(200).json({
      message: "Order placed successfully!",
      orderId: newOrder._id,
      displayOrderId:orderId,

    });
  } catch (error) {
    console.log("error placing order:", error);
    res.status(500).json({ message: "An error occurred while placing the order." });
  }
};









exports.verifyPayment = async (req, res) => {
  const { orderId,razorpayOrderId, razorpayPaymentId, signature } = req.body;
  console.log(req.body)
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZOR_PAY_KEY)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    console.log(generatedSignature);
    console.log(signature);
    console.log(generatedSignature === signature);
    if (generatedSignature === signature) {
      order.paymentStatus = "completed";
      order.status = "pending";
      await order.save();

      return res.status(200).json({ message: "Payment verified and order confirmed.",order });
    } else {
      order.paymentStatus = "failed";
      order.status = "pending"; // Allow retry
      await order.save();

      return res.status(400).json({ message: "Payment verification failed.",order });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "An error occurred while verifying payment." });
  }
};



exports.orderPlaced = async (req, res) => {
  console.log("reached in orderPlaced page");
  const { orderId } = req.query;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    res.render("users/orderPlaced", {
      order,
      retryPayment: order.paymentStatus === "failed", // Show retry option
    });
  } catch (error) {
    console.error("error fetching order:", error);
    res.status(500).send("An error occurred.");
  }
};


exports.handleFailure = async (req, res) => {
  console.log("it is reached in handle failures")
  const { orderId, paymentStatus, status } = req.body;

  if (!orderId || !paymentStatus || !status) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update order status and payment status
    order.paymentStatus = paymentStatus;
    order.status = status;

    await order.save();

    res.status(200).json({ success: true, message: "you can retry this payment of on myorders in profile ", orderId: order._id });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "An error occurred while updating the order" });
  }
};


exports.retryPayment = async (req, res) => {
  console.log("it is reaching in retry payment")
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required." });
  }

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Create a new Razorpay order for retry
    const razorpayOrder = await razorpay.orders.create({
      amount: order.grandTotal * 100, // Convert to paise
      currency: "INR",
      receipt: order._id.toString(),
    });

    // Return the new Razorpay order details along with order info
    res.status(200).json({
      RAZOR_PAY_ID: process.env.RAZOR_PAY_ID,
      razorpayOrder,
      order: {
        _id: order._id,
        amount: order.grandTotal,
        currency: "INR",
        customerName: order.addressDetails.firstName + " " + order.addressDetails.lastName,
        customerPhone: order.addressDetails.phone,
      },
    });
  } catch (error) {
    console.error("Error creating Razorpay order for retry:", error);
    res.status(500).json({ message: "An error occurred while creating the payment order." });
  }
};//we need to pass org order id to the front end think that logic 