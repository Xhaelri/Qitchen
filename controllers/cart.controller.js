import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";

export const createCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User is not authenticated" });
    }

    let cart = await Cart.findOne({ owner: userId });

    const { productId } = req.params;
    const { quantity = 1 } = req.body; // Get quantity from request body

    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found with the given Product id",
        });
      }

      // Validate quantity
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a positive integer",
        });
      }

      if (!cart) {
        cart = new Cart({
          owner: userId,
          products: [],
          totalPrice: 0,
          totalQuantity: 0,
        });
      }

      const existingProduct = cart.products.find(
        (p) => p.product.toString() === productId
      );

      if (existingProduct) {
        existingProduct.quantity += quantity;
      } else {
        cart.products.push({ product: productId, quantity: quantity });
      }

      cart.totalQuantity += quantity;
      cart.totalPrice += product.price * quantity;

      await cart.save();
      await cart.populate("products.product");

      return res.status(201).json({
        success: true,
        data: cart,
        message: `${quantity} item(s) added to cart successfully`,
      });
    }

    // If product is not added and the endpoint hit for creating empty cart
    if (!cart) {
      cart = await Cart.create({ owner: userId });
    }

    return res.status(201).json({
      success: true,
      data: cart,
      message: "Cart created successfully",
    });
  } catch (error) {
    console.log("Error in createCart function", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const addProductToCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User is not authenticated" });
    }

    const { productId } = req.params;
    const { quantity = 1 } = req.body; // Accept quantity from request body

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found with the given Product id",
      });
    }

    // Check if product is available
    if (!product.isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Product is not available",
      });
    }

    let cart = await Cart.findOne({ owner: userId });

    // Auto-create cart if it doesn't exist
    if (!cart) {
      cart = new Cart({
        owner: userId,
        products: [],
        totalPrice: 0,
        totalQuantity: 0,
      });
    }

    const existingProduct = cart.products.find(
      (p) => p.product.toString() === productId
    );

    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      cart.products.push({ product: productId, quantity: quantity });
    }

    cart.totalPrice += product.price * quantity;
    cart.totalQuantity += quantity;

    await cart.save();
    await cart.populate("products.product");
    
    return res.status(200).json({
      success: true,
      data: cart,
      message: `${quantity} item(s) added to cart successfully`,
    });
  } catch (error) {
    console.log("Error in addProductToCart function", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// NEW: Update product quantity directly (for product cards)
export const updateProductQuantity = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User is not authenticated" });
    }

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a non-negative integer",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const cart = await Cart.findOne({ owner: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const existingProduct = cart.products.find(
      (p) => p.product.toString() === productId
    );

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    // Calculate difference for totals
    const quantityDiff = quantity - existingProduct.quantity;
    const priceDiff = product.price * quantityDiff;

    if (quantity === 0) {
      // Remove product from cart
      cart.products = cart.products.filter(
        (p) => p.product.toString() !== productId
      );
    } else {
      // Update quantity
      existingProduct.quantity = quantity;
    }

    cart.totalQuantity += quantityDiff;
    cart.totalPrice += priceDiff;

    // Ensure totals don't go negative
    cart.totalQuantity = Math.max(0, cart.totalQuantity);
    cart.totalPrice = Math.max(0, cart.totalPrice);

    await cart.save();
    await cart.populate("products.product");

    return res.status(200).json({
      success: true,
      data: cart,
      message: quantity === 0 ? "Product removed from cart" : "Product quantity updated successfully",
    });
  } catch (error) {
    console.log("Error in updateProductQuantity function", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const removeProductInstanceFromCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { productId } = req.params;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User is not authenticated" });
    }

    const cart = await Cart.findOne({ owner: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart with the given owner doesn't exist",
      });
    }

    const item = cart.products.find((p) => p.product.toString() === productId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found with the given Product id",
      });
    }

    item.quantity -= 1;
    cart.totalQuantity -= 1;
    cart.totalPrice -= product.price;

    if (item.quantity <= 0) {
      cart.products = cart.products.filter(
        (p) => p.product.toString() !== productId
      );
    }

    await cart.save();
    await cart.populate("products.product");
    
    return res.status(200).json({
      success: true,
      data: cart,
      message: "Product quantity decreased successfully",
    });
  } catch (error) {
    console.log("Error in removeProductInstanceFromCart function", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const removeAllSameProductFromCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { productId } = req.params;

    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "User is not authenticated" });

    const cart = await Cart.findOne({ owner: userId });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });

    const item = cart.products.find((p) => p.product.toString() === productId);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Product not in cart" });

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    cart.totalPrice -= product.price * item.quantity;
    cart.totalQuantity -= item.quantity;

    cart.products = cart.products.filter(
      (p) => p.product.toString() !== productId
    );

    await cart.save();
    await cart.populate("products.product");
    
    return res
      .status(200)
      .json({ 
        success: true, 
        data: cart, 
        message: "All instances removed successfully" 
      });
  } catch (error) {
    console.log("Error in removeAllSameProductFromCart function", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User is not authenticated" });
    }

    const cart = await Cart.findOne({ owner: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.products = [];
    cart.totalPrice = 0;
    cart.totalQuantity = 0;

    await cart.save();

    return res.status(200).json({
      success: true,
      data: cart,
      message: "Cart cleared successfully",
    });
  } catch (error) {
    console.log("Error in clearCart function", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User is not authenticated" });
    }

    const cart = await Cart.findOneAndDelete({
      owner: userId,
    });

    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: "Cart not found" 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Cart deleted successfully" 
    });
  } catch (error) {
    console.log("Error in deleteCart function", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });

    const cart = await Cart.findOne({ owner: userId }).populate(
      "products.product"
    );

    if (!cart) {
      // Return empty cart structure instead of 404
      return res.status(200).json({
        success: true,
        cart: {
          _id: null,
          products: [],
          totalQuantity: 0,
          totalPrice: 0,
        },
      });
    }

    const productDetails = cart.products.map((p) => ({
      product: p.product,
      quantity: p.quantity,
    }));

    return res.status(200).json({
      success: true,
      cart: {
        _id: cart._id,
        products: productDetails,
        totalQuantity: cart.totalQuantity,
        totalPrice: cart.totalPrice,
      },
    });
  } catch (error) {
    console.error("getCart error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCartByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: "User ID is required" 
      });
    }

    const cart = await Cart.findOne({ owner: userId }).populate(
      "products.product"
    );

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: {
          _id: null,
          products: [],
          totalQuantity: 0,
          totalPrice: 0,
        },
      });
    }

    const productDetails = cart.products.map((p) => ({
      product: p.product,
      quantity: p.quantity,
    }));

    return res.status(200).json({
      success: true,
      cart: {
        _id: cart._id,
        products: productDetails,
        totalQuantity: cart.totalQuantity,
        totalPrice: cart.totalPrice,
      },
    });
  } catch (error) {
    console.log("Error in getCartByUserId function", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

