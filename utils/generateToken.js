const jwt = require("jsonwebtoken");

module.exports = (user) => {
    return {
        token: jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d",
            }
        ),
        userData: jwt.sign(
            {
                id: user._id,
                username: user.username,
                role: user.role,
            },
            process.env.JWT_SECRET
        ),
    };
};
