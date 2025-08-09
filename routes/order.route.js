import express from "express";

import jwtVerify from "../middleware/auth.middleware.js";
import { createOrderForCart, createOrderForProduct, getAllOrdersForUser, getCurrentUserOrders, getOrderDetails, updateOrderStatus, verifyPayment } from "../controllers/order.controller.js";
import checkAdminRole from "../middleware/role.middleware.js";

const router = express.Router();




router.use(jwtVerify);

router.get('/get-all-orders-for-current-user', getCurrentUserOrders);

router.get('/get-all-orders-for-user/:userId', getAllOrdersForUser);

router.post('/create-order-cart/:cartId/:addressId', createOrderForCart);

router.patch('/update-order-status/:orderId', checkAdminRole, updateOrderStatus);

router.post('/create-order-product/:productId/:addressId', createOrderForProduct);

// Manual payment verification (replaces webhook in development)
router.post('/verify/:sessionId/:orderId', verifyPayment);

router.get('/:orderId', getOrderDetails);







export { router };
