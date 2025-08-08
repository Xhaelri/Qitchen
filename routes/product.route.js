import express from "express";
import jwtVerify from "../middleware/auth.middleware.js"

import {upload} from "../middleware/multer.middleware.js";
import checkAdminRole from "../middleware/role.middleware.js";
import {
  changeProductCategory,
  deleteProduct,
  getProductById,
  getProducts,
  getReviewsForProduct,
  productListing,
  toggleProductAvailability,
  updateListedProduct,
  updateProductImages,
} from "../controllers/product.controller.js";

const router = express.Router();

router.use(jwtVerify);


router.post("/product-listing/:categoryId", checkAdminRole, upload.array("productImages", 10), productListing);

router.patch("/product-toggle-availability/:productId", checkAdminRole, toggleProductAvailability);

router.get("/get-product/:productId", getProductById);

router.patch("/update-product/:productId", checkAdminRole,updateListedProduct);

router.patch("/update-product-images/:productId", checkAdminRole, upload.array('productImages', 10), updateProductImages);

router.get("/get-all-products", getProducts);

router.patch("/change-product-category/:productId/:categoryId", checkAdminRole, changeProductCategory);

router.delete("/delete-product/:productId", checkAdminRole, deleteProduct);

router.get("/get-product-reviews/:productId", getReviewsForProduct); 



export {
    router
}