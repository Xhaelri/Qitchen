import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Stripe from "stripe";
import "dotenv/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const currency = "usd";

export const createOrderForCart = async (req, res) => {
  const FRONTEND_URL =
    process.env.FRONT_PRODUCTION_URL || process.env.CLIENT_URL;

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

    const order = await Order.create({
      buyer: userId,
      products: cart.products.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
      })),
      totalPrice: cart.totalPrice,
      totalQuantity: cart.totalQuantity,
      paymentStatus: "Pending",
      orderStatus: "Processing",
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${FRONTEND_URL}/payment/cancelled?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        cartId: cartId.toString(),
      },
    });

    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          stripeSessionID: session.id,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedOrder) {
      console.error("Failed to update order with Stripe session ID");
      throw new Error("Failed to update order with Stripe session ID");
    }

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
  const FRONTEND_URL =
    process.env.FRONT_PRODUCTION_URL || process.env.CLIENT_URL;
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

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${FRONTEND_URL}/payment/cancelled?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        productId: productId.toString(),
      },
    });

    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        $set: {
          stripeSessionID: session.id,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedOrder) {
      console.error("Failed to update order with Stripe session ID");
      throw new Error("Failed to update order with Stripe session ID");
    }

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

export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("products.product")
      .populate("address")
      .populate("buyer", "-refreshToken -password -__v");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
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
    const { page = 1, limit = 10 } = req.query;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be positive numbers",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const orders = await Order.find({ buyer: userId })
      .populate("products.product")
      .populate("address")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const totalOrders = await Order.countDocuments({ buyer: userId });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found",
      });
    }

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / limitNum),
        totalOrders: totalOrders,
        hasNextPage: skip + orders.length < totalOrders,
        hasPrevPage: parseInt(page) > 1,
      },
      message: "Orders fetched successfully",
    });
  } catch (error) {
    console.log("Error in getAllOrdersForUser:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCurrentUserOrders = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { page = 1, limit = 10 } = req.query;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be positive numbers",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const orders = await Order.find({ buyer: userId })
      .populate("products.product")
      .populate("address")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const totalOrders = await Order.countDocuments({ buyer: userId });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found",
      });
    }

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / limitNum),
        totalOrders: totalOrders,
        hasNextPage: skip + orders.length < totalOrders,
        hasPrevPage: parseInt(page) > 1,
      },
      message: "Orders fetched successfully",
    });
  } catch (error) {
    console.log("Error in getCurrentUserOrders:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, orderStatus } = req.query;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be positive numbers",
      });
    }

    const validOrderStatuses = [
      "Processing",
      "Paid",
      "Ready",
      "On the way",
      "Received",
      "Failed",
    ];
    if (orderStatus && !validOrderStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Valid statuses are: ${validOrderStatuses.join(
          ", "
        )}`,
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const filter = {};
    if (orderStatus) {
      filter.orderStatus = orderStatus;
    }

    const orders = await Order.find(filter)
      .populate("products.product", "_id name price quantity")
      .populate("address")
      .populate("buyer", "-password -__v -refreshToken")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const totalOrders = await Order.countDocuments(filter);

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: false,
        data: [],
        message: orderStatus
          ? `No orders found with status: ${orderStatus}`
          : "No orders found",
      });
    }

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / limitNum),
        totalOrders: totalOrders,
        hasNextPage: skip + orders.length < totalOrders,
        hasPrevPage: parseInt(page) > 1,
      },
      filter: orderStatus ? { orderStatus } : null,
      message: orderStatus
        ? `Orders with status '${orderStatus}' fetched successfully`
        : "Orders fetched successfully",
    });
  } catch (error) {
    console.log("Error in getAllOrders:", error);
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
export const getOrdersByOrderStatus = async (req, res) => {
  try {
    const { page = 1, limit = 10, orderStatus } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be positive numbers",
      });
    }

    if (!orderStatus) {
      return res.status(400).json({
        success: false,
        message: "At least 1 order status required!",
      });
    }

    // normalize orderStatus into array
    const statuses =
      typeof orderStatus === "string"
        ? orderStatus.includes(",")
          ? orderStatus.split(",").map((s) => s.trim())
          : [orderStatus.trim()]
        : Array.isArray(orderStatus)
        ? orderStatus
        : [];

    const validOrderStatuses = [
      "Processing",
      "Paid",
      "Ready",
      "On the way",
      "Received",
      "Failed",
    ];

    const invalidStatuses = statuses.filter(
      (status) => !validOrderStatuses.includes(status)
    );

    if (invalidStatuses.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid statuses: ${invalidStatuses.join(", ")}. 
                  Valid statuses are: ${validOrderStatuses.join(", ")}`,
      });
    }

    const skip = (pageNum - 1) * limitNum;

    // filter for total count
    const filter = { orderStatus: { $in: statuses } };
    const totalOrders = await Order.countDocuments(filter);

    const statusesData = await Promise.all(
      statuses.map(async (status) => {
        const orders = await Order.find({ orderStatus: status })
          .populate("products.product", "_id name price quantity")
          .populate("address", "-__v")
          .populate("buyer", "-password -__v -refreshToken")
          .skip(skip)
          .limit(limitNum)
          .sort({ createdAt: -1 });

        return { status, orders };
      })
    );

    return res.status(200).json({
      success: true,
      data: statusesData,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalOrders / limitNum),
        totalOrders,
        hasNextPage: pageNum * limitNum < totalOrders,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error in getOrdersByOrderStatus:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
