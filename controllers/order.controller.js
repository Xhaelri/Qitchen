import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Stripe from "stripe";
import "dotenv/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const currency = "usd";

export const createOrderForCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { cartId, addressId } = req.params;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!cartId || !addressId) {
      return res.status(400).json({
        success: false,
        message: "Cart ID and Address ID are required",
      });
    }

    // Get cart with product details
    const cart = await Cart.findById(cartId).populate("products.product");

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    if (!cart.products || cart.products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Create Order in DB first
    const order = await Order.create({
      buyer: userId,
      products: cart.products.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
      })),
      totalPrice: cart.totalPrice,
      totalQuantity: cart.totalQuantity,
      paymentStatus: "Pending",
      orderStatusStatus: "Processing",
      address: addressId,
    });

    const line_items = cart.products.map((item) => {
      const amount = Math.round(item.product.price * 100);
      return {
        price_data: {
          currency,
          product_data: {
            name: item.product.name,
            images: item.product.images || [],
          },
          unit_amount: amount,
        },
        quantity: item.quantity,
      };
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancelled?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        cartId: cartId,
      },
    });

    // Update order with Stripe session ID
    await Order.findByIdAndUpdate(order._id, {
      stripeSessionID: session.id,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("products.product")
      .populate("address");

    return res.status(201).json({
      success: true,
      session_url: session.url,
      orderId: order._id,
      order: populatedOrder,
      message: "Stripe session created. Redirect to payment.",
    });
  } catch (error) {
    console.log("Error in createOrderForCart:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrderForProduct = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { productId, addressId } = req.params;
    const { quantity = 1 } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!productId || !addressId) {
      return res.status(400).json({
        success: false,
        message: "Product ID and Address ID are required",
      });
    }

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    // Get cart with product details
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Create Order in DB first - Note: products should be an array
    const order = await Order.create({
      buyer: userId,
      products: [
        {
          product: productId,
          quantity: quantity,
        },
      ],
      totalPrice: product.price * quantity,
      totalQuantity: quantity,
      paymentStatus: "Pending",
      orderStatus: "Processing",
      address: addressId,
    });

    // line_items must be an array for Stripe
    const line_items = [
      {
        price_data: {
          currency,
          product_data: {
            name: product.name,
            images: product.images || [],
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: quantity,
      },
    ];

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancelled?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        productId: productId,
      },
    });

    // Update order with Stripe session ID
    await Order.findByIdAndUpdate(order._id, {
      stripeSessionID: session.id,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("products.product")
      .populate("address");

    return res.status(201).json({
      success: true,
      session_url: session.url,
      orderId: order._id,
      order: populatedOrder,
      message: "Stripe session created. Redirect to payment.",
    });
  } catch (error) {
    console.log("Error in createOrderForCart:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Manual payment verification for development (replaces webhook)
export const verifyPayment = async (req, res) => {
  try {
    const { sessionId, orderId } = req.params;

    if (!sessionId || !orderId) {
      return res.status(400).json({
        success: false,
        message: "Session ID and Order ID are required",
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Find the order in database
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if payment was successful
    if (session.payment_status === "paid") {
      // Update order status
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "Completed",
        orderStatus: "Paid",
      });

      // Clear the cart
      const cartId = session.metadata.cartId;
      if (cartId) {
        await Cart.findByIdAndUpdate(cartId, {
          products: [],
          totalPrice: 0,
          totalQuantity: 0,
        });
      }

      return res.status(200).json({
        success: true,
        paymentStatus: "completed",
        orderStatus: "Paid",
        message: "Payment verified successfully",
        order: await Order.findById(orderId).populate("products.product"),
      });
    } else {
      // Payment failed or pending
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus:
          session.payment_status === "unpaid" ? "Failed" : "Pending",
      });

      return res.status(200).json({
        success: false,
        paymentStatus: session.payment_status,
        message: `Payment ${session.payment_status}`,
      });
    }
  } catch (error) {
    console.log("Error in verifyPaymentManually:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get order details
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;

    const order = await Order.findById(orderId)
      .populate("products.product")
      .populate("address")
      .populate("buyer", "name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify ownership
    if (order.buyer._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to order",
      });
    }

    return res.status(200).json({
      success: true,
      order,
      message: "Order fetched successfully",
    });
  } catch (error) {
    console.log("Error in getOrderDetails:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllOrdersForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ buyer: userId })
      .populate("products.product")
      .populate("address");

    if (!orders) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: orders,
      message: "Orders fetched successfully",
    });
  } catch (error) {
    console.log("Error in getOrderDetails:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCurrentUserOrders = async (req, res) => {
  try {
    const userId = req.user?._id;

    const orders = await Order.find({ buyer: userId })
      .populate("products.product")
      .populate("address");

    if (!orders) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: orders,
      message: "Orders fetched successfully",
    });
  } catch (error) {
    console.log("Error in getOrderDetails:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order id is required",
      });
    }

    const allowedFields = ["orderStatus"];
    const changes = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        changes[field] = req.body[field];
      }
    });

    if (Object.keys(changes).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "orderStatus field is required" });
    }
    const updatedOrderStatus = await Order.findByIdAndUpdate(orderId, changes, {
      new: true,
    });

    if (!updatedOrderStatus) {
      return res
        .status(400)
        .json({ success: false, message: "Unable to update the product" });
    }
    return res.status(200).json({
      data: updatedOrderStatus,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.log("Error in updateOrderStatus function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};
