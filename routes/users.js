'use strict';

const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user.js');

const router = express.Router();

// POST (create) a new user
router.post('/users', (req, res, next) => {
  const { fullname, username, password } = req.body;
  return User
    .hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname
      };
      return User.create(newUser);
    })
    .then(result => {
      return res.status(201).location(`/api/users/${result.id}`).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;
