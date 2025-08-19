import Stripe from 'stripe';
import express from 'express';
import Order from '../models/order.model.js';
import Cart from '../models/cart.model.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Fulfillment function
const fulfillCheckout = async (sessionId) => {
  console.log(`Fulfilling Checkout Session ${sessionId}`);
  
  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    if (checkoutSession.payment_status !== 'unpaid') {
      const orderId = checkoutSession.metadata?.orderId;
      const cartId = checkoutSession.metadata?.cartId;
      
      if (!orderId) {
        console.error('No orderId found in session metadata');
        return;
      }

      const order = await Order.findById(orderId);
      if (!order) {
        console.error(`Order ${orderId} not found`);
        return;
      }

      if (order.paymentStatus === 'Completed') {
        console.log(`Order ${orderId} already fulfilled`);
        return;
      }

      let updateData = {};
      
      if (checkoutSession.payment_status === 'paid') {
        updateData = {
          paymentStatus: 'Completed',
          orderStatus: 'Paid',
          stripeSessionID: sessionId,
        };
        
        if (cartId) {
          await Cart.findByIdAndUpdate(cartId, {
            products: [],
            totalPrice: 0,
            totalQuantity: 0,
          });
          console.log(`Cart ${cartId} cleared`);
        }
        
        console.log(`Order ${orderId} payment completed`);
      } else {
        updateData = {
          paymentStatus: 'Failed',
          orderStatus: 'Processing',
          stripeSessionID: sessionId,
        };
        console.log(`Order ${orderId} payment failed`);
      }

      await Order.findByIdAndUpdate(orderId, updateData);
      
      // Additional fulfillment logic can go here:
      // - Send confirmation emails
      // - Update inventory
      // - Notify fulfillment center
      // - Generate invoices
      
    }
  } catch (error) {
    console.error('Error in fulfillCheckout:', error);
    throw error;
  }
};

// CORRECTED webhook handler
export const webhook = async (request, response) => {
  let event = request.body;

  // Verify webhook signature if endpoint secret is configured
  if (endpointSecret) {
    const signature = request.headers['stripe-signature'];
    
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
      case 'checkout.session.completed':
        console.log('Processing checkout.session.completed');
        await fulfillCheckout(event.data.object.id);
        break;
        
      case 'checkout.session.async_payment_succeeded':
        console.log('Processing checkout.session.async_payment_succeeded');
        await fulfillCheckout(event.data.object.id);
        break;
        
      case 'checkout.session.async_payment_failed':
        console.log('Processing checkout.session.async_payment_failed');
        const failedSession = event.data.object;
        const failedOrderId = failedSession.metadata?.orderId;
        
        if (failedOrderId) {
          await Order.findByIdAndUpdate(failedOrderId, {
            paymentStatus: 'Failed',
            orderStatus: 'Payment Failed',
          });
          console.log(`Order ${failedOrderId} marked as failed`);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return success response
    response.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    response.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
};

// Middleware for webhook route (captures raw body)
export const webhookMiddleware = express.raw({ type: 'application/json' });