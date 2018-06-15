'use strict';

// Clear the console before each run
// process.stdout.write("\x1Bc\n");

const chai = require('chai');
const chaiHttp = require('chai-http');

const app = require('../server.js');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Reality Check', function() {

  it('true should be true', function() {
    expect(true).to.be.true;
  });

  it('2 + 2 should equal 4', function() {
    expect(2 + 2).to.equal(4);
  });

});

describe('Environment', function() {

  it('NODE_ENV should be "test"', function() {
    expect(process.env.NODE_ENV).to.equal('test');
  });

});

describe('Basic Express setup', function() {

  describe('Express static', function() {

    it('GET request "/" should return the index page', function() {
      return chai
        .request(app)
        .get('/')
        .then(res => {
          expect(res).to.exist;
          expect(res).to.have.status(200);
          expect(res).to.be.html;
        });
    });

  });

  describe('404 handler', function() {

    it('should respond with 404 when given a bad path', function() {
      return chai
        .request(app)
        .get('/bad/path')
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

  });
});
