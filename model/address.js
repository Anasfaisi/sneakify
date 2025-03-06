const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  
    required: true
  },
  firstName: {
    type: String,
    required: [true, 'Please enter your first name'],
  },
  lastName: {
    type: String,
    required: [true, 'Please enter your last name'],
  },
  address: {
    type: String,
    required: [true, 'Please enter the address'],
  },
  place: {
    type: String,
    required: [true, 'Please enter the place'],
  },
  city: {
    type: String,
    required: [true, 'Please enter the city'],
  },
  district: {
    type: String,
    required: [true, 'Please enter the district'],
  },
  pincode: {
    type: String,
    required: [true, 'Please enter the pincode'],
  },
  state: {
    type: String,
    required: [true, 'Please enter the state'],
  },
  country: {
    type: String,
    required: [true, 'Please enter the country'],
  },
  phone: {
    type: String,
    required: [true, 'Please enter the phone number'], },
 
},{
    timestamps: true
}
);

const Address = mongoose.model('Address', addressSchema);
module.exports = Address
