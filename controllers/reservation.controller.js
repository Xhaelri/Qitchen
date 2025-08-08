// import Reservation from "../models/reservation.model.js";

// export const getAvailableSlots = async (req, res) => {
//   const { date } = req.query;
//   if (!date) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Date is required" });
//   }

//   const OPENING_HOUR = 12;
//   const CLOSING_HOUR = 22;
//   const SLOT_DURATION_MINUTES = 60;
//   const MAX_RESERVATIONS_PER_SLOT = 5;

//   const slots = [];

//   for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
//     const time = `${hour.toString().padStart(2, "0")}:00`;
//     const dateTime = new Date(`${date}T${time}`);

//     const existingReservations = await Reservation.countDocuments({
//       reservationDate: dateTime,
//     });

//     if (existingReservations < MAX_RESERVATIONS_PER_SLOT) {
//       slots.push(time);
//     }
//   }

//   return res.status(200).json({date})
// };
