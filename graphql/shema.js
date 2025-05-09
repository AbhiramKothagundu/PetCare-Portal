const { gql } = require("apollo-server-express");

module.exports = gql`
    scalar Upload

    type User {
        id: ID!
        username: String!
        role: String!
        token: String
        userData: String
    }

    type Pet {
        id: ID!
        name: String!
        type: String!
        owner: User!
        image: String
    }

    type Appointment {
        id: ID!
        pet: Pet!
        date: String!
        description: String!
        status: String!
    }

    type Query {
        me: User
        pets: [Pet]
        pet(id: ID!): Pet
        appointments: [Appointment]
        appointment(id: ID!): Appointment
        adminPets: [Pet]
        adminAppointments: [Appointment]
    }

    type Mutation {
        register(username: String!, password: String!, adminCode: String): User
        login(username: String!, password: String!): User
        addPet(name: String!, type: String!, image: Upload): Pet
        updatePet(id: ID!, name: String, type: String, image: Upload): Pet
        deletePet(id: ID!): Boolean
        bookAppointment(
            petId: ID!
            date: String!
            description: String!
        ): Appointment
        updateAppointment(
            id: ID!
            date: String
            description: String
            status: String
        ): Appointment
        deleteAppointment(id: ID!): Boolean
    }
`;
