'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server.js');

const Note = require('../models/note.js');
const Folder = require('../models/folder.js');
const Tag = require('../models/tag.js');
const User = require('../models/user.js');

const seedNotes = require('../db/seed/notes.json');
const seedFolders = require('../db/seed/folders.json');
const seedTags = require('../db/seed/tags.json');
const seedUsers = require('../db/seed/users.json');

const { TEST_MONGODB_URI, JWT_SECRET } = require('../config.js');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Noteful API - Notes', function() {

  before(function() {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  let user;
  let token;

  beforeEach(function() {
    return Promise
      .all(seedUsers.map(user => User.hashPassword(user.password)))
      .then(digests => {
        seedUsers.forEach((user, i) => user.password = digests[i]);
        return Promise
          .all([
            User.insertMany(seedUsers),
            User.createIndexes(),

            Folder.insertMany(seedFolders),
            Folder.createIndexes(),

            Tag.insertMany(seedTags),
            Tag.createIndexes(),
            
            Note.insertMany(seedNotes)
          ]);
      })
      .then(([users]) => {
        user = users[0];
        token = jwt.sign({ user }, JWT_SECRET, {subject: user.username});
      });
  });

  afterEach(function() {
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('GET /api/notes', function() {

    it('should return the correct number of Notes', function() {
      return Promise.all([
        Note
          .find({userId: user.id}),
        chai
          .request(app)
          .get('/api/notes')
          .set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return a list with the correct right fields', function() {
      return Promise
        .all([
          Note
            .find({userId: user.id})
            .sort({ updatedAt: 'desc' }),
          chai
            .request(app)
            .get('/api/notes')
            .set('Authorization', `Bearer ${token}`)
        ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(data.length);
          res.body.forEach((item, i) => {
            expect(item).to.be.an('object');
            // Note: folderId and content are optional
            expect(item).to.include.all.keys('id', 'title', 'createdAt', 'updatedAt', 'tags');
            expect(item.id).to.equal(data[i].id);
            expect(item.title).to.equal(data[i].title);
            expect(item.content).to.equal(data[i].content);
            expect(item.userId).to.equal(data[i].userId.toHexString()); // what
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
          });
        });
    });

    it('should return correct search results for a searchTerm query', function() {
      const searchTerm = 'ways';
      // const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note
        .find({
          userId: user.id,
          title: { $regex: searchTerm, $options: 'i' }
        // $or: [{ title: re }, { content: re }]
        });
      const apiPromise = chai
        .request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`)
        .set('Authorization', `Bearer ${token}`);

      return Promise
        .all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(1);
          res.body.forEach((item, i) => {
            expect(item).to.be.an('object');
            // Note: folderId and content are optional
            expect(item).to.include.all.keys('id', 'title', 'createdAt', 'updatedAt', 'tags', 'userId');
            expect(item.id).to.equal(data[i].id);
            expect(item.title).to.equal(data[i].title);
            expect(item.content).to.equal(data[i].content);
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
          });
        });
    });

    it('should return correct search results for a folderId query', function() {
      let data;
      return Folder
        .findOne({userId: user.id})
        .then((_data) => {
          data = _data;
          return Promise
            .all([
              Note
                .find({userId: user.id, folderId: data.id }),
              chai
                .request(app)
                .get(`/api/notes?folderId=${data.id}`)
                .set('Authorization', `Bearer ${token}`)
            ]);
        })
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return correct search results for a tagId query', function() {
      let data;
      return Tag
        .findOne({userId: user.id})
        .then((_data) => {
          data = _data;
          return Promise
            .all([
              Note
                .find({userId: user.id, tags: data.id }),
              chai
                .request(app)
                .get(`/api/notes?tagId=${data.id}`)
                .set('Authorization', `Bearer ${token}`)
            ]);
        })
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return an empty array for an incorrect query', function() {
      const searchTerm = 'NotValid';
      // const re = new RegExp(searchTerm, 'i');
      const dbPromise = Note
        .find({
          userId: user.id,
          title: { $regex: searchTerm, $options: 'i' }
        // $or: [{ title: re }, { content: re }]
        });
      const apiPromise = chai
        .request(app)
        .get(`/api/notes?searchTerm=${searchTerm}`)
        .set('Authorization', `Bearer ${token}`);
      return Promise
        .all([dbPromise, apiPromise])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('array');
          expect(res.body).to.have.length(data.length);
        });
    });

  });

  describe('GET /api/notes/:id', function() {

    it('should return correct notes', function() {
      let data;
      return Note
        .findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai
            .request(app)
            .get(`/api/notes/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.all.keys('id', 'title', 'content', 'createdAt', 'updatedAt', 'folderId', 'tags', 'userId');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(res.body.userId).to.equal(data.userId.toHexString()); // what
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should respond with status 400 and an error message when `id` is not valid', function() {
      return chai
        .request(app)
        .get('/api/notes/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is invalid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function() {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai
        .request(app)
        .get('/api/notes/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

  });

  describe('POST /api/notes', function() {

    it('should create and return a new item when provided valid data', function() {
      const newItem = {
        title: 'The best article about cats ever!',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...'
      };
      let res;
      return chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.all.keys('id', 'title', 'content', 'createdAt', 'updatedAt', 'folderId', 'tags', 'userId');
          return Note
            .findOne({userId: user.id, _id: res.body.id});
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(res.body.userId).to.equal(data.userId.toHexString()); // what
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return an error when missing "title" field', function() {
      const newItem = {
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...'
      };
      return chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });

    it('should return an error when `folderId` is not valid ', function() {
      const newItem = {
        title: 'What about dogs?!',
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...',
        folderId: 'NOT-A-VALID-ID'
      };
      return chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('The `folderId` is invalid');
        });
    });

    it('should return an error when a tags `id` is not valid ', function() {
      const newItem = {
        title: 'What about dogs?!',
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...',
        tags: ['NOT-A-VALID-ID']
      };
      return chai
        .request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('The tags `id` is invalid');
        });
    });

  });

  describe('PUT /api/notes/:id', function() {

    it('should update the note when provided valid data', function() {
      const updateItem = {
        title: 'What about dogs?!',
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...'
      };
      let data;
      return Note
        .findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/notes/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.all.keys('id', 'title', 'content', 'createdAt', 'updatedAt', 'folderId', 'tags', 'userId');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(updateItem.title);
          expect(res.body.content).to.equal(updateItem.content);
          expect(res.body.userId).to.equal(data.userId.toHexString()); // what
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect note to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should respond with status 400 and an error message when `id` is not valid', function() {
      const updateItem = {
        title: 'What about dogs?!',
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...'
      };
      return chai
        .request(app)
        .put('/api/notes/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is invalid');
        });
    });

    it('should respond with a 404 for an id that does not exist', function() {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      const updateItem = {
        title: 'What about dogs?!',
        content: 'Lorem ipsum dolor sit amet, sed do eiusmod tempor...'
      };
      return chai
        .request(app)
        .put('/api/notes/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when "title" is an empty string', function() {
      const updateItem = {
        title: ''
      };
      return Note
        .findOne({userId: user.id})
        .then(data => {
          return chai
            .request(app)
            .put(`/api/notes/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });

    it('should return an error when `folderId` is not valid ', function() {
      const updateItem = {
        folderId: 'NOT-A-VALID-ID',
        title: 'Sample Title'
      };
      return Note
        .findOne({userId: user.id})
        .then(data => {
          return chai
            .request(app)
            .put(`/api/notes/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('The `folderId` is invalid');
        });
    });

    it('should return an error when a tags `id` is not valid ', function() {
      const updateItem = {
        title: 'Sample Title',
        tags: ['NOT-A-VALID-ID']
      };
      return Note
        .findOne({userId: user.id})
        .then(data => {
          return chai
            .request(app)
            .put(`/api/notes/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('The tags `id` is invalid');
        });
    });

  });

  describe('DELETE /api/notes/:id', function() {

    it('should delete an existing document and respond with 204', function() {
      let data;
      return Note
        .findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai
            .request(app)
            .delete(`/api/notes/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(204);
          return Note
            .count({ _id: data.id });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

    it('should respond with a 400 for an invalid id', function() {
      return chai
        .request(app)
        .delete('/api/notes/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is invalid');
        });
    });

  });

});
