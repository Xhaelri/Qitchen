import mongoose, { Schema } from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        _id: false,
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value > 0;
        },
        message: "Total price must be a positive Number",
      },
    },
    totalQuantity: {
      type: Number,
      default: 1,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Cancelled"],
      default: "Pending",
      required: true,
    },
    paymentDetails: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
    address: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    stripeSessionID: {
      type: String,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
