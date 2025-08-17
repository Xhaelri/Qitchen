import Table from "../models/table.model.js";

export const createTable = async (req, res) => {
  try {
    const { number, capacity } = req.body;
    if (!number || !capacity) {
      return res
        .status(400)
        .json({ success: false, message: "number and capacity are required!" });
    }

    const newTable = await Table.create({ number: number, capacity: capacity });

    return res.status(201).json({
      success: true,
      data: newTable,
      message: "Table created successfully!",
    });
  } catch (error) {
    console.log("Error in createTable function", error);
    return res.status(400).json({
      success: false,
      message: " Table has not been created",
    });
  }
};

export const updateTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    if (!tableId) {
      return res
        .status(400)
        .json({ success: false, message: "Table id is required" });
    }
    const { number, capacity, isActive } = req.body;
    const changes = {};
    if (number) {
      changes.number = number;
    }
    if (capacity) {
      changes.capacity = capacity;
    }
    if (isActive) {
      changes.isActive = isActive;
    }

    if (!number && !capacity && !isActive) {
      return res.status(400).json({
        success: false,
        message: "At least 1 field is required for the update",
      });
    }

    const updatedTable = await Table.findByIdAndUpdate(tableId, changes, {
      new: true,
    });
    if (!updatedTable) {
      return res.status(400).json({
        success: false,
        message: "Table may not exist",
      });
    }
    return res.status(200).json({
      success: true,
      data: updatedTable,
      message: "Table update successfully!",
    });
  } catch (error) {
    console.log("Error in updateTable function", error);
    return res.status(400).json({
      success: false,
      message: "Table has not been updated",
    });
  }
};

export const deleteTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    if (!tableId) {
      return res
        .status(400)
        .json({ success: false, message: "Table id is required" });
    }

    const deletedTable = await Table.findByIdAndDelete(tableId);

    if (!deletedTable) {
      return res.status(404).json({
        success: false,
        message: "Table may not exist",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Table deleted successfully!",
    });
  } catch (error) {
    console.log("Error in deleteTable function", error);
    return res.status(400).json({
      success: false,
      message: " Table has not been deleted",
    });
  }
};

export const getTablebyId = async (req, res) => {
  try {
    const { tableId } = req.params;
    if (!tableId) {
      return res
        .status(400)
        .json({ success: false, message: "Table id is required" });
    }
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Table may not exist",
      });
    }
    return res.status(200).json({
      success: true,
      data: table,
      message: "Table fetched successfully!",
    });
  } catch (error) {
    console.log("Error in getTablebyId function", error);
    return res.status(400).json({
      success: false,
      message: "Table has not been fetched",
    });
  }
};

export const getAllTables = async (req, res) => {
  try {
    const tables = await Table.find();
    if (!tables) {
      return res.status(400).json({
        success: false,
        message: "Tables may not exist",
      });
    }
    return res.status(200).json({
      success: true,
      data: tables,
      message: "Tables fetched successfully!",
    });
  } catch (error) {
    console.log("Error in getAllTables function", error);
    return res.status(400).json({
      success: false,
      message: "Tables has not been fetched",
    });
  }
};
