'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server.js');

const User = require('../models/user.js');

const { TEST_MONGODB_URI, JWT_SECRET } = require('../config.js');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Noteful API - Login', function() {

  before(function() {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  // user info for testing
  const _id = '999999999999999999999999';
  const fullname = 'John Doe';
  const username = 'testuser';
  const password = 'testpassword';

  beforeEach(function() {
    return User
      .hashPassword(password)
      .then(digest => User.create({
        _id,
        fullname,
        username,
        password: digest
      }));
  });

  afterEach(function() {
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('/api/login', function() {
    describe('POST', function() {

      it('Should return a valid jwt token when provided valid login credentials', function() {
        return chai
          .request(app)
          .post('/api/login')
          .send({ username, password })
          .then(res => {
            const token = res.body.authToken;
            const payload = jwt.verify(token, JWT_SECRET, {algorithm: ['HS256']});
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('object');
            expect(res.body.authToken).to.be.a('string');
            expect(payload.user.id).to.equal(_id);
            expect(payload.user.fullname).to.equal(fullname);
            expect(payload.user.username).to.equal(username);
          });
      });

      it('Should reject a login when username is invalid', function() {
        return chai
          .request(app)
          .post('/api/login')
          .send({ username: 'invalidUser', password })
          .then(res => {
            expect(res).to.have.status(401);
            expect(res).to.be.json;
            expect(res.body.message).to.equal('Unauthorized');
          });
      });

      it('Should reject a login when username is an empty string', function() {
        return chai
          .request(app)
          .post('/api/login')
          .send({ username: '', password })
          .then(res => {
            expect(res).to.have.status(400);
          });
      });

      it('Should reject a login when username is missing', function() {
        return chai
          .request(app)
          .post('/api/login')
          .send({ password })
          .then(res => {
            expect(res).to.have.status(400);
          });
      });

      it('Should reject a login when password is invalid', function() {
        return chai
          .request(app)
          .post('/api/login')
          .send({ username, password: 'invalidPassword' })
          .then(res => {
            expect(res).to.have.status(401);
            expect(res).to.be.json;
            expect(res.body.message).to.equal('Unauthorized');
          });
      });

      it('Should reject a login when passowrd is an empty string', function() {
        return chai
          .request(app)
          .post('/api/login')
          .send({ username, password: '' })
          .then(res => {
            expect(res).to.have.status(400);
          });
      });

      it('Should reject a login when username is missing', function() {
        return chai
          .request(app)
          .post('/api/login')
          .send({ password })
          .then(res => {
            expect(res).to.have.status(400);
          });
      });

      it('Should reject a login when credentials are missing', function() {
        return chai
          .request(app)
          .post('/api/login')
          .send({})
          .then(res => {
            expect(res).to.have.status(400);
          });
      });

    });
  });

  describe('/api/refresh', function() {
    describe('POST', function() {

      it('Should return a new jwt token with a newer expiry date when provided a valid existing jwt token', function() {
        const user = { _id, fullname, username };
        const token = jwt.sign(
          { user },
          JWT_SECRET,
          {algorithm: 'HS256', subject: username, expiresIn: '5s'}
        );
        const decodedToken = jwt.decode(token);
        return chai
          .request(app)
          .post('/api/refresh')
          .set('Authorization', `Bearer ${token}`)
          .then(res => {
            const newToken = res.body.authToken;
            const payload = jwt.verify(newToken, JWT_SECRET, {algorithm: ['HS256']});
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('object');
            expect(newToken).to.be.a('string');
            expect(payload.user._id).to.equal(_id);
            expect(payload.user.fullname).to.equal(fullname);
            expect(payload.user.username).to.equal(username);
            expect(payload.exp).to.be.at.least(decodedToken.exp);
          });
      });

      it('Should reject a request for a new jwt token when existing token is invalid', function() {
        const user = { _id, fullname, username };
        const NOT_JWT_SECRET = 'some-randome-text';
        const invalidToken = jwt.sign(
          { user },
          NOT_JWT_SECRET,
          {algorithm: 'HS256', subject: username, expiresIn: '7d'}
        );
        return chai
          .request(app)
          .post('/api/refresh')
          .set('Authorization', `Bearer ${invalidToken}`)
          .then(res => {
            expect(res).to.have.status(401);
            expect(res).to.be.json;
            expect(res.body.message).to.equal('Unauthorized');
          });
      });

      it('Should reject a request for a new jwt token when existing token is expired', function() {
        const user = { _id, fullname, username };
        const invalidToken = jwt.sign(
          { user },
          JWT_SECRET,
          {algorithm: 'HS256', subject: username, expiresIn: '0s'}
          // review above
        );
        return chai
          .request(app)
          .post('/api/refresh')
          .set('Authorization', `Bearer ${invalidToken}`)
          .then(res => {
            expect(res).to.have.status(401);
            expect(res).to.be.json;
            expect(res.body.message).to.equal('Unauthorized');
          });
      });

    });
  });

});
