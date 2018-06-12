'use strict';

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const { JWT_SECRET, JWT_EXPIRY } = require('../config.js');

const options = {session: false, failWithError: true};
const localAuth = passport.authenticate('local', options);
const jwtAuth = passport.authenticate('jwt', options);

const router = express.Router();

// accepts user object and creates jwt token
const createAuthToken = function(user) {
  return jwt.sign({ user }, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
  });
};

// POST initial login info to exchange for jwt
router.post('/login', localAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
});

// POST exchange an existing jwt for a new jwt
router.post('/refresh', jwtAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
});

module.exports = router;
