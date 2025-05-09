const mongoose = require("mongoose");

const PetSchema = new mongoose.Schema(
    {
        name: String,
        type: String,
        image: String,
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Pet", PetSchema);
