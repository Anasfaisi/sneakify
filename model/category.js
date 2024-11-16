
const mongoose = require('mongoose');

// Schema for Category
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3
    },
    isActive: {
        type: Boolean,
        default: true
    },
    categoryId: {
        type: String,
        unique: true,
     }
}, {
    timestamps: true
});



const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
