import Stripe from "stripe";
import express from "express";
import Order from "../models/order.model.js";
import Cart from "../models/cart.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Fulfillment function
const fulfillCheckout = async (sessionId) => {
  console.log(`Fulfilling Checkout Session ${sessionId}`);

 
  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    console.log(`Session retrieved:`, {
      id: sessionId,
      payment_status: checkoutSession.payment_status,
      metadata: checkoutSession.metadata
    });

    const orderId = checkoutSession.metadata?.orderId;
    const cartId = checkoutSession.metadata?.cartId;
    
    if (!orderId) {
      console.log('ERROR: No orderId found in session metadata', checkoutSession.metadata);
      throw new Error('No orderId found in session metadata');
    }

    console.log(`Processing order: ${orderId}, cart: ${cartId}`);

    const order = await Order.findById(orderId);
    if (!order) {
      console.log(`ERROR: Order ${orderId} not found in database`);
      throw new Error(`Order ${orderId} not found`);
    }

    console.log(`Current order status:`, {
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      sessionPaymentStatus: checkoutSession.payment_status
    });

    // Skip if order is already processed to avoid duplicate processing
    if (order.paymentStatus === 'Completed' || order.paymentStatus === 'Failed') {
      console.log(`Order ${orderId} already processed (${order.paymentStatus}), skipping`);
      return;
    }

    let updateData = {};
    
    if (checkoutSession.payment_status === 'paid') {
      updateData = {
        paymentStatus: 'Completed',
        orderStatus: 'Paid',
        stripeSessionID: sessionId,
      };
      
      console.log(`Updating order ${orderId} to completed status`);
      
      // Update the order first
      const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
      console.log(`Order updated:`, {
        orderId: updatedOrder._id,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.orderStatus
      });
      
      // Clear cart if present (only for successful payments)
      if (cartId) {
        const deletedCart = await Cart.findByIdAndDelete(cartId);
        if (deletedCart) {
          console.log(`Cart ${cartId} cleared successfully`);
        } else {
          console.log(`Cart ${cartId} not found or already deleted`);
        }
      }
      
      console.log(`Order ${orderId} payment completed successfully`);
    } else if (checkoutSession.payment_status === 'unpaid') {
      updateData = {
        paymentStatus: 'Failed',
        orderStatus: 'Failed',
        stripeSessionID: sessionId,
      };
      
      const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
      console.log(`Order ${orderId} marked as failed due to unpaid status`, {
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.orderStatus
      });
      
      // Don't clear cart for failed payments - user might want to retry
    } else {
      // Handle other payment statuses (e.g., 'no_payment_required', etc.)
      updateData = {
        paymentStatus: 'Failed',
        orderStatus: 'Failed',
        stripeSessionID: sessionId,
      };
      
      const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
      console.log(`Order ${orderId} marked as failed due to payment status: ${checkoutSession.payment_status}`, {
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.orderStatus
      });
    }

    // Additional fulfillment logic can go here:
    // - Send confirmation emails
    // - Update inventory
    // - Notify fulfillment center
    // - Generate invoices
      
  } catch (error) {
    console.error("Error in fulfillCheckout:", error);
    throw error;
  }
};

// CORRECTED webhook handler
export const webhook = async (request, response) => {
  let event = request.body;

  // Verify webhook signature if endpoint secret is configured
  if (endpointSecret) {
    const signature = request.headers["stripe-signature"];

    try {
      // Construct event from raw body and signature
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        endpointSecret
      );
      console.log(`Webhook signature verified for event: ${event.type}`);
    } catch (err) {
      console.log(`Webhook signature verification failed:`, err.message);
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  console.log(`Received webhook event: ${event.type}`);

  try {
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        console.log("Processing checkout.session.completed");
        await fulfillCheckout(event.data.object.id);
        break;

      case "checkout.session.async_payment_succeeded":
        console.log("Processing checkout.session.async_payment_succeeded");
        await fulfillCheckout(event.data.object.id);
        break;

      case "checkout.session.async_payment_failed":
        console.log("Processing checkout.session.async_payment_failed");
        const failedSession = event.data.object;
        const failedOrderId = failedSession.metadata?.orderId;

        if (failedOrderId) {
          const updatedOrder = await Order.findByIdAndUpdate(
            failedOrderId,
            {
              paymentStatus: "Failed",
              orderStatus: "Failed",
            },
            { new: true }
          );

          console.log(`Order ${failedOrderId} marked as failed`, {
            paymentStatus: updatedOrder.paymentStatus,
            orderStatus: updatedOrder.orderStatus,
          });
        } else {
          console.log("No orderId found in failed session metadata");
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return success response
    response.status(200).json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    response.status(500).json({
      error: "Webhook processing failed",
      message: error.message,
    });
  }
};

// Middleware for webhook route (captures raw body)
export const webhookMiddleware = express.raw({ type: "application/json" });
