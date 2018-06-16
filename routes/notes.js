'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const Note = require('../models/note.js');
const Folder = require('../models/folder.js');
const Tag = require('../models/tag.js');

const router = express.Router();
const jwtAuth = passport.authenticate('jwt', { session: false, failWithError: true });

// Protects all endpoints, or each can be applied to specific handlers as below
// router.use(jwtAuth);

const validateFolderId = function(folderId, userId) {
  if (!folderId) {
    return Promise.resolve();
  }
  if (!mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error();
    err.message = 'The `folderId` is invalid';
    err.status = 400;
    return Promise.reject(err);
  }
  return Folder
    .count({ _id: folderId, userId })
    .then(count => {
      if (count === 0) {
        const err = new Error();
        err.message = 'The `folderId` is invalid';
        err.status = 400;
        return Promise.reject(err);
      }
    });
};

const validateTagIds = function(tags, userId) {
  if (tags === undefined) {
    return Promise.resolve();
  }
  if(!Array.isArray(tags)) {
    const err = new Error('The `tags` must be an array');
    err.status = 400;
    return Promise.reject(err);
  }

  const badIds = tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
  if (badIds.length) {
    const err = new Error('The tags `id` is invalid');
    err.status = 400;
    return Promise.reject(err);
  }
 
  return Tag
    .find( { $and: [{_id: { $in: tags }, userId }] })
    .then(results => {
      if(tags.length !== results.length) {
        const err = new Error('The tags array contains an invalid id');
        err.status = 400;
        return Promise.reject(err);
      }
    });
};

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', jwtAuth, (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const userId = req.user.id;

  let filter = {};

  if (userId) {
    filter.userId = userId;
  }
  if (searchTerm) {
    // filter.title = { $regex: searchTerm, $options: 'i' };
    // Mini-Challenge: Search both `title` and `content`
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }
  if (folderId) {
    filter.folderId = folderId;
  }
  if (tagId) {
    filter.tags = tagId;
  }

  Note
    .find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
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

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error();
    err.message = 'The `id` is invalid';
    err.status = 400;
    return next(err);
  }

  Note
    .findOne({_id: id, userId: userId})
    .populate('tags')
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
  const { title, content, folderId, tags = [] } = req.body;
  const userId = req.user.id;
  const newNote = { title, content, userId, folderId, tags };

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error();
    err.message = 'Missing `title` in request body';
    err.status = 400;
    return next(err);
  }
  if (!folderId) {
    newNote.folderId = null;
  }

  Promise
    .all([
      validateFolderId(folderId, userId),
      validateTagIds(tags, userId)
    ])
    .then(() => {
      return Note.create(newNote);
    })
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', jwtAuth, (req, res, next) => {
  const { id } = req.params;
  const { title, content, folderId, tags } = req.body;
  const userId = req.user.id;
  const updateNote = { title, content, userId, folderId, tags };

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error();
    err.message = 'The `id` is invalid';
    err.status = 400;
    return next(err);
  }
  if (!title) {
    const err = new Error();
    err.message = 'Missing `title` in request body';
    err.status = 400;
    return next(err);
  }
  if (tags) {
    const badIds = tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error();
      err.message = 'The tags `id` is invalid';
      err.status = 400;
      return next(err);
    }
  }
  if (!folderId) {
    updateNote.folderId = null;
  }

  Promise
    .all([
      validateFolderId(folderId, userId),
      validateTagIds(tags, userId)
    ])
    .then(() => {
      return Note
        .findByIdAndUpdate(id, updateNote, { new: true })
        .populate('tags');
    })
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

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', jwtAuth, (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error();
    err.message = 'The `id` is invalid';
    err.status = 400;
    return next(err);
  }

  Note
    .findOneAndRemove({_id: id, userId})
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
