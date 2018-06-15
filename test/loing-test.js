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

describe.skip('Noteful API - Login', function() {
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

  describe('/api/login', function() {
    describe('POST', function() {

      it('Should return a valid jwt token when provided valid login credentials');
      it('Should reject a login when provided invalid credentials');

    });
  });

  describe('/api/refresh', function() {
    describe('POST', function() {

      it('Should return a new jwt token when provided a valid existing jwt token');
      it('Should reject a request for a new jwt token when provided an invalid jwt token');

    });
  });

});
