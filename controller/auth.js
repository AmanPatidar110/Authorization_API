const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const { validationResult, query } = require('express-validator');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');


const dbConnection = require('../db');


const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: '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'
    }
}));



exports.postSignup = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('validation Failed');
        error.statusCode = 422;
        error.data = errors.array();
        return next(error);
    }


    const name = req.params.name;
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (await checkIfExists('email', email)) {
        const error = new Error('The entered email is already registered with us!');
        error.statusCode = 400;
        return next(error);
    }
    if (await checkIfExists('username', username)) {
        const error = new Error(`The username: ${username} already exists. Please choose a unique username.`);
        error.statusCode = 400;
        return next(error);
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    let query = `INSERT INTO users(name, username, email, password, created_on) 
                    VALUES('${name}', '${username}', '${email}', '${hashedPassword}', CURRENT_TIMESTAMP);`;

    try {
        let result = await dbConnection.query(query);

        if (result) {
            return res.status(201).json({
                message: "You are sucessfully Signed Up with us!"
            });
        }
    }
    catch (err) {
        if (!err.statusCode) statusCode = 500;
        return next(err);
    }
}

exports.postSignin = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const error = new Error('validation Failed');
        error.statusCode = 422;
        error.data = errors.array();
        return next(error);
    }

    const email = req.params.email;
    const password = req.body.password;

    if (await checkIfExists('email', email) == false) {
        const error = new Error('Your Email Id does not exists in our database!');
        error.statusCode = 400;
        return next(error);
    }

    let query = `SELECT * FROM users WHERE email = '${email}';`;

    try {
        // Get the user info from database and extract first from the returned rows
        const user = await (await dbConnection.query(query)).rows[0];
        const paswordFromDb = user.password;

        if (paswordFromDb) {
            // the user entered password is a plain string and paswordFromDb is a hashed string
            validPass = await bcrypt.compare(password, paswordFromDb);

            if (!validPass) {
                const error = new Error('Your entered password is incorrect!');
                error.statusCode = 400;
                return next(error);
            }

            // console.log(user);

            const token = jwt.sign({
                email: user.email,
                userId: user.user_id
            },
                process.env.JWT_KEY,
                { expiresIn: '1h' }
            );


            res.status(200).json({
                message: "Successfully LogedIn!",
                token: token,
                userId: user.user_id
            })

            query = `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = '${user.user_id}';`;

            await dbConnection.query(query);
        }
    }
    catch (err) {
        if (!err.statusCode) statusCode = 500;
        return next(err);
    }
}


exports.getResetPassword = async (req, res, next) => {
    const email = req.params.email;
    if (! await checkIfExists('email', email)) {
        return res.status(400).json({
            message: "Please enter a valid email!"
        });
    }

    let token;

    crypto.randomBytes(32, async (err, buffer) => {
        if (err) {
            console.log(err);
            if (!err.statusCode) err.statusCode = 500;
            return next(err);
        }
        token = buffer.toString('hex');
        console.log(token);

        if (!token) {
            const err = new Error('Server side error!');
            err.statusCode = 500;
            return next(err);
        }

        const TokenExpiration = new Date();
        TokenExpiration.setHours(TokenExpiration.getHours() + 1);
        console.log(TokenExpiration, typeof (TokenExpiration));

        let query = `UPDATE users SET reset_token = '${token}', reset_token_expiration = $1 WHERE email = '${email}';`;

        try {
            await dbConnection.query(query, [TokenExpiration]);

            result = await transporter.sendMail({
                to: email,
                from: 'aamanpatidar110@gmail.com',
                subject: 'Password Reset',
                html: `
              <p> You requested a password reset </p>
              <p> Click this <a href="http://localhost:3000/auth/reset/${token}/check">link</a> to set a new password. </p>
              <p> Note: The above link will be valid for 1 Hour. </p>
            `
            });

            res.json({ message: result.message + "!! A password reset link is sent to the entered email." });

        }
        catch (err) {
            if (!err.statusCode) statusCode = 500;
            console.log(err);
            return next(err);
        }


    });
}


exports.postResetPasswordTokenCheck = async (req, res, next) => {
    const token = req.params.token;

    const query = 'SELECT user_id, reset_token_expiration FROM users WHERE reset_token = $1';

    if (!await checkIfExists('reset_token', token)) {
        return res.status(400).json({
            message: "The requested query is invalid!"
        });
    }

    try {
        const result = await dbConnection.query(query, [token]);
        console.log(result);


        if (result.rows[0].reset_token_expiration < new Date()) {
            return res.status(400).json({
                message: "The time limit exceeded! Please request a new link to reset your password."
            });
        }

        res.status(200).json({
            message: "User is authenticated, proceed further.",
            user_id: result.rows[0].user_id,
            reset_token: token
        });
    }
    catch (err) {
        if (!err.statusCode) statusCode = 500;
        console.log(err);
        return next(err);
    }

}

exports.postSetPassword = async (req, res, next) => {
    const user_id = req.params.user_id;
    const token = req.body.token;
    const password = req.body.password;

    let query = `SELECT email FROM users WHERE user_id = '${user_id}'`;

    try {
        let result = await dbConnection.query(query);
        console.log(result.rows[0]);

        if (result.rows[0].reset_token_expiration < new Date()) {
            return res.status(400).json({
                message: "The time limit exceeded! Please request a new link to reset your password."
            });
        }

        query = 'UPDATE users SET password = $1 WHERE user_id = $2 AND reset_token = $3';
        result = await dbConnection.query(query, [password, user_id, token]);

        return res.status(200).json({
            message: "Your password has been reset successfully!"
        });
    }
    catch (err) {
        if (!err.statusCode) statusCode = 500;
        return next(err);
    }

}



const checkIfExists = async (column, value) => {
    let query = `SELECT 
                    exists 
                        (SELECT true FROM users WHERE ${column} = '${value}');`

    const result = await dbConnection.query(query);
    const exists = result.rows[0].exists;
    console.log(exists);
    return exists;

}