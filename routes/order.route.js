import express from "express";

import jwtVerify from "../middleware/auth.middleware.js";
import { createOrderForCart, createOrderForProduct, getAllOrders, getAllOrdersForUser, getCurrentUserOrders, getOrderDetails, updateOrderStatus } from "../controllers/order.controller.js";
import checkAdminRole from "../middleware/role.middleware.js";

const router = express.Router();




router.use(jwtVerify);

router.get('/get-all-orders-for-current-user', getCurrentUserOrders);

router.get('/get-all-orders',checkAdminRole , getAllOrders);

router.get('/get-all-orders-for-user/:userId', getAllOrdersForUser);

router.post('/create-order-cart/:cartId/:addressId', createOrderForCart);

router.patch('/update-order-status/:orderId', checkAdminRole, updateOrderStatus);

router.post('/create-order-product/:productId/:addressId', createOrderForProduct);

router.get('/:orderId', getOrderDetails);







export { router };
