const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
    },
    discountValue: {
      type: Number,
  
      min: 0,
    },
    
    minimumPurchase: {
      type: Number,
      default: 0, // Minimum cart value to apply the coupon
    },
    maximumDiscount: {
      type: Number, // Applicable only for percentage discounts
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default :5, // Max times this coupon can be used
    },
    usageCount: {
      type: Number,
      default: 0, // Tracks how many times the coupon has been used
    },
    usersUsed: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Tracks users who have already used this coupon
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
