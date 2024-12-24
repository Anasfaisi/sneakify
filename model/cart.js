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
      },
      finalDiscount:{
        type:Number,
        default:0,
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
  totalDiscount: {
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


const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;