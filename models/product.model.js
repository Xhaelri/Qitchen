import mongoose, { Schema } from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    price: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
    ingredients: { type: [String], default: [], required: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: function (array) {
          return array.length > 0;
        },
        message: "At least one image is required",
      },
    },
    imagesPublicId: {
      type: [String],
    },
  },
  { timestamps: true }
);

const Product =
  mongoose.models.product || mongoose.model("Product", productSchema);

export default Product;
