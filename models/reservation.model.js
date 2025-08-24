import mongoose, { Schema } from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    reservationDate: { type: Date, required: true }, // reservation date (day)
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
