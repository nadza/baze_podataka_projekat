import { expect } from 'chai';
import mysql from 'mysql';
import { logger } from 'saylo';
import uuidv4 from 'uuid/v4';
import MysqlReq from '../../src/MysqlReq';

describe(`MysqlReq`, function() {

  logger.turnOn('debug');
  logger.turnOff('debug');

  describe(`MysqlReq.constructor({adapter, logger, connectionConfig})`, function() {
    it('should be able to get an ActionResult', async function() {
      const config = {
        ...MysqlReq.extractConfigFromEnv(process.env),
        multipleStatements: false,
      };
      const req = new MysqlReq({
        adapter: mysql,
        connectionConfig: config
      });
      const actionResult = await req.connect();
      expect(typeof actionResult === 'object').to.be.true;
      expect(typeof actionResult.info !== undefined).to.be.true;
      await req.removeConnection();
    });

    it('should be able to connect with adapter and connectionConfig params', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        connectionConfig: config
      });
      const actionResult = await req.connect();
      expect(actionResult.value).to.be.a('number');
      await req.removeConnection();
    });

    it('should make ActionResult have an error property on wrong connection credentials confg', async function() {
      const config = {
        multipleStatements: false,
        database: 'wrongone',
        host: 'wrongone',
        user: 'wrongone',
        password: 'wrongone',
      };
      const req = new MysqlReq({
        adapter: mysql,
        connectionConfig: config
      });
      const actionResult = await req.connect();
      expect(actionResult.error).to.not.be.equal(null);
      await req.removeConnection();
    });

    it('should throw an error property on missing host connection confg construction', async function() {
      const { user, password } = MysqlReq.extractConfigFromEnv(process.env);
      const config = {
        multipleStatements: false,
        user,
        password
      };
      const shouldThrow = function() {
        new MysqlReq({
          adapter: mysql,
          connectionConfig: config
        });
      };
      expect(shouldThrow).to.throw();
    });

    it('should be able to set connectionConfig from constructor param', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      expect(req.getConnectionConfig()).to.be.deep.equal(config);
      await req.removeConnection();
    });

    it('should be able to set adapter from constructor param', async function() {
      const req = new MysqlReq({
        adapter: mysql,
      });
      expect(req.getAdapter()).to.be.equal(mysql);
      await req.removeConnection();
    });

    it('should be able to set logger from constructor param', async function() {
      const req = new MysqlReq({
        logger,
      });
      expect(req.getLogger()).to.be.equal(logger);
      await req.removeConnection();
    });

    it('should be able to connect without params if setAdapter() and setConnectionConfig() are called before', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq();
      req.setAdapter(mysql);
      req.setConnectionConfig(config);
      const actionResult = await req.connect()
      expect(actionResult.value).to.be.a('number');
      await req.removeConnection();
    });

    it('should not be connected on instantiation', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq();
      req.setAdapter(mysql);
      req.setConnectionConfig(config);
      expect(await req.isConnected()).to.be.equal(false);
      await req.removeConnection();
    });
  });

  describe(`MysqlReq.extractConfigFromEnv()`, function() {
    it('should be able to load connection config from env variables and return it', async function() {
      const env = {
        DB_HOST: 'localhost',
        DB_USER: 'user',
        DB_PASSWORD: 'password',
        DB_NAME: 'test_db',
        DB_CHARSET: 'utf8mb4',
        DB_COLLATION: 'utf8mb4_general_ci',
        MULTIPLE_STATEMENTS: 'true',
      };
      expect(MysqlReq.extractConfigFromEnv(env)).to.deep.equal({
        host: 'localhost',
        user: 'user',
        password: 'password',
        database: 'test_db',
        charset: 'utf8mb4',
        collation: 'utf8mb4_general_ci',
        multipleStatements: true,
      });
    });
    it('should be able to load multipleStatements "0" config from env and get proper boolean value', async function() {
      const env = {
        MULTIPLE_STATEMENTS: '0',
      };
      expect(MysqlReq.extractConfigFromEnv(env)).to.deep.equal({
        multipleStatements: false,
      });
    });
    it('should be able to load multipleStatements "false" config from env and get proper boolean value', async function() {
      const env = {
        MULTIPLE_STATEMENTS: 'false',
      };
      expect(MysqlReq.extractConfigFromEnv(env)).to.deep.equal({
        multipleStatements: false,
      });
    });
  });

  describe(`MysqlReq.setConnectionConfig()`, function() {
    it('should be able to set connection config and return it', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq();
      expect(req.setConnectionConfig(config)).to.deep.equal(config);
      await req.removeConnection();
    });
  });

  describe(`MysqlReq.getConnectionConfig()`, function() {
    it('should return connection config created with setConnectionConfig()', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq();
      req.setConnectionConfig(config);
      expect(req.getConnectionConfig()).to.deep.equal(config);
      await req.removeConnection();
    });
  });

  describe(`MysqlReq.removeConnection()`, async function() {
    it('should make MysqlReq.hasConnection() return false', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      await req.removeConnection();
      expect(req.hasConnection()).to.be.equal(false);
    });

    it('should make MysqlReq.hasConnection() return false even if connection was set priorly', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      const actionResult = await req.connect();
      expect(actionResult.value).to.be.a('number');
      await req.removeConnection();
      expect(req.hasConnection()).to.be.equal(false);
      await req.removeConnection();
    });

    it('should return false if there was no connection', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      await req.removeConnection();
      expect(await req.removeConnection()).to.be.equal(false);
      await req.removeConnection();
    });

    it('should return true if there was a connection', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      await req.removeConnection();
      await req.createConnection();
      expect(await req.removeConnection()).to.be.equal(true);
      await req.removeConnection();
    });
  });

  describe(`req.hasConnection()`, async function() {
    it('should return true if createConnection() is called before', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      await req.hasConnection() && await req.removeConnection();
      await req.createConnection();
      expect(req.hasConnection()).to.be.equal(true);
      await req.removeConnection();
    });

    it('should return false if removeConnection() is called before', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      await req.removeConnection();
      expect(req.hasConnection()).to.be.equal(false);
      await req.removeConnection();
    });
  });

  describe(`req.connect()`, async function() {
    it('should not reconnect if connectionConfig has not changed', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      await req.removeConnection();
      const actionResult = await req.connect();
      expect(actionResult.value).to.be.a('number');
      const actionResult2 = await req.connect();
      expect(actionResult2.value).to.be.a('number');
      expect(actionResult.value).to.be.equal(actionResult2.value);
      await req.removeConnection();
    });

    it('should not allow reseting connectionConfig if hasConnection', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const config2 = {
        multipleStatements: true,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      const actionResult = await req.connect();
      expect(actionResult.value).to.be.a('number');
      expect(() => req.setConnectionConfig(config2)).to.throw();
      await req.removeConnection();
    });
  });

  describe(`req.query()`, async function() {
    it('should return an array on select even if not connected priorly', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      await req.removeConnection();
      expect(req.hasConnection()).to.be.equal(false);

      const actionResult = await req.query<{ [k: string]: string; }[]>({ sql: 'SHOW TABLES' });

      expect(actionResult.value).to.be.an('array');
      expect(typeof actionResult.error === 'undefined').to.be.true;
      expect(actionResult.info.threadId).to.be.a('number');

      await req.removeConnection();
    });

    it('should have an error in ActionResult but not throw, on BAD SQL query error', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });

      const actionResult = await req.query({ sql: 'BAD SQL' });
      expect(typeof actionResult.value === 'undefined').to.be.true;
      expect(actionResult.error).to.not.be.undefined;
      expect(actionResult?.info?.threadId).to.be.a('number');

      await req.removeConnection();
    });

    it('return an array on select should be altered by "after" param', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger: logger,
        connectionConfig: config
      });
      await req.removeConnection();
      expect(req.hasConnection()).to.be.equal(false);
      const actionResult = await req.query<{ [k: string]: string; }[]>({ sql: 'SHOW TABLES' });
      const after = (_: any) => 'altered';
      expect(after(actionResult.value)).to.be.equal('altered');
      await req.removeConnection();
    });

    it('should be able to insert with special query format', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger,
        connectionConfig: config
      });
      await req.removeConnection();
      expect(req.hasConnection()).to.be.equal(false);
      const uniqueID = uuidv4().substring(0, 14);
      const actionResult = await req.query<{ insertId: number; }>({
        sql: 'INSERT INTO BookRepeated (title, author) VALUES :books',
        values: {
          books: [
            ['big lebowsky', uniqueID + '1'],
            ['smal blosky', uniqueID + '2'],
            ['random lebos', `'${uniqueID}'); SELECT * FROM Tag WHERE 1=1;`],
          ],
        },
      });
      console.log(actionResult.error);
      expect(actionResult.value?.insertId).to.be.a('number');
      await req.removeConnection();
    });

    it('should be able to insert with special :? query format', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger,
        connectionConfig: config
      });
      await req.removeConnection();
      expect(req.hasConnection()).to.be.equal(false);
      const uniqueID = uuidv4().substring(0, 14);
      const actionResult = await req.query<{ insertId: number; }>({
        sql: 'INSERT INTO BookRepeated (title, author) VALUES :?',
        values: [
          ['big lebowsky', uniqueID + '1'],
          ['smal blosky', uniqueID + '2'],
          ['random lebos', `'${uniqueID}'); SELECT * FROM Tag WHERE 1=1;`],
        ],
      });
      console.log(actionResult.error);
      expect(actionResult.value?.insertId).to.be.a('number');
      await req.removeConnection();
    });

    it('should be able to select with special query format non nested array no parents', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger,
        connectionConfig: config
      });
      await req.removeConnection();
      expect(req.hasConnection()).to.be.equal(false);
      const actionResult = await req.query<{ title: string; }[]>({
        sql: 'SELECT title FROM BookRepeated WHERE title IN :books',
        values: {
          books: ['big lebo;wsky', 'random lebos', `a'really'); SELECT * FROM Tag WHERE 1=1;` ],
        },
      });
      console.log(actionResult.error);
      expect(actionResult.value).to.be.an('array');
      await req.removeConnection();
    });

    it('should be able to select with sequential ? query format and 0 depth levels', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger,
        connectionConfig: config
      });
      await req.removeConnection();
      expect(req.hasConnection()).to.be.equal(false);
      const actionResult = await req.query<{ title: string; }[]>({
        sql: 'SELECT title FROM BookRepeated WHERE title IN (:?, :?) OR title = :?',
        values: [
          'aspeci;al',
          'random lebos',
          `a'really'); SELECT * FROM Tag WHERE 1=1;`
        ],
      });
      console.log(actionResult.error);
      expect(actionResult.value).to.be.an('array');
      await req.removeConnection();
    });

    it('should be able to select with sequential ? query format and mixed depth 1 and 0', async function() {
      const config = {
        multipleStatements: false,
        ...MysqlReq.extractConfigFromEnv(process.env),
      };
      const req = new MysqlReq({
        adapter: mysql,
        logger,
        connectionConfig: config
      });
      await req.removeConnection();
      expect(req.hasConnection()).to.be.equal(false);
      const actionResult = await req.query<[{ title: string}[], { ID: number; title: string; author: string; }[]]>({
        sql: 'SELECT title FROM BookRepeated WHERE title IN :? OR title = :?',
        values: [
          [
            'random lebos',
            'asuperreallyspec',
          ],
          `a'really'); SELECT * FROM Tag WHERE 1=1;`,
        ],
      });
      expect(actionResult.value).to.be.an('array');
      await req.removeConnection();
    });

  });
});
