'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const Tag = require('../models/tag.js');
const Note = require('../models/note.js');

const router = express.Router();
const jwtAuth = passport.authenticate('jwt', { session: false, failWithError: true });

// Protects all endpoints, or each can be applied to specific handlers as below
// router.use(jwtAuth);

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', jwtAuth, (req, res, next) => {
  const userId = req.user.id;

  Tag
    .find({userId})
    .sort('name')
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', jwtAuth, (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is invalid');
    err.status = 400;
    return next(err);
  }

  Tag
    .findOne({_id: id, userId})
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', jwtAuth, (req, res, next) => {
  const userId = req.user.id;
  const { name } = req.body;

  const newTag = { name, userId };

  /***** Never trust users - validate input *****/
  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }
  if (!userId) {
    const err = new Error('Missing `userId` in request body');
    err.status = 400;
    return next(err);
  }

  Tag
    .create(newTag)
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('Tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', jwtAuth, (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is invalid');
    err.status = 400;
    return next(err);
  }
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('The `userId` is missing or invalid');
    err.status = 400;
    return next(err);
  }
  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  const updateTag = { name };

  Tag
    .findOneAndUpdate({_id: id, userId}, updateTag, { new: true })
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('Tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', jwtAuth, (req, res, next) => {
  const userId = req.user.id;
  const { id } = req.params;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is invalid');
    err.status = 400;
    return next(err);
  }

  const tagRemovePromise = Tag.findOneAndRemove({_id: id, userId});

  const noteUpdatePromise = Note.updateMany(
    { tags: id, },
    { $pull: { tags: id } }
  );

  Promise
    .all([tagRemovePromise, noteUpdatePromise])
    .then(() => {
      res
        .sendStatus(204)
        .end();
    })
    .catch(err => {
      next(err);
    });

});

module.exports = router;
