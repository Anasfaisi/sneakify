const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema(
  {
    productName: { type: String },
    categoryName: { type: String },
    offerName: { type: String, required: true },
    percentage: { type: Number, required: true, min: 0, max: 50 },
    maximumDiscount: { type: Number, default: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    offerType: { type: String, required: true, enum: ["product", "category"] },
    applicableCategories: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    applicableProducts: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", OfferSchema);
