const mongoose = require('mongoose');

const orderProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, 
  name: { type: String, required: true }, 
  price: { type: Number, required: true }, 
  size: { type: String, },  
  quantity: { type: Number, required: true, min: 1 }, 
  totalPrice: { type: Number, required: true }, 
  discountedPrice:{type:Number},

});


const orderSchema = new mongoose.Schema(
{
  orderId: { type: String, unique: true, required: true }, 
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', // Reference to User model
      required: true 
    },
  
    addressDetails: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true },
      phone: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['cashOnDelivery', 'creditCard', 'debitCard', 'netBanking','razorPay'], 
      required: true,
    },
    products: [orderProductSchema], 
    totalAmount: { type: Number, required: true }, 
    shippingCharge: { type: Number, default: 0 }, 
    grandTotal: { type: Number, required: true }, 
    totalDiscount:{type:Number,default :0},
    gst:{type:Number},
    couponDiscount:{type:Number},
    status: {
      type: String,
      enum: ['pending', 'shipped', 'delivered', 'cancelled','cancel_requested',"returned","return_requested","incomplete"], 
      default: 'pending',
    },
    orderDate: { type: Date, default: Date.now  }, 
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed','failed'],
      default: 'pending', 
    },
    cancelRequest: { type: Boolean, default: false },
    razorpayOrderId:{type:String},
  cancelReason: { type: String }, 
  couponDiscount:{type:Number},
  offerDiscount:{type:Number}

  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
