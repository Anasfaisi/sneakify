const User = require("../model/user");
const bcrypt = require("bcrypt");
const Product = require("../model/products");
const Address = require("../model/address")
const Cart    = require("../model/cart");
const Coupon = require("../model/coupon")

exports.getCart = async (req, res) => {
  console.log("it is reached in getCart");
  try {
    const userId = req.session.passport.user;

    const cart = await Cart.findOne({ userId }).populate("products.productId");
    console.log(cart);

    const activeCoupon = await Coupon.find({ isActive: true });
    if (!activeCoupon) {
      return res.status(404).json({ message: 'coupon not found' });
    }


    if (!cart) {
      return res.render("users/cart", {
        products: [],
        activeCoupon: [],
        totalItemsPrice: 0,
        grandTotal: 0,
        gst: 0,
        discount: 0,
        couponDiscount:0,
      });
    }


    const products = cart.products.map((item) => ({
      id: item.productId._id,
      name: item.productId.name,
      description: item.productId.description,
      size: item.size,
      imageUrl: item.productId.images[0],
      price: item.price,
      finalDiscount:item.productId.finalDiscount,
      quantity: item.quantity,
    }));
       

    const { totalItemsPrice, totalDiscount } = cart.products.reduce(
      (acc, item) => {
        const originalPrice = item.productId.price;
        const finalPrice = item.productId.finalDiscount || originalPrice;
        const quantity = item.quantity;
    
        const itemTotalPrice = finalPrice * quantity;
        const itemDiscount = (originalPrice - finalPrice) * quantity;
    
        acc.totalItemsPrice += itemTotalPrice;
        acc.totalDiscount += itemDiscount;
    
        return acc;
      },
      { totalItemsPrice: 0, totalDiscount: 0 }
    );


    const gst = (totalItemsPrice * 5) / 100;

    const grandTotal = totalItemsPrice + gst 
        
    cart.totalPrice = totalItemsPrice;
    cart.totalDiscount= totalDiscount;
    cart.grandTotal = grandTotal
    cart.gst = gst;


    await cart.save()
    res.render("users/cart", {
      products,
      cart,
      activeCoupon,
    });
  } catch (error) {
    console.error("error rendering cart page:", error);
    res.status(500).json({ message: "An error occurred while rendering your cart." });
  }
};

  

  exports.addToCart = async (req, res) => {
    console.log("reached in add to cart");
    try {
      const userId = req.session.passport?.user;
      if(!userId){return res.status(404).json({message:"user not found please signup or signin"})}
  
      const { productId, size, quantity } = req.body;
      if (!productId || !size || !quantity) {
        return res.status(400).json({ message: 'Product ID, size, and quantity are required' });
      }
  
      const product = await Product.findById(productId)
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
  
      const sizeDetails = product.sizes.find((s) => s.size === size);
      console.log(sizeDetails);
      if (!sizeDetails) {
        return res.status(404).json({ message: `Size ${size} not found for this product` });
      }
      console.log(quantity>sizeDetails.stock);
      if (quantity > sizeDetails.stock) {
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
        const totalQuantity = cart.products[existingItemIndex].quantity + quantity;
  
        if (totalQuantity > 5) {
          return res.status(400).json({
            message: `You can only add up to 5 items of size ${size} for this product.`,
          });
        }
        if(totalQuantity>sizeDetails.stock){
          return res.status(500).json({ message: `Only ${sizeDetails.stock} items left for size ${size}`})
        }
  
        cart.products[existingItemIndex].quantity = totalQuantity;
      } else {
        if (quantity > 5) {
          return res.status(400).json({
            message: `You can only add up to 5 items of size ${size} for this product.`,
          });
        }
      
        cart.products.push({
          productId,
          size,
          quantity,
          price: product.price,
          finalDiscount:product.finalDiscount||0,
        });
      }
  
      await product.save();
  
      await cart.save();
  
      res.status(200).json({ message: 'Product added to cart successfully', cart });
    } catch (error) {
      console.error('error adding product to cart:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  

  exports.quantityUpdate = async (req, res) => {
    
    `reached in quantity update`
    const userId = req.session.passport?.user;
    const productId = req.params.id;
    const { quantity, size } = req.body;
    
  
    try {
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ success: false, message: "Cart not found" });
      }
  
      const productIndex = cart.products.findIndex(
        (item) => item.productId.toString() === productId && item.size === size);
  
      if (productIndex === -1) {
        return res.status(404).json({ success: false, message: "Product not found in cart" });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
  
      const sizeDetails = product.sizes.find((s) => s.size === size);
      console.log(sizeDetails);
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
     
  
      if (newQuantity > sizeDetails.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${sizeDetails.stock} items left for size ${size}`,
        });
      }
  
      cart.products[productIndex].quantity = newQuantity;
  
      await product.save(); 
      await cart.save(); 
  
      res.status(200).json({ success: true, message: "Cart updated successfully", cart });
    } catch (error) {
      console.log("not a success");
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

      
        await cart.save()
        res.status(200).json({message:"succesfully removed the product"})
        
        
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"error occured in deleting the product"})
    }
  }



  // /coupons
 exports.applyCoupon = async (req, res) => {
  console.log("it reached in apply coupon");
  try {
    const { couponCode } = req.body;
    console.log(couponCode);
    const userId = req.session.passport.user;

    const cart = await Cart.findOne({ userId }).populate("products.productId");
    if (!cart) {
      return res.status(400).json({ message: "Cart not found." });
    }

    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    console.log(coupon);
    
    if (!coupon) {
      return res.status(400).json({ message: "Invalid or inactive coupon." });
    }

    if (cart.totalPrice < coupon.minimumPurchase) {
      return res.status(400).json({
        message: `Minimum cart value should be ₹${coupon.minimumPurchase}.`,
      });
    }

    if (coupon.expiryDate < Date.now()) {
      return res.status(400).json({ message: "Coupon has expired." });
    }

    // if (coupon.usageLimit <= coupon.usageCount) {
    //   return res.status(400).json({ message: "Coupon usage limit exceeded." });
    // }

    // if (coupon.usersUsed.includes(userId)) {
    //   return res.status(400).json({ message: "Coupon already used by this user." });
    // }

    // Calculate the discount
    let couponDiscount = 0;
    if (coupon.discountType === "percentage") {
      console.log(cart.totalPrice)
      console.log(coupon.discountValue);
      console.log(coupon.maximumDiscount);
      couponDiscount = (cart.totalPrice * coupon.maximumDiscount) / 100;

      console.log(couponDiscount);
    } else if (coupon.discountType === "fixed") {
      couponDiscount = coupon.discountValue;
    }

    couponDiscount = Math.min(couponDiscount, cart.totalPrice);

    cart.couponDiscount = couponDiscount;
    cart.totalDiscount = (cart.totalDiscount || 0) + couponDiscount; 
    cart.grandTotal = cart.totalPrice + cart.gst - cart.couponDiscount; // Update grand total

    // Update the coupon usage
    coupon.usageCount += 1;
    coupon.usersUsed.push(userId);

    await cart.save();
    await coupon.save();

    console.log("everything working properly");
    return res.status(200).json({
      message: "Coupon applied successfully.",
      couponDiscount,
      totalDiscount: cart.totalDiscount,
      grandTotal: cart.grandTotal,
      cart,
    });
  } catch (error) {
    console.log("error happened in applying coupon", error);
    res.status(500).json({ message: "Something went wrong while applying the coupon." });
  }
};

exports.removeCoupon = async (req, res) => {
  console.log("it reached in remove coupon");
  try {
    const userId = req.session.passport.user;

    // Fetch the cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(400).json({ message: "Cart not found." });
    }

    // Check if a coupon is applied
    if (!cart.couponDiscount || cart.couponDiscount === 0) {
      return res.status(400).json({ message: "No coupon applied to remove." });
    }

    // Remove the coupon discount
    const couponDiscount = cart.couponDiscount;
    cart.totalDiscount -= couponDiscount; // Subtract coupon discount from total discount
    cart.couponDiscount = 0; // Clear coupon-specific discount
    cart.grandTotal = cart.totalPrice +cart.gst; // Recalculate grand total

    await cart.save();

    console.log("Coupon removed successfully");
    return res.status(200).json({
      message: "Coupon removed successfully.",
      totalDiscount: cart.totalDiscount,
      grandTotal: cart.grandTotal,
    });
  } catch (error) {
    console.log("Error happened in removing coupon", error);
    res.status(500).json({ message: "Something went wrong while removing the coupon." });
  }
};


