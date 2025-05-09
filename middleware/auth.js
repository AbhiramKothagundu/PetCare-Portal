const jwt = require("jsonwebtoken");

module.exports = (req) => {
    try {
        let token = null;

        // First check authorization header
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }

        // Then check query parameter
        if (!token && req.query.token) {
            token = req.query.token;
        }

        if (!token) return null;

        // Verify and decode token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded token:", decoded); // For debugging

        if (!decoded.id || !decoded.role) {
            console.error("Invalid token structure");
            return null;
        }

        return decoded;
    } catch (err) {
        console.error("Token verification failed:", err.message);
        return null;
    }
};
