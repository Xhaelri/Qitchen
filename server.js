import { applySecurity } from "./middleware/security.middleware.js";
import { errorHandler, notFound } from "./middleware/errorHandler.middlware.js";


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
import { router as tableRouter } from "./routes/table.route.js";
import { router as reservationRouter } from "./routes/reservation.route.js";
import { router as srtipeRouter } from "./routes/stripe.route.js";

const app = express();

// stripe webhook route
app.use('/api/v1/stripe', srtipeRouter);


app.use(cookieParser());
applySecurity(app);

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
app.use("/api/v1/table", tableRouter);
app.use("/api/v1/reservation", reservationRouter);


app.use(notFound);
app.use(errorHandler);


async function startServer() {
  const port = process.env.PORT || 4000;
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

startServer();
