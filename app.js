require("dotenv").config();

// Validate required environment variables
const requiredEnvVars = ["MONGO_URI", "JWT_SECRET"];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Error: ${envVar} is not set in environment variables`);
        process.exit(1);
    }
}

const express = require("express");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");
const app = express();

// DB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
    session({
        secret: process.env.SESSION_SECRET || "petcare123",
        resave: false,
        saveUninitialized: false,
    })
);

// Custom middlewares
app.use(require("./middleware/logger"));
app.use(require("./middleware/rateLimiter"));

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Auth middleware
const auth = require("./middleware/auth");

// GraphQL
const { ApolloServer } = require("apollo-server-express");
const { GraphQLUpload, graphqlUploadExpress } = require("graphql-upload");
const typeDefs = require("./graphql/shema");
const resolvers = require("./graphql/resolvers");

// Add this before Apollo Server setup
app.use(graphqlUploadExpress());

const upload = require("./middleware/upload");

// Add this before your routes
app.post("/upload", auth, upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ filename: req.file.filename });
});

// Routes
app.get("/", (req, res) => res.redirect("/login"));
app.get("/login", (req, res) => res.render("auth/login"));
app.get("/register", (req, res) => res.render("auth/register"));

app.get("/logout", (req, res) => {
    res.render("auth/login", {
        script: `
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
        `,
    });
});

app.get("/user/dashboard", (req, res) => {
    try {
        const user = auth(req);
        console.log("User auth result:", user); // For debugging

        if (!user) {
            console.log("No user found, redirecting to login");
            return res.redirect("/login");
        }

        if (user.role === "admin") {
            console.log("Admin user, redirecting to admin dashboard");
            return res.redirect("/admin/dashboard");
        }

        console.log("Regular user, rendering user dashboard");
        res.render("user/dashboard", { user });
    } catch (err) {
        console.error("Dashboard error:", err);
        res.redirect("/login");
    }
});

app.get("/admin/dashboard", (req, res) => {
    try {
        const user = auth(req);
        console.log("Admin auth result:", user); // For debugging

        if (!user) {
            console.log("No user found, redirecting to login");
            return res.redirect("/login");
        }

        if (user.role !== "admin") {
            console.log("Non-admin user, redirecting to user dashboard");
            return res.redirect("/user/dashboard");
        }

        console.log("Admin user, rendering admin dashboard");
        res.render("admin/dashboard", { user });
    } catch (err) {
        console.error("Dashboard error:", err);
        res.redirect("/login");
    }
});

async function startApolloServer() {
    const server = new ApolloServer({
        typeDefs,
        resolvers: {
            Upload: GraphQLUpload,
            ...resolvers,
        },
        context: ({ req }) => {
            const user = auth(req);
            return { user };
        },
    });

    await server.start();
    server.applyMiddleware({ app });
}

startApolloServer();

app.listen(process.env.PORT || 4000, () =>
    console.log(
        `Server running at http://localhost:${process.env.PORT || 4000}`
    )
);
