import { expect } from 'chai';
import MysqlDumpStatic from '../../src/MysqlDumpStatic';
import MysqlReq from '../../src';

describe(`MysqlDumpStatic`, function() {
  describe(`MysqlDumpStatic.executeSqlFile({filePath})`, function() {
    it('should execute sql in file with multiple statements on env connection settings and disconnect', async function() {
      const filePath = `${__dirname}/../../../test/unit/schema.sql`;
      await MysqlDumpStatic.executeSqlFile({filePath});
      expect(await MysqlDumpStatic.getRequestor().isConnected()).to.be.equal(false);
    });

    it('should execute sql in file with multiple statements with connection settings and disconnect', async function() {
      const filePath = `${__dirname}/../../../test/unit/schema.sql`;
      const connectionConfig = MysqlReq.extractConfigFromEnv(process.env, {
        host: 'DB_HOST',
        user: 'DB_USER',
        password: 'DB_PASSWORD',
        database: 'DB_NAME',
      });
      await MysqlDumpStatic.executeSqlFile({filePath, connectionConfig});
      expect(await MysqlDumpStatic.getRequestor().isConnected()).to.be.equal(false);
    });

    it('should execute sql in file with multiple statements with connection settings and not disconnect', async function() {
      const filePath = `${__dirname}/../../../test/unit/schema.sql`;
      const connectionConfig = MysqlReq.extractConfigFromEnv(process.env, {
        host: 'DB_HOST',
        user: 'DB_USER',
        password: 'DB_PASSWORD',
        database: 'DB_NAME',
      });
      await MysqlDumpStatic.executeSqlFile({filePath, connectionConfig, disconnectOnFinish: false});
      expect(await MysqlDumpStatic.getRequestor().isConnected()).to.be.equal(true);
      await MysqlDumpStatic.getRequestor().removeConnection();
    });
  });

  describe(`MysqlDumpStatic.inject({adapter})`, async function() {
    it('should change requestor if passed as param', function() {
      let req = MysqlDumpStatic.getRequestor();
      let other = new MysqlReq();
      MysqlDumpStatic.inject({ requestor: other });
      expect(MysqlDumpStatic.getRequestor()).to.be.equal(other);
      MysqlDumpStatic.inject({ requestor: req });
      expect(MysqlDumpStatic.getRequestor()).to.be.equal(req);
    });

    it('should change the logger if passed as param', async function() {
      let logger = MysqlDumpStatic.getLogger();
      let otherLogger = {
        debug: () => undefined,
        log: () => undefined,
      };
      MysqlDumpStatic.inject({ logger: otherLogger });
      expect(MysqlDumpStatic.getLogger()).to.be.equal(otherLogger);
      MysqlDumpStatic.inject({ logger });
      expect(MysqlDumpStatic.getLogger()).to.be.equal(logger);
    });

    it('should accept readFileSync if passed as param', async function() {
      const readFileSync = require('fs').readFileSync;
      const notThrow = () => MysqlDumpStatic.inject({ readFileSync });
      expect(notThrow).to.not.throw();
    });

    it('should accept existsSync if passed as param', async function() {
      const existsSync = require('fs').existsSync;
      const notThrow = () => MysqlDumpStatic.inject({ existsSync });
      expect(notThrow).to.not.throw();
    });
  });
});
