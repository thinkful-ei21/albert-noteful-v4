'use strict';

const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user.js');

const router = express.Router();

// POST (create) a new user
router.post('/users', (req, res, next) => {
  const { fullname, username, password } = req.body;

  // verify required fields exist
  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(
    field =>
      !(field in req.body));

  if(missingField) {
    const err = new Error();
    err.message = `Missing '${missingField}' in request body`;
    err.status = 422;
    return next(err);
  }

  // verify field data type
  const stringFields = ['username', 'password', 'fullname'];
  const nonStringField = stringFields.find(
    field =>
      field in req.body && typeof req.body[field] !== 'string'
  );

  if(nonStringField) {
    const err = new Error();
    err.message = 'Incorrect field type: expected string';
    err.status = 422;
    return next(err);
  }

  // verify all fields have no whitespace
  const explicityTrimmedFields = ['username', 'password'];
  const nonTrimmedField = explicityTrimmedFields.find(
    field =>
      req.body[field].trim() !== req.body[field]);

  if(nonTrimmedField) {
    const err = new Error();
    err.message = 'Cannot start or end with whitespace';
    err.status = 422;
    return next(err);
  }

  // verify field lengths
  const sizedFields = {
    username: {
      min: 6
    },
    password: {
      min: 8,
      max: 72
    }
  };
  const tooSmallField = Object.keys(sizedFields).find(
    field =>
      'min' in sizedFields[field] && req.body[field].trim().length < sizedFields[field].min
  );
  const tooLargeField = Object.keys(sizedFields).find(
    field =>
      'max' in sizedFields[field] && req.body[field].trim().length > sizedFields[field].max
  );

  if(tooSmallField || tooLargeField) {
    const err = new Error();
    err.message = 'Field too long or too short...?';
    err.status = 422;
    return next(err);
    // return res.status(422).json({
    //   code: 422,
    //   reason: 'ValidationError',
    //   message: tooSmallField
    //     ? `Must be at least ${sizedFields[tooSmallField]
    //       .min} characters long`
    //     : `Must be at most ${sizedFields[tooLargeField]
    //       .max} characters long`,
    //   location: tooSmallField || tooLargeField
    // });
  }

  // all validations passed, hash password and create user
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
      return res
        .status(201)
        .location(`/api/users/${result.id}`)
        .json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error();
        err.message = 'The username already exists';
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;
