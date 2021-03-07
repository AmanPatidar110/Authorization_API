const express = require('express');
const checkToken = require('../utils/check-token');

const userController = require("../controller/user");
const router = express.Router();
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
      api_key: SENDGRID_KEY
    }
  }));


router.get('/courses', checkToken, userController.getCourses);


module.exports = router;