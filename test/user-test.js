'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server.js');

const User = require('../models/user.js');

const { TEST_MONGODB_URI } = require('../config.js');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Noteful API - Users', function() {
  const username = 'exampleUser';
  const password = 'examplePassword';
  const fullname = 'Example User';

  before(function() {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function() {
    return User.createIndexes();
  });

  afterEach(function() {
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('/api/users', function() {
    describe('POST', function() {
      it('Should create a new user', function() {
        const testUser = { username, password, fullname };

        let res;
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(_res => {
            res = _res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullname', 'createdAt');

            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullname).to.equal(testUser.fullname);

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(res.body.id);
            expect(user.fullname).to.equal(testUser.fullname);
            return user.validatePassword(password);
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });
      it('Should reject users with missing username', function() {
        const testUser = { fullname, password };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Missing \'username\' in request body');
          });
      });
      it('Should reject users with missing password', function() {
        const testUser = { fullname, username };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Missing \'password\' in request body');
          });
      });
      it('Should reject users with non-string username', function() {
        const testUser = { username: 123456, password };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Incorrect field type: expected string');
          });
      });
      it('Should reject users with non-string password', function() {
        const testUser = { username, password: 123456 };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Incorrect field type: expected string');
          });
      });
      it('Should reject users with non-trimmed username', function() {
        const testUser = { username: ' testUser', password };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Cannot start or end with whitespace');
          });
      });
      it('Should reject users with non-trimmed password', function() {
        const testUser = { username, password: ' 123456' };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Cannot start or end with whitespace');
          });
      });
      it('Should reject users with empty username', function() {
        const testUser = { username: '', password };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Field: \'username\' must be at least 6 characters long');
          });
      });
      it('Should reject users with password less than 8 characters', function() {
        const testUser = { username, password: '123' };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Field: \'password\' must be at least 8 characters long');
          });
      });
      it('Should reject users with password greater than 72 characters', function() {
        const testUser = { username, password: 'mwahahahhahahahahahahhahahahahahahahahahahahhahahahahahahahahhahahahahahahahhahahahahahahahhahahahahahahahahahahhahahahahahaha' };
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(422);
            expect(res.body.message).to.equal('Field: \'password\' must be at most 72 characters long');
          });
      });
      it('Should reject users with duplicate username', function() {
        const testUser = { username, password, fullname };
        return User
          .create(testUser)
          .then(() => {
            return chai
              .request(app)
              .post('/api/users')
              .send(testUser)
              .then(res => {
                expect(res).to.have.status(400);
              });
          });
      });
      it('Should trim fullname', function() {
        const testUser = { username, password, fullname: '        Alfred Pennyworth       '};
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(res => {
            expect(res).to.have.status(201);
            expect(res.body.fullname).to.equal('Alfred Pennyworth');
          });
      });
    });
  });
});
