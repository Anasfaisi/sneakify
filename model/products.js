const mongoose = require("mongoose");

const sizeStockSchema = new mongoose.Schema({
  size: { type: String, required: true },

  stock: { type: Number, required: true, min: 0 },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    category: {
      type: String,
      required: true,
    },
    categoryId:{
      type: mongoose.Schema.Types.ObjectId,
      ref:"Category",
      required:true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    sizes: { type: [sizeStockSchema], required: true },
    popularity: {
      type: Number,
      default: 0, // Incremented each time the product is viewed
    },
    featured: {
      type: Boolean,
      default: false, // Manually mark products as featured
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer", // Link to Offer model
    },
    offerDiscount:{
      type:Number,
      default:0,
    },
    categoryDiscount:{
      type:Number,
      default:0
    },
    finalDiscount :{
      type:Number,
      default:0
    }
  },

  {
    timestamps: true,
  }
);


module.exports = mongoose.model("Product", productSchema);
