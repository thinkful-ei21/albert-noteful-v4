'use strict';

const express = require('express');
const passport = require('passport');

const options = {session: false, failWithError: true};
const localAuth = passport.authenticate('local', options);

const router = express.Router();

// POST
router.post('/login', localAuth, (req, res) => {
  return res.json(req.user);
});

module.exports = router;
