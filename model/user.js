// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'Please enter your First name'],
    },
    lastName: {
        type: String,
        required: [true, 'Please enter your Last name'],
    },
    email: {
        type: String,
        required: [true, 'Please enter your email'],
        unique: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true,
        minLength: [6, 'Password must be at least 6 characters'],
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true
    },
    resetPasswordExpiry: { 
        type: Date
     },
    referralCode: {
        type: String,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
});


module.exports = mongoose.model('User', userSchema);