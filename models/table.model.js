import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    capacity: { type: Number, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Table = mongoose.model("Table", tableSchema);
export default Table;
