const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", 
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", 
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1, 
      },
      price: {
        type: Number,
        required: true,
      },
      size:{
        type:String,
        required:true,
      }
    },
  ],
  totalItems: {
    type: Number,
    default: 0,
  },
  totalPrice: {
    type: Number,
    default: 0,
  },
  gst: {
    type: Number,
    default: 0,  
  },
  discount: {
    type: Number,
    default: 0,
  },
  couponCode: {
    type: String, 
    default: null,
  },
  couponValid: {
    type: Boolean,
    default: false, 
  },
  grandTotal: {
    type: Number,
    default: 0,
  }

});


cartSchema.methods.calculateTotals = function (coupon) {
  // Calculate total items and price
  this.totalItems = this.products.reduce((sum, item) => sum + item.quantity, 0);
  this.totalPrice = this.products.reduce((sum, item) => sum + item.quantity * item.price, 0);

  // Apply GST
  this.gst = this.totalPrice * 0.18; // Assuming GST is 18%

  // Apply coupon discount if available
  if (coupon && this.totalPrice >= coupon.minimumPurchase) {
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (this.totalPrice * coupon.maximumDiscount) / 100;
      
    } else if (coupon.discountType === 'fixed') {
      discount = coupon.discountValue;
    }

    // Set the discount on cart
    this.discount = discount;
    this.couponCode = coupon.code;
    this.couponValid = true; // Mark coupon as valid
  } else {
    this.couponValid = false; // Coupon is not valid
    this.discount = 0;
    this.couponCode = null;
  }

  // Calculate grand total (price + GST - discount)
  this.grandTotal = this.totalPrice + this.gst - this.discount;

  return this.save();
};

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;