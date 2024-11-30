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
    isActive: {
      type: Boolean,
      default: true,
    },
    sizes: { type: [sizeStockSchema], required: true },

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
