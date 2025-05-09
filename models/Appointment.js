const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
    {
        pet: { type: mongoose.Schema.Types.ObjectId, ref: "Pet" },
        date: Date,
        description: String,
        status: {
            type: String,
            enum: ["pending", "confirmed", "cancelled"],
            default: "pending",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Appointment", AppointmentSchema);
