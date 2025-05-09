const bcrypt = require("bcrypt");
const User = require("../models/User");
const Pet = require("../models/Pet");
const Appointment = require("../models/Appointment");
const generateToken = require("../utils/generateToken");

module.exports = {
    Query: {
        me: async (_, __, { user }) => {
            if (!user) throw new Error("Not Authenticated");
            return await User.findById(user.id);
        },
        pets: async (_, __, { user }) => {
            if (!user) throw new Error("Not Authenticated");
            return await Pet.find({ owner: user.id });
        },
        appointments: async (_, __, { user }) => {
            if (!user) throw new Error("Not Authenticated");
            return await Appointment.find()
                .populate({
                    path: "pet",
                    match: { owner: user.id },
                })
                .then((appointments) =>
                    appointments.filter((apt) => apt.pet !== null)
                );
        },
        pet: async (_, { id }, { user }) => {
            if (!user) throw new Error("Not Authenticated");
            const pet = await Pet.findById(id);
            if (String(pet.owner) !== user.id) throw new Error("Unauthorized");
            return pet;
        },
        appointment: async (_, { id }, { user }) => {
            if (!user) throw new Error("Not Authenticated");
            return await Appointment.findById(id).populate("pet");
        },
        adminPets: async (_, __, { user }) => {
            if (!user || user.role !== "admin") throw new Error("Unauthorized");
            return await Pet.find().populate("owner");
        },
        adminAppointments: async (_, __, { user }) => {
            if (!user || user.role !== "admin") throw new Error("Unauthorized");
            return await Appointment.find().populate("pet");
        },
    },

    Mutation: {
        register: async (_, { username, password, adminCode }) => {
            const existing = await User.findOne({ username });
            if (existing) throw new Error("Username already exists");

            // Check if admin code matches
            const role =
                adminCode === process.env.ADMIN_CODE ? "admin" : "user";

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await User.create({
                username,
                password: hashedPassword,
                role,
            });

            const tokens = generateToken(user);
            return {
                ...user._doc,
                token: tokens.token,
                userData: tokens.userData,
            };
        },

        login: async (_, { username, password }) => {
            const user = await User.findOne({ username });
            if (!user || !(await bcrypt.compare(password, user.password)))
                throw new Error("Invalid credentials");

            const tokens = generateToken(user);
            return {
                ...user._doc,
                token: tokens.token,
                userData: tokens.userData,
            };
        },

        addPet: async (_, { name, type, image }, { user }) => {
            if (!user) throw new Error("Not authenticated");
            try {
                const pet = {
                    name,
                    type,
                    owner: user.id,
                };

                if (image) {
                    const { createReadStream, filename } = await image;
                    const uniqueFilename = `${Date.now()}-${filename}`;
                    const stream = createReadStream();
                    await new Promise((resolve, reject) => {
                        const writeStream = require("fs").createWriteStream(
                            `public/uploads/${uniqueFilename}`
                        );
                        stream
                            .pipe(writeStream)
                            .on("finish", resolve)
                            .on("error", reject);
                    });
                    pet.image = uniqueFilename;
                }

                const createdPet = await Pet.create(pet);
                console.log("Created pet:", createdPet);
                return createdPet;
            } catch (err) {
                console.error("Pet creation error:", err);
                throw new Error("Failed to create pet: " + err.message);
            }
        },

        bookAppointment: async (_, { petId, date, description }, { user }) => {
            if (!user) throw new Error("Unauthorized");

            try {
                const pet = await Pet.findById(petId);
                if (!pet || String(pet.owner) !== user.id) {
                    throw new Error("Unauthorized Pet Access");
                }

                const appointment = await Appointment.create({
                    pet: petId,
                    date: new Date(parseInt(date)),
                    description,
                    status: "pending",
                });

                return await appointment.populate("pet");
            } catch (err) {
                console.error("Appointment creation error:", err);
                throw new Error("Failed to create appointment: " + err.message);
            }
        },

        updatePet: async (_, { id, name, type, image }, { user }) => {
            if (!user) throw new Error("Unauthorized");
            const pet = await Pet.findById(id);
            if (!pet || String(pet.owner) !== user.id)
                throw new Error("Unauthorized");

            const updates = {};
            if (name) updates.name = name;
            if (type) updates.type = type;
            if (image) {
                const { filename } = await image;
                updates.image = filename;
            }

            return await Pet.findByIdAndUpdate(id, updates, { new: true });
        },

        deletePet: async (_, { id }, { user }) => {
            if (!user) throw new Error("Unauthorized");
            const pet = await Pet.findById(id);
            if (!pet || String(pet.owner) !== user.id)
                throw new Error("Unauthorized");
            await Pet.findByIdAndDelete(id);
            return true;
        },

        updateAppointment: async (
            _,
            { id, date, description, status },
            { user }
        ) => {
            if (!user) throw new Error("Unauthorized");
            const appointment = await Appointment.findById(id);
            if (!appointment) throw new Error("Appointment not found");

            const updates = {};
            if (date) updates.date = date;
            if (description) updates.description = description;
            if (status && user.role === "admin") updates.status = status;

            return await Appointment.findByIdAndUpdate(id, updates, {
                new: true,
            });
        },

        deleteAppointment: async (_, { id }, { user }) => {
            if (!user) throw new Error("Unauthorized");
            await Appointment.findByIdAndDelete(id);
            return true;
        },
    },

    Pet: {
        owner: async (pet) => await User.findById(pet.owner),
    },

    Appointment: {
        pet: async (appointment) => await Pet.findById(appointment.pet),
    },
};
