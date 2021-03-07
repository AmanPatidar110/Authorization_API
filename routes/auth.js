const express = require('express');

const authController = require('../controller/auth');
const validator = require('../utils/validator');

const router = express.Router();

router.post('/:name/signup', validator.signupValidator, authController.postSignup);
router.post('/:email/signin', validator.signinValidator, authController.postSignin);

router.get('/:email/resetpassword', validator.signinValidator, authController.getResetPassword);
router.post('/:token/check', validator.signinValidator, authController.postResetPasswordTokenCheck);
router.post('/:user_id/setpassword', validator.signinValidator, authController.postSetPassword);


module.exports = router;