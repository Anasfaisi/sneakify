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
});

cartSchema.methods.calculateTotals = function () {
  this.totalItems = this.products.reduce((sum, item) => sum + item.quantity, 0);
  this.totalPrice = this.products.reduce((sum, item) => sum + item.quantity * item.price, 0);
  return this.save();
};

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
