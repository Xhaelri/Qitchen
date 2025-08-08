import express from "express";

import jwtVerify from "../middleware/auth.middleware.js";
import { createOrderForCart, createOrderForProduct, getAllOrdersForUser, getCurrentUserOrders, getOrderDetails, verifyPayment } from "../controllers/order.controller.js";

const router = express.Router();




router.use(jwtVerify);

router.get('/get-all-orders-for-current-user', getCurrentUserOrders);

router.get('/get-all-orders-for-user/:userId', getAllOrdersForUser);

router.post('/create-order-cart/:cartId/:addressId', createOrderForCart);

router.post('/create-order-product/:productId/:addressId', createOrderForProduct);

// Manual payment verification (replaces webhook in development)
router.post('/verify/:sessionId/:orderId', verifyPayment);

router.get('/:orderId', getOrderDetails);







export { router };
