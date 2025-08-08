import express from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/category.controller.js";
import jwtVerify from "../middleware/auth.middleware.js";
import checkAdminRole from "../middleware/role.middleware.js";

const router = express.Router();

router.use(jwtVerify);

router.post("/create-category", checkAdminRole, createCategory);

router.get("/all-categories", getAllCategories);

router.get("/:categoryId", checkAdminRole, getCategoryById);

router.patch("/:categoryId", checkAdminRole, updateCategory);

router.delete("/:categoryId", checkAdminRole, deleteCategory);

export {
    router
}