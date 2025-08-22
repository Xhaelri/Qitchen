import Reservation from "../models/reservation.model.js";
import Table from "../models/table.model.js";

const VALID_SLOTS = ["16:00", "18:00", "20:00", "22:00"];

// Helper function to create local date without timezone conversion
function createLocalDate(dateString, timeString = "00:00:00") {
  const [year, month, day] = dateString.split("-");
  const [hours, minutes, seconds = "00"] = timeString.split(":");
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

// Helper function to get start and end of day in local time
function getLocalDayRange(dateString) {
  const startOfDay = createLocalDate(dateString, "00:00:00");
  const endOfDay = createLocalDate(dateString, "23:59:59");
  endOfDay.setMilliseconds(999);
  return { startOfDay, endOfDay };
}

function generateSlots(date, interval = 120) {
  const slots = [];
  let start = createLocalDate(date, "16:00:00");
  let end = createLocalDate(date, "24:00:00");

  let current = new Date(start);
  while (current < end) {
    slots.push(new Date(current));
    current = new Date(current.getTime() + interval * 60 * 1000);
  }
  return slots;
}

function isValidSlot(slot) {
  return VALID_SLOTS.includes(slot);
}

export const getAllSlotsForAllTables = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required.",
      });
    }

    const allTables = await Table.find();
    const { startOfDay, endOfDay } = getLocalDayRange(date);

    const currentReservations = await Reservation.find({
      reservationDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ["pending", "confirmed"] },
    }).populate("table");

    const currentReservationsMap = {};

    currentReservations.forEach((r) => {
      const key = `${r.table.number}_${r.reservationDate.getTime()}`;
      currentReservationsMap[key] = "Reserved";
    });

    const result = [];

    allTables.forEach((table) => {
      const slots = generateSlots(date);
      const availableSlots = slots.filter(
        (slot) => !currentReservationsMap[`${table.number}_${slot.getTime()}`]
      );
      const reservedSlots = slots.filter(
        (slot) => currentReservationsMap[`${table.number}_${slot.getTime()}`]
      );

      result.push({
        tableNumber: table.number,
        capacity: table.capacity,
        isActive: table.isActive,
        reservedSlots,
        availableSlots,
      });
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: "slots fetched successfully!",
    });
  } catch (error) {
    console.log("Error in getAllSlotsForAllTables function", error);
    return res.status(500).json({
      success: false,
      message: "couldn't fetch slots",
    });
  }
};

export const createReservation = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User is not authenticated" });
    }

    const { tableNumber, date, slot } = req.body;

    if (!tableNumber || !date || !slot) {
      return res.status(400).json({
        success: false,
        message: "tableNumber, date, and slot are required.",
      });
    }

    if (!isValidSlot(slot)) {
      return res.status(400).json({
        success: false,
        message: `Invalid slot time. Available slots are: ${VALID_SLOTS.join(
          ", "
        )}`,
      });
    }

    const table = await Table.findOne({ number: tableNumber });
    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    const reservationDate = createLocalDate(date, `${slot}:00`);

    const now = new Date();
    if (reservationDate < now) {
      return res.status(400).json({
        success: false,
        message: "Cannot create reservation for a past date and time",
      });
    }

    const existing = await Reservation.findOne({
      table: table._id,
      reservationDate: reservationDate,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This slot is already reserved for this table",
      });
    }

    const newReservation = await Reservation.create({
      user: userId,
      table: table._id,
      reservationDate,
      status: "confirmed",
    });

    await newReservation.populate([
      { path: "user", select: "-refreshToken -password -__v" },
      { path: "table", select: "-__v -createdAt -updatedAt" },
    ]);

    return res.status(201).json({
      success: true,
      data: newReservation,
      message: "Reservation created successfully",
    });
  } catch (error) {
    console.error("Error in createReservation function", error);
    return res.status(500).json({
      success: false,
      message: "Couldn't create reservation",
    });
  }
};

export const updateReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userId = req.user?._id;

    if (!reservationId) {
      return res.status(400).json({
        success: false,
        message: "Reservation id is required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
      });
    }

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation doesn't exist",
      });
    }

    const { tableNumber, date, slot, status } = req.body;

    const updates = {};

    if (tableNumber) {
      const table = await Table.findOne({ number: tableNumber });
      if (!table) {
        return res.status(404).json({
          success: false,
          message: "Table not found",
        });
      }
      updates.table = table._id;
    }

    if (date && slot) {
      if (!isValidSlot(slot)) {
        return res.status(400).json({
          success: false,
          message: `Invalid slot time. Available slots are: ${VALID_SLOTS.join(
            ", "
          )}`,
        });
      }

      const newReservationDate = createLocalDate(date, `${slot}:00`);

      const now = new Date();
      if (newReservationDate < now) {
        return res.status(400).json({
          success: false,
          message: "Cannot update reservation to a past date and time",
        });
      }

      updates.reservationDate = newReservationDate;
    }

    if (status) {
      if (!["pending", "confirmed", "cancelled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be pending, confirmed, or cancelled",
        });
      }
      updates.status = status;
    }

    if (updates.table || updates.reservationDate) {
      const conflictCheck = await Reservation.findOne({
        _id: { $ne: reservationId },
        table: updates.table || reservation.table,
        reservationDate: updates.reservationDate || reservation.reservationDate,
        status: { $in: ["pending", "confirmed"] },
      });

      if (conflictCheck) {
        return res.status(400).json({
          success: false,
          message: "This slot is already reserved for this table",
        });
      }
    }

    const updatedReservation = await Reservation.findByIdAndUpdate(
      reservationId,
      updates,
      { new: true }
    ).populate([
      { path: "user", select: "-refreshToken -password -__v" },
      { path: "table", select: "-__v -createdAt -updatedAt" },
    ]);

    return res.status(200).json({
      success: true,
      data: updatedReservation,
      message: "Reservation updated successfully",
    });
  } catch (error) {
    console.error("Error in updateReservation function", error);
    return res.status(500).json({
      success: false,
      message: "Couldn't update reservation",
    });
  }
};

export const cancelReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userId = req.user?._id;

    if (!reservationId) {
      return res.status(400).json({
        success: false,
        message: "Reservation id is required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
      });
    }

    const reservation = await Reservation.findById(reservationId).populate([
      { path: "user", select: "-refreshToken -password -__v" },
      { path: "table", select: "-__v -createdAt -updatedAt" },
    ]);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation doesn't exist!",
      });
    }

    if (reservation.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Reservation is already cancelled",
      });
    }

    // Optional: Check cancellation policy (uncomment if needed)
    // const now = new Date();
    // const reservationTime = new Date(reservation.reservationDate);
    // const hoursUntilReservation = (reservationTime - now) / (1000 * 60 * 60);
    // if (hoursUntilReservation < 2) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Cannot cancel reservation less than 2 hours before the scheduled time"
    //   });
    // }

    reservation.status = "cancelled";
    await reservation.save();

    return res.status(200).json({
      success: true,
      data: reservation,
      message: "Reservation cancelled successfully",
    });
  } catch (error) {
    console.error("Error in cancelReservation function", error);
    return res.status(500).json({
      success: false,
      message: "Couldn't cancel reservation",
    });
  }
};

export const getAllReservationsByDay = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required.",
      });
    }

    const { startOfDay, endOfDay } = getLocalDayRange(date);

    const reservations = await Reservation.find({
      reservationDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ["pending", "confirmed"] },
    }).populate([
      { path: "user", select: "-refreshToken -password -__v" },
      { path: "table", select: "-__v -createdAt -updatedAt" },
    ]);

    if (!reservations || reservations.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No reservations for this date!" });
    }

    return res.status(200).json({
      success: true,
      data: reservations,
      message: `Reservations for date:${date} fetched successfully!`,
    });
  } catch (error) {
    console.log("Error in getAllReservationsByDay function", error);
    return res.status(500).json({
      success: false,
      message: "couldn't fetch reservations",
    });
  }
};

export const getAllReservationsForTodayAllTables = async (req, res) => {
  try {
    const now = new Date();

    // Get today's date in YYYY-MM-DD format in local time
    const today =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const { startOfDay, endOfDay } = getLocalDayRange(today);

    const allTables = await Table.find();

    const reservations = await Reservation.find({
      reservationDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    }).select("-__v").populate([
      { path: "user", select: "-refreshToken -password -__v" },
    ]);

    if (!reservations || reservations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No reservations for today!",
      });
    }
    const tablesWithReservations = allTables.map((table) => {
      const tableReservations = reservations.filter(
        (reservation) =>
          reservation.table._id.toString() === table._id.toString()
      );

      return {
        tableId: table._id,
        tableNumber: table.number,
        capacity: table.capacity,
        isActive: table.isActive,
        reservations: tableReservations,
      };
    });
    return res.status(200).json({
      success: true,
      data: tablesWithReservations,
      message: "Reservations for today fetched successfully!",
    });
  } catch (error) {
    console.error("Error in getAllReservationsForTodayAllTables:", error);
    return res.status(500).json({
      success: false,
      message: "Couldn't fetch reservations",
    });
  }
};

export const getAllReservationsForCurrentUser = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User is not authenticated" });
    }

    const reservations = await Reservation.find({
      user: userId,
    }).populate([
      { path: "user", select: "-refreshToken -password -__v" },
      { path: "table", select: "-__v -createdAt -updatedAt" },
    ]);

    if (!reservations || reservations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No reservations found for this user!",
      });
    }

    return res.status(200).json({
      success: true,
      data: reservations,
      message: `Reservations for user fetched successfully!`,
    });
  } catch (error) {
    console.log("Error in getAllReservationsForCurrentUser function", error);
    return res.status(500).json({
      success: false,
      message: "couldn't fetch reservations",
    });
  }
};

export const getAllReservationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const reservations = await Reservation.find({
      user: userId,
    }).populate([
      { path: "user", select: "-refreshToken -password -__v" },
      { path: "table", select: "-__v -createdAt -updatedAt" },
    ]);

    if (!reservations || reservations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No reservations found for this user!",
      });
    }

    return res.status(200).json({
      success: true,
      data: reservations,
      message: `Reservations for user fetched successfully!`,
    });
  } catch (error) {
    console.log("Error in getAllReservationsByUserId function", error);
    return res.status(500).json({
      success: false,
      message: "couldn't fetch reservations",
    });
  }
};

export const getAllReservationsByReservationId = async (req, res) => {
  try {
    const { reservationId } = req.params;
    if (!reservationId) {
      return res
        .status(400)
        .json({ success: false, message: "Reservation id is required" });
    }

    const reservation = await Reservation.findById(reservationId).populate([
      { path: "user", select: "-refreshToken -password -__v" },
      { path: "table", select: "-__v -createdAt -updatedAt" },
    ]);

    if (!reservation) {
      return res
        .status(404)
        .json({ success: false, message: "Reservation doesn't exist!" });
    }

    return res.status(200).json({
      success: true,
      data: reservation,
      message: `Reservation fetched successfully!`,
    });
  } catch (error) {
    console.log("Error in getAllReservationsByReservationId function", error);
    return res.status(500).json({
      success: false,
      message: "couldn't fetch reservation",
    });
  }
};

export const deleteReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    if (!reservationId) {
      return res
        .status(400)
        .json({ success: false, message: "Reservation id is required" });
    }

    const deletedReservation = await Reservation.findByIdAndDelete(
      reservationId
    );
    if (!deletedReservation) {
      return res
        .status(404)
        .json({ success: false, message: "Reservation doesn't exist!" });
    }

    return res.status(200).json({
      success: true,
      message: `Reservation deleted successfully!`,
    });
  } catch (error) {
    console.log("Error in deleteReservation function", error);
    return res.status(500).json({
      success: false,
      message: "couldn't delete reservation",
    });
  }
};
