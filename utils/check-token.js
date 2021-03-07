const { json } = require("body-parser");
const { JsonWebTokenError } = require("jsonwebtoken");

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

module.exports = (req, res, next) => {
    const token = req.get('Authorization');

    if(!token) {
        const error = new Error('Not Authenticated');
        error.statusCode = 401;
        throw error;
    }
    
    let decodedToken;
    console.log(token);

    try {
        decodedToken = jwt.verify(token, process.env.JWT_KEY);

        console.log(decodedToken);

    } catch(err) {
        err.statusCode = 500;
        throw err;
    }

    if(!decodedToken) {
        const error = new Error('Not Authenticated');
        error.statusCode = 401;
        throw error;
    }

    // console.log("Authorized");

    req.userId = decodedToken.userId;
    next();
}