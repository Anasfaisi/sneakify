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
  couponDiscount:{
    type:Number,
    default:0,
  },
    grandTotal: {
    type: Number,
    default: 0,
  }

});


cartSchema.methods.calculateTotals = function (coupon) {
  console.log("it is reaching in calculate totals");
  // Calculate total items and price
  this.totalItems = this.products.reduce((sum, item) => sum + item.quantity, 0);
 this.totalPrice = this.products.reduce((sum, item) => {
  
    const priceToUse = this.couponDiscount || item.price; // Use discountedPrice if available
    return sum + item.quantity * priceToUse;
  }, 0);
  console.log(this.totalPrice)
  this.gst = this.totalPrice * 0.05; 

  
  if (coupon && this.totalPrice >= coupon.minimumPurchase) {
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (this.totalPrice * coupon.maximumDiscount) / 100;
      
    } else if (coupon.discountType === 'fixed') {
      discount = coupon.discountValue;
    }

    this.discount = discount;
    this.couponCode = coupon.code;
    this.couponValid = true; 
  } else {
    this.couponValid = false; 
    this.discount = 0;
    this.couponCode = null;
  }

  this.grandTotal = this.totalPrice + this.gst - this.discount;

  return this.save();
};

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;