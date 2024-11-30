const User = require("../model/user");
const bcrypt = require("bcrypt");
const Product = require("../model/products");
const Address = require("../model/address")
const Cart    = require("../model/cart")

exports.getCart = async (req, res) => {
    console.log("it is reached in getCart");
    try {
      const userId = req.session.passport.user;
   console.log(userId);
      const cart = await Cart.findOne({ userId }).populate("products.productId");
      console.log(cart);
      

     
      if (!cart) {
        return res.render("users/cart", {
            products: [],
            totalItemsPrice: 0,
            grandTotal: 0,

        });
      }
  
      await cart.calculateTotals();
      
  
      const products = cart.products.map((item) => ({
        id: item.productId._id,
        name: item.productId.name,
        description: item.productId.description,
        size: item.size,
        imageUrl: item.productId.images[0],
        price: item.price,
        quantity: item.quantity,
        
      }));

      
  
      const totalItemsPrice = cart.totalPrice;
      const grandTotal = totalItemsPrice ;
  
  
      res.render("users/cart", {
        products,
        totalItemsPrice,
        grandTotal,
        
      });
    } catch (error) {
      console.error("error rendering cart page:", error);
      res.status(500).send("An error occurred while rendering your cart.");
    }
  };
  

  exports.addToCart = async (req, res) => {
    console.log("reached in add to cart");
    try {
      const userId = req.session.passport.user;
  
      const { productId, size, quantity } = req.body;
  
      if (!productId || !size || !quantity) {
        return res.status(400).json({ message: 'Product ID, size, and quantity are required' });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
  
      const sizeDetails = product.sizes.find((s) => s.size === size);
      if (!sizeDetails) {
        return res.status(404).json({ message: `Size ${size} not found for this product` });
      }
  
      if (quantity > sizeDetails.stock) {
        console.log("it is checking the quantity > stock");
        return res.status(400).json({
          message: `Only ${sizeDetails.stock} items left for size ${size}`,
        });
      }
  
      let cart = await Cart.findOne({ userId }).populate('products.productId');
  
      if (!cart) {
        cart = new Cart({ userId, products: [] });
      }
  
      const existingItemIndex = cart.products.findIndex(
        (item) => item.productId._id.toString() === productId && item.size === size
      );
  
      if (existingItemIndex !== -1) {
        // Calculate the total quantity if more is added
        const totalQuantity = cart.products[existingItemIndex].quantity + quantity;
  
        // Check if the total exceeds the maximum allowed quantity (5)
        if (totalQuantity > 5) {
          return res.status(400).json({
            message: `You can only add up to 5 items of size ${size} for this product.`,
          });
        }
  
        // Update the quantity if within the limit
        cart.products[existingItemIndex].quantity = totalQuantity;
      } else {
        // Check if adding the new item exceeds the maximum limit
        if (quantity > 5) {
          return res.status(400).json({
            message: `You can only add up to 5 items of size ${size} for this product.`,
          });
        }
  
        // Add the new item to the cart
        cart.products.push({
          productId,
          size,
          quantity,
          price: product.price,
        });
      }
  
      // Deduct stock from the product
      sizeDetails.stock -= quantity;
      await product.save();
  
      // Save the updated cart
      await cart.save();
  
      res.status(200).json({ message: 'Product added to cart successfully', cart });
    } catch (error) {
      console.error('error adding product to cart:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  

  exports.quantityUpdate = async (req, res) => {
    const userId = req.session.passport.user;
    const productId = req.params.id;
    const { quantity, size } = req.body;
  
    try {
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ success: false, message: "Cart not found" });
      }
  
      const productIndex = cart.products.findIndex(
        (item) => item.productId.toString() === productId && item.size === size
      );
  
      if (productIndex === -1) {
        return res.status(404).json({ success: false, message: "Product not found in cart" });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
  
      const sizeDetails = product.sizes.find((s) => s.size === size);
      if (!sizeDetails) {
        return res.status(404).json({ success: false, message: `Size ${size} not found for this product` });
      }
  
      const newQuantity = parseInt(quantity, 10);
  
      if (isNaN(newQuantity) || newQuantity <= 0) {
        return res.status(400).json({ success: false, message: "Quantity must be a positive number" });
      }
  
      
      if (newQuantity > 5) {
        return res.status(400).json({
          success: false,
          message: `You can only add up to 5 items of size ${size} for this product`,
        });
      }
  

      const currentCartQuantity = cart.products[productIndex].quantity;
      const quantityChange = newQuantity - currentCartQuantity;
  
      if (quantityChange > 0 && quantityChange > sizeDetails.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${sizeDetails.stock} items left for size ${size}`,
        });
      }
  
      cart.products[productIndex].quantity = newQuantity;
      sizeDetails.stock -= quantityChange; 
  
      await product.save(); 
      await cart.save(); 
  
      res.status(200).json({ success: true, message: "Cart updated successfully", cart });
    } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
  
  


  exports.removeProduct =  async (req,res)=>{
  console.log("it is reaching in remove product");
    try {
        const productId = req.params.id;
        const size = req.body.size
        const userId = req.session.passport.user

        const cart = await Cart.findOne({userId})

        const productIndex = cart.products.findIndex(item=>{
           return item.productId.toString() === productId &&item.size ===size
        })

        cart.products.splice(productIndex,1)

        await cart.calculateTotals()
        await cart.save()
        res.status(200).json({message:"succesfully removed the product"})
        
        
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"error occured in deleting the product"})
    }
  }


