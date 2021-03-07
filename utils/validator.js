const {check} = require('express-validator');

exports.signupValidator = 
    [
    check('name')
        .isLength({max: 50})
        .not().isEmpty(),
    
    check('username')
        .trim()
        .isLength({min: 5, max: 50})
        .not().isEmpty()
        .toLowerCase(),

    check('email')
        .isEmail()
        .isLength({max: 50})
        .normalizeEmail()
        .not().isEmpty(),
        
    check('password')
        .trim()
        .isLength({min: 5})
        .not().isEmpty()
];

exports.signinValidator = 
   [
    check('email')
        .isEmail()
        // .withMessage('Email is wrong!')
        .isLength({max: 50})
        .normalizeEmail()
        .not().isEmpty(),
        
    check('password')
        .trim()
        .isLength({min: 5})
        .not().isEmpty()
];