const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  cancelReason:{type:String},
  isRead: { type: Boolean, default: false },
  orderDetails: { // New field for additional order information
    orderId: { type: String },
    products: [
      {
        name: { type: String },
        quantity: { type: Number },
      },
    ],
  },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
