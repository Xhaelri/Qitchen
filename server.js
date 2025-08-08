import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";
import connectDB from "./db/db.js";
import "dotenv/config";
import { router as userRouter } from "./routes/user.route.js";
import { router as productRouter } from "./routes/product.route.js";
import { router as categoryRouter } from "./routes/category.route.js";
import { router as reviewRouter } from "./routes/review.route.js";
import { router as cartRouter } from "./routes/cart.route.js";
import { router as addressRouter } from "./routes/address.route.js";
import { router as orderRouter } from "./routes/order.route.js";

const app = express();
const port = process.env.PORT || 4000;

// Allow multiple origins
// const allowedOrigins = ["http://localhost:5173"];
//{ origin: allowedOrigins, credintials: true }

// Important: Handle webhook route before JSON parsing middleware
// app.use("/webhook/stripe", express.raw({ type: "application/json" }));

const corsConfig = {
  origin: "*",
  credentials: true,
  methods: ["GET", "PUT", "POST", "PATCH", "DELETE"],
};

// Middleware config
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsConfig));

app.get("/", (req, res) => {
  res.send("API is working");
});

app.use("/api/v1/user", userRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/category", categoryRouter);
app.use("/api/v1/review", reviewRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/address", addressRouter);
app.use("/api/v1/order", orderRouter);

async function startServer() {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
}

// Remove the top-level await and call the function instead
startServer();
