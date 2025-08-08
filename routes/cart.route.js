import express from "express"
import { addProductToCart,getCartByUserId, createCart, deleteCart, getCart, removeProductInstanceFromCart, removeAllSameProductFromCart, clearCart } from "../controllers/cart.controller.js";
import jwtVerify from "../middleware/auth.middleware.js"

const router = express.Router()
router.use(jwtVerify);


router.post("/create-cart/:productId", createCart)

router.get("/get-cart", getCart);

router.get("/get-cart/:userId", getCartByUserId);

router.patch("/remove-all-same-products/:productId", removeAllSameProductFromCart)

router.post("/add-product/:productId", addProductToCart)

router.patch("/:productId", removeProductInstanceFromCart);

router.patch("/clear-cart", clearCart);

router.delete("/:productId", deleteCart);


export {
    router
}