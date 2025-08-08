import express from "express";

import jwtVerify from "../middleware/auth.middleware.js";
import {
  loginUser,
  logoutUser,
  registerUser,
  getCurrentUser,
  refreshAccessToken,
  updateAccountDetails,
  updatePassword,
  updateUserRole,
} from "../controllers/user.controller.js";
import checkAdminRole from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/refresh-token", refreshAccessToken);

router.get("/current-user", jwtVerify, getCurrentUser);

router.post("/logout", jwtVerify, logoutUser);

router.patch("/update-password", jwtVerify, updatePassword);

router.patch("/update-account-details", jwtVerify, updateAccountDetails);

router.patch("/change-user-role/:userId", jwtVerify, checkAdminRole, updateUserRole);

export { router };
