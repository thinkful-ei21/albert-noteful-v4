'use strict';

const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config.js');

const Note = require('../models/note.js');
const User = require('../models/user.js');
const Folder = require('../models/folder.js');
const Tag = require('../models/tag.js');

const seedNotes = require('../db/seed/notes.json');
const seedUsers = require('../db/seed/users.json');
const seedFolders = require('../db/seed/folders.json');
const seedTags = require('../db/seed/tags.json');

console.log(`Connecting to mongodb at ${MONGODB_URI}`);
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.info('Dropping Database');
    return mongoose.connection.db.dropDatabase();
  })
  .then(() => {
    console.info('Seeding Database');
    return Promise.all([

      User.insertMany(seedUsers),
      User.createIndexes(),

      Note.insertMany(seedNotes),

      Folder.insertMany(seedFolders),
      Folder.createIndexes(),

      Tag.insertMany(seedTags),
      Tag.createIndexes()

    ]);
  })
  .then(() => {
    console.info('Disconnecting');
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    return mongoose.disconnect();
  });
