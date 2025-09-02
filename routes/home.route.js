import express from "express";
import { getHomeData } from "../controllers/home.controller.js";

const router = express.Router();

router.get("/home-data", getHomeData);

export { router };
