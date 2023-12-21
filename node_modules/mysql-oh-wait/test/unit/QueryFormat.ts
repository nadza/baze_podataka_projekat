import { expect } from 'chai';
import { Connection } from 'mysql';
import { logger } from 'saylo';
import QueryFormat from '../../src/QueryFormat';

const fakeEscape = { escape: (v: string) => `'${v}'`, };

describe(`QueryFormat`, function() {

  logger.turnOn('debug');

  describe(`QueryFormat.constructor(connection)`, function() {
    it('should be able to get a QueryFormat instance', async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat).to.be.an.instanceof(QueryFormat);
    });
  });

  describe(`QueryFormat.queryFormat(':ph1, :ph2', { ph1: 'a', ph2: 'b' })`, function() {
    const expected = "'a', 'b'";
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':ph1, :ph2', { ph1: 'a', ph2: 'b' })).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat('(:ph1, :ph2)', { ph1: 'a', ph2: 'b' })`, function() {
    const expected = "('a', 'b')";
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat('(:ph1, :ph2)', { ph1: 'a', ph2: 'b' })).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':?, :?', [ 'a', 'b' ])`, function() {
    const expected = "'a', 'b'";
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':?, :?', [ 'a', 'b' ])).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat('(:?, :?)', [ 'a', 'b' ])`, function() {
    const expected = "('a', 'b')";
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat('(:?, :?)', [ 'a', 'b' ])).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':ph1', { ph1: ['a', 'b'] })`, function() {
    const expected = "('a', 'b')";
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':ph1', { ph1: ['a', 'b'] })).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':ph1, :ph2', { ph1: ['a', 'b'], ph2: ['c', 'd'] })`, function() {
    const expected = "('a', 'b'), ('c', 'd')";
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':ph1, :ph2', { ph1: ['a', 'b'], ph2: ['c', 'd'] })).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':?', [ ['a', 'b'] ])`, function() {
    const expected = "('a', 'b')";
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':?', [ ['a', 'b'] ])).to.be.equal(expected);
    });
  });

  // Needs special case that knows it needs to pass the full values array instead of popping when single qmark in query
  describe(`QueryFormat.queryFormat(':?', [ ['a', 'b'], ['c', 'd'] ])`, function() {
    const expected = "('a', 'b'), ('c', 'd')";
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':?', [ ['a', 'b'], ['c', 'd'] ])).to.be.equal(expected);
    });
  });

  // Needs special case that knows it needs to pass the full values array instead of popping when single qmark in query
  describe(`QueryFormat.queryFormat(':?, :?', [ ['a', 'b'], ['c', 'd'] ])`, function() {
    const expected = "('a', 'b'), ('c', 'd')";
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':?, :?', [ ['a', 'b'], ['c', 'd'] ])).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':ph1', { ph1: [ ['a', 'b'], ['c', 'd'] ] })`, function() {
    const expected = "('a', 'b'), ('c', 'd')";
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':ph1', { ph1: [ ['a', 'b'], ['c', 'd'] ] })).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':?', { ph1: 'a', ph2: 'b'})`, function() {
    const expected = `ph1 = 'a' AND ph2 = 'b'`;
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':?', { ph1: 'a', ph2: 'b'})).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':?', { ph1: null, ph2: 'b'})`, function() {
    const expected = `ph1 IS NULL AND ph2 = 'b'`;
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':?', { ph1: null, ph2: 'b'})).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':ph1 and :ph2', { ph1: ['a', 'b'], ph2: 'c' } })`, function() {
    const expected = `('a', 'b') AND 'c'`;
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':ph1 AND :ph2', { ph1: ['a', 'b'], ph2: 'c' })).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':ph1 and :ph2', { ph1: [null, 'b'], ph2: 'c' })`, function() {
    const expected = `(NULL, 'b') AND 'c'`;
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      expect(queryFormat.queryFormat(':ph1 AND :ph2', { ph1: [null, 'b'], ph2: 'c' })).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.toMysqlDatetime(date)`, function() {
    const date1 = new Date(Date.parse('2020-03-01T09:40:16.767Z'));
    const expected = '2020-03-01 09:40:16';
    it(`should return ${expected}`, async function() {
      expect(QueryFormat.toMysqlDatetime(date1)).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':?', [['a', 'b', false, new Date()]['c', 'd', 1, new Date()]])`, function() {
    const date1 = new Date(Date.parse('2020-03-01T09:40:16.767Z'));
    const date2 = new Date(Date.parse('2020-04-01T09:40:16.767Z'));
    const expected = `('a', 'b', '0', '${QueryFormat.toMysqlDatetime(date1)}'), ('c', 'd', '1', '${QueryFormat.toMysqlDatetime(date2)}')`;
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      const vals =[['a', 'b', false, date1], ['c', 'd', 1, date2]];
      expect(queryFormat.queryFormat(':?', vals)).to.be.equal(expected);
    });
  });

  describe(`QueryFormat.queryFormat(':?', [['a', 'b', null, 4]['c', 'd', 'e', 33]])`, function() {
    const expected = `('a', 'b', NULL, '4'), ('c', 'd', 'e', '33')`;
    it(`should return ${expected}`, async function() {
      const queryFormat = new QueryFormat((fakeEscape as Connection));
      const vals =[['a', 'b', null, 4], ['c', 'd', 'e', 33]];
      expect(queryFormat.queryFormat(':?', vals)).to.be.equal(expected);
    });
  });

});
