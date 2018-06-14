'use strict';

const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

// Compound index, this makes sure that unique tag name applies to only one user
// the 1 there is an option for true, do not use the true keyword
tagSchema.index({ name: 1, userId: 1 }, { unique: true });

// Add `createdAt` and `updatedAt` fields
tagSchema.set('timestamps', true);

// Customize output for `res.json(data)`, `console.log(data)` etc.
tagSchema.set('toObject', {
  virtuals: true, // include built-in virtual `id`
  versionKey: false, // remove `__v` version key
  transform: (doc, ret) => {
    delete ret._id; // delete `_id`
  }
});

module.exports = mongoose.model('Tag', tagSchema);
