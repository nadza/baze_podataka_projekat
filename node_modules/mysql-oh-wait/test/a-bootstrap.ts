import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import mysql from 'mysql';
import { logger } from 'saylo';

import MysqlReq from '../src/MysqlReq';
import MysqlDump from '../src/MysqlDumpStatic';
import { expect } from 'chai';

const injectDependencies = function () {
  logger.turnOff('log');
  logger.turnOff('debug');
  logger.log('injectingDependencies');
  const mysqlReq = new MysqlReq();
  mysqlReq.inject({ adapter: mysql, logger, env: process.env });
  MysqlDump.inject({ requestor: mysqlReq, logger, readFileSync, existsSync });
}

let bootstrapped = false;
describe('Global Bootstrapping', function() {

  before(async () => {
    injectDependencies();
    bootstrapped = true;
  });

  it('bootstraps properly', function () {
    expect(bootstrapped).to.be.equal(true);
  });

});
