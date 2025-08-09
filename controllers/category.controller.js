import Category from "../models/category.model.js";
import mongoose from "mongoose";
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "Both fields are required",
      });
    }
    const isCategoryAvailable = await Category.findOne({ name: name });

    if (isCategoryAvailable) {
      return res.status(400).json({
        success: false,
        message: "Category with the given name already exists",
      });
    }

    const category = await Category.create({
      name: name,
      description: description,
    });

    return res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully",
    });
  } catch (error) {
    console.log("Error in createCategory function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    if (page < 1 && limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Page and limit cannot be negative",
      });
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
    const pipeline = [
      {
        $match: {},
      },
      {
        $lookup: {
          from: "products", // Make sure this matches your actual products collection name
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },
    ];
    const allCategories = await Category.aggregatePaginate(pipeline, options);

    if (allCategories.totalPages === 0) {
      return res.status(400).json({
        success: false,
        message: "No page found",
      });
    }

    return res.status(200).json({
      success: true,
      data: allCategories.docs,
      totalPages: allCategories.totalPages,
      totalDocuments: allCategories.totalDocs,
      message: "All categories fetched successfully",
    });
  } catch (error) {
    console.log("Error in getAllCategories function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category id is required",
      });
    }

    const category = await Category.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(categoryId) },
      },
      {
        $lookup: {
          from: "products", // Collection name (usually pluralized)
          localField: "_id",
          foreignField: "category",
          as: "products",
        },
      },
    ]);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "No category found with the given id",
      });
    }
    return res.status(200).json({
      success: true,
      data: category,
      message: "Category fetched successfully",
    });
  } catch (error) {
    console.log("Error in getCategoryById function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category id is required",
      });
    }

    const { name, description } = req.body;
    const changes = {};
    if (name) {
      changes.name = name;
    }
    if (description) {
      changes.description = description;
    }
    if (Object.keys(changes).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least 1 field is required to change",
      });
    }
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      changes,
      { new: true }
    );
    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Unable to update the category or category may not exist",
      });
    }
    return res.status(200).json({
      success: true,
      data: updatedCategory,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.log("Error in updateCategory function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category id is required",
      });
    }

    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category may not exist",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.log("Error in deleteCategory function", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};
