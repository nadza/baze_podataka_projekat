import { ConnectionConfig, Connection, MysqlError, QueryOptions, queryCallback } from 'mysql';
import { ActionResult } from './ActionResult';
import OhWaitError from './OhWaitError';
import QueryFormat, { Values } from './QueryFormat';

export interface ReqQueryOptions<RawType, TransformedType = RawType> extends QueryOptions {
  after?: (p: RawType) => TransformedType;
}

export type ExecutorParam = <S extends (value?: any) => any, T extends (reason?: any) => any>(resolve: S, reject: T) => void

export type RequiredConfigProps = {
  host: string;
  user: string;
  password: string;
  database: string;
}

export type UserProvidedEnvVarNames = {
  host: string;
  user: string;
  password: string;
  database: string;
  charset?: string;
  collation?: string;
  multipleStatements?: boolean;
};

export type ConfigPropsOptional = {
  host?: string;
  user?: string;
  password?: string;
  database?: string;
  charset?: string;
  collation?: string;
  multipleStatements?: boolean;
}

export type RequestorEnvVarNames = {
  host: 'DB_HOST';
  user: 'DB_USER';
  password: 'DB_PASSWORD';
  database: 'DB_NAME';
  charset: 'DB_CHARSET';
  collation: 'DB_COLLATION';
  multipleStatements: 'MULTIPLE_STATEMENTS',
}

export type ConnectionConfigOptions = {
  host: string | null;
  user: string | null;
  password: string | null;
  database: string | null;
  charset: string | null;
  collation: string | null;
};

export type ConnectionInfo = {
  threadId: number | null;
  connection: Connection | null;
  config: ConnectionConfig;
}

export declare type LoggerInterface = {
  debug: (...params: any[]) => void;
  log: (...params: any[]) => void;
}

export declare interface MysqlReqConstructor {
  new (config: ConnectionConfigOptions): MysqlReq;
  getDefaultEnvVarNames: () => RequestorEnvVarNames
  extractConfigFromEnv: (env: Object, envVarNames: RequestorEnvVarNames) => ConnectionConfigOptions;
  isMissingConfigProps: (config: ConnectionConfigOptions) => boolean;
}

export declare interface AdapterInterface {
  createConnection: (config: ConnectionConfig) => Connection;
}

export type MysqlReqConfig = {
  adapter?: AdapterInterface,
  logger?: LoggerInterface,
  connectionConfig?: ConnectionConfig
};

export type MysqlReqInjectProps = {
  adapter?: AdapterInterface;
  logger?: LoggerInterface;
  env?: any;
  envVarNames?: UserProvidedEnvVarNames;
};

export default class MysqlReq {
  public logger: LoggerInterface;
  public adapter: AdapterInterface | null;
  public connectionConfig: ConnectionConfig;
  public mysqlConnection: Connection | null;
  public lockedStatePromise: Promise<any> | null;
  public lockedStateId: string | null;

  constructor(config?: MysqlReqConfig) {
    const { adapter, logger, connectionConfig } = config || {};
    this.mysqlConnection = null;
    this.lockedStatePromise = null;
    this.lockedStateId = null;
    this.connectionConfig = {};
    this.adapter = null;
    this.logger = { log: () => undefined, debug: () => undefined, };

    logger && this.setLogger(logger);
    adapter && this.setAdapter(adapter);
    connectionConfig && this.setConnectionConfig(connectionConfig);
  }

  inject({ adapter, logger, env, envVarNames }: MysqlReqInjectProps) {
    adapter && this.setAdapter(adapter);
    logger && this.setLogger(logger);
    let config;
    if (envVarNames) {
      config = env && MysqlReq.extractConfigFromEnv(env, envVarNames);
    } else {
      config = env && MysqlReq.extractConfigFromEnv(env);
    }
    if (config) {
      this.setConnectionConfig(config);
    }
  }

  getActionResult<T>(props: { value: T; error?: MysqlError | OhWaitError; } | { value?: T; error: MysqlError | OhWaitError; }): ActionResult<T> {
    return {
      ...props,
      info: this.getConnectionInfo(),
    };
  }

  setAdapter(mysqlAdapter: AdapterInterface) {
    this.adapter = mysqlAdapter;
  }

  getAdapter() {
    if (null === this.adapter) {
      throw new Error('You must set the adapter first');
    }
    return this.adapter;
  }

  setLogger(logger: LoggerInterface): void {
    this.logger = logger;
  }

  getLogger() {
    if (null === this.logger) {
      throw new Error('You must set the logger first');
    }
    return this.logger;
  }

  setConnectionConfig(config: ConnectionConfig): ConnectionConfig | never  {
    if (this.hasConnection()) {
      throw new Error('Cannot change connection config while there is a connection, call an awating removeConnection() first.');
    }

    if (MysqlReq.isMissingConfigProps(config)) {
      console.log(config);
      throw new Error('Missing database connection config props');
    }

    this.connectionConfig = config;

    return this.connectionConfig;
  }

  getConnectionConfig(): ConnectionConfig {
    return this.connectionConfig;
  }

  createConnection(): void | never {
    if (null !== this.mysqlConnection) {
      throw new Error('Cannot create another connection');
    }
    const config = this.getConnectionConfig();
    if (MysqlReq.isMissingConfigProps(config)) {
      throw new Error('Must set full connection config before attempting to connect');
    }
    this.mysqlConnection = this.getAdapter().createConnection(config);
    this.attachQueryFormat();
    this.getLogger().debug(this.getThreadId(), 'this.createConnection(), Connection created', this.mysqlConnection);
  }

  attachQueryFormat(queryFormat?: { queryFormat: (query: string, values: Values) => string; }) {
    if (!this.hasConnection()) {
      throw new Error('Must createConnection first');
    }

    if (!this.mysqlConnection) {
      throw new Error('Connection must be provided for QueryFormat to be attached');
    }

    if (!queryFormat) {
      queryFormat = new QueryFormat(this.mysqlConnection);
    }

    this.mysqlConnection.config.queryFormat = function(query, values) {
      return (queryFormat as QueryFormat).queryFormat(query, values);
    };
  }

  hasConnection(): boolean {
    return this.mysqlConnection !== null;
  }

  getConnection(): Connection | never {
    if (this.mysqlConnection === null) {
      throw new Error('You must create a connection first');
    }
    return this.mysqlConnection;
  }

  async removeConnection(): Promise<boolean> {
    let didRemove = false;
    if (this.mysqlConnection) {
      await this.disconnect();
      this.mysqlConnection = null;
      this.getLogger().debug(this.getThreadId(), 'this.removeConnection(), Connection removed', this.mysqlConnection);
      didRemove = true;
    }
    return didRemove;
  }

  getThreadId(): number | null {
    return (this.hasConnection() && this.getConnection().threadId) || null;
  }

  async isConnected(): Promise<boolean> {
    if (!this.hasConnection()) {
      return false;
    } else if (null === this.getThreadId()) {
      await this.awaitLockStatePromises(`isConnected()`);
    }
    return this.hasConnection() && Number.isInteger(this.getThreadId() as any);
  }

  async connect() {

    if (!(await this.isConnected())) {
      if (!this.hasConnection()) {
        this.getLogger().debug(this.getThreadId(), 'this:connect(), No connection');
        this.createConnection();
      }

      this.getLogger().debug(this.getThreadId(), 'this:connect(), Connecting...');

      try {
        this.getLogger().debug(this.getThreadId(), 'this:connect(), locking');

        await this.lockUnlock('::connect()', (resolve, reject) => {
          this.getConnection().connect(err => ((err && reject(err)) || resolve(true)));
        });

        this.getLogger().debug(this.getThreadId(), `this:connect(), Connected to database, threadId: ${ this.getThreadId() }`);
      } catch (err) {
        this.getLogger().debug(this.getThreadId(), 'this:connect(), trouble connecting threw: ', err);
        return this.getActionResult<number|null>({ error: err as MysqlError });
      }
    }

    return this.getActionResult({ value: this.getThreadId() });
  }

  async disconnect() {
    type DidDisconnectRet = { didDisconnect: boolean; };

    if (await this.isConnected()) {
      this.getLogger().debug(this.getThreadId(), 'this:disconnect(), isConnected: true', this.getThreadId());
      try {
        this.getLogger().debug(this.getThreadId(), 'this:disconnect(), locking');

        await this.lockUnlock('::disconnect()', (resolve, reject) => {
          this.getConnection().end(err => ((err && reject(err)) || resolve(true)));
        });

        this.mysqlConnection = null;
        return this.getActionResult({ value: { didDisconnect: true } });
      } catch (err) {
        this.getLogger().debug(this.getThreadId(), 'this:disconnect(), difficulties disconnecting', err);
        return this.getActionResult<DidDisconnectRet>({ error: err as MysqlError, });
      }
    }

    if (await this.isConnected()) {
      return this.getActionResult<DidDisconnectRet>({ error: new OhWaitError('Weird error, still connected after disconnect attempt'), })
    }

    return this.getActionResult({ value: { didDisconnect: false } });
  }

  /**
   * Do not manually set the second param type InferredTransformedType,
   * it is inferred from the after callback when provided
   * @param param0
   * @returns
   */
  async query<RawReturnType, InferredTransformedType = RawReturnType>({ sql, values, after }: ReqQueryOptions<RawReturnType, InferredTransformedType>): Promise<ActionResult<InferredTransformedType>> {

    try {

      if (!(await this.isConnected())) {
        this.getLogger().debug(this.getThreadId(), 'this.query() You did not connect manually, attempting automatic connection');
        const connectResult = await this.connect();
        if (connectResult.error) {
          this.getLogger().debug(this.getThreadId(), 'this.query() Automatic connection attempt failed, cannot continue with query');
          throw connectResult.error;
        }
      }

      const connection = this.getConnection();
      const result: RawReturnType = await this.waitForLocks('::query():' + sql, (resolve, reject) => {
        const cb: queryCallback = (err, result) => err ? reject(err) : resolve(result);
        values ? connection.query(sql, values, cb) : connection.query(sql, cb);
      }) as RawReturnType;

      if (typeof after !== 'undefined') {
        return this.getActionResult({ value: after(result) });
      }

      return this.getActionResult({ value: result as unknown as InferredTransformedType });

    } catch (err) {
      this.getLogger().debug(this.getThreadId(), 'this.query() failed', err);
      return this.getActionResult({ error: err as MysqlError });
    }
  }

  getConnectionInfo(): ConnectionInfo {
    return {
      threadId: this.getThreadId(),
      connection: (this.hasConnection() && this.getConnection()) || null,
      config: this.getConnectionConfig(),
    };
  }

  async awaitLockStatePromises(from: string) {

    if (!this.isLocked()) {
      this.getLogger().debug(this.getThreadId(), `this:awaitLockStatePromises(${from}), not locked`);
      return;
    }

    try {
      this.getLogger().debug(this.getThreadId(), `this:awaitLockStatePromises(${from}), start for: `, this.lockedStateId);
      await this.lockedStatePromise;
      this.getLogger().debug(this.getThreadId(), `this:awaitLockStatePromises(${from}), finished waiting this.lockedStatePromise`);
    } catch (err) {
      this.getLogger().debug(this.getThreadId(), `this:awaitLockStatePromises(${from}), error`, err);
    }

    try {
      this.getLogger().debug(this.getThreadId(), `this:awaitLockStatePromises(${from}), unlocking, for :`, this.lockedStateId);
      this.unlock();
    } catch (err) {
      this.getLogger().debug(this.getThreadId(), `this:awaitLockStatePromises(${from}), unlocking error`, err);
    }

  }

  async waitForLocks(identifier: string, executor: ExecutorParam) {

    await this.awaitLockStatePromises(`lockUnlock(${identifier})`);

    if (this.isLocked()) {
      throw new Error('this:lockUnlock() weird state, should not be locked')
    }

    const p = new Promise(executor);
    this.getLogger().debug(this.getThreadId(), 'this:waitForLocks(), will create non lock promise:', p);
    const res = await p;
    this.getLogger().debug(this.getThreadId(), 'this:waitForLocks(), stopped awaiting non lock promise:', p);

    return res;
  }

  async lockUnlock(identifier: string, executor: ExecutorParam) {

    await this.awaitLockStatePromises(`lockUnlock(${identifier})`);

    if (this.isLocked()) {
      throw new Error('this:lockUnlock() weird state, should not be locked')
    }

    this.lockedStateId = identifier;
    this.getLogger().debug(this.getThreadId(), 'this:lockUnlock(), creating lockedStatePromise for:', this.lockedStateId);
    this.lockedStatePromise = new Promise(executor);
    this.getLogger().debug(this.getThreadId(), 'this:lockUnlock(), this.lockedStatePromise:', this.lockedStatePromise);

    const res = await this.lockedStatePromise;

    this.unlock();

    return res;
  }

  unlock() {
    this.getLogger().debug(this.getThreadId(), 'this:unlock(), for:', this.lockedStateId);
    this.lockedStateId = null;
    this.lockedStatePromise = null;
    this.getLogger().debug(this.getThreadId(), 'this:unlock(), this.lockedStatePromise:', this.lockedStatePromise);
  }

  isLocked() {
    if (this.lockedStatePromise !== null) {
      this.getLogger().debug(this.getThreadId(), 'this:isLocked(), with :', this.lockedStateId);
      return true;
    } else {
      return false;
    }
  }

  static getDefaultEnvVarNames(): RequestorEnvVarNames {
    return {
      host: 'DB_HOST',
      user: 'DB_USER',
      password: 'DB_PASSWORD',
      database: 'DB_NAME',
      charset: 'DB_CHARSET',
      collation: 'DB_COLLATION',
      multipleStatements: 'MULTIPLE_STATEMENTS',
    };
  }

  static extractConfigFromEnv(env: any, envVarNames?: UserProvidedEnvVarNames): ConfigPropsOptional {
    const envVNames = envVarNames || MysqlReq.getDefaultEnvVarNames();
    const convertToBoolean = { multipleStatements: true };
    const config: ConfigPropsOptional = Object.keys(envVNames).reduce((res, mysqljsConfKey, i) => {
      const envVarName = (envVNames as { [k: string]: string; })[mysqljsConfKey];
      return (envVarName && env[envVarName] !== undefined)
      ? {
        ...res,
        [mysqljsConfKey]: convertToBoolean.hasOwnProperty(mysqljsConfKey)
          ? !(env[envVarName] === 'false' || env[envVarName] === '0')
          : env[envVarName],
      }
      : {
        ...res,
      };
    }, {});

    return config;
  }

  static isMissingConfigProps(config: ConfigPropsOptional): boolean {
    const requiredProps = ['host', 'user', 'password', 'database'];
    const missingProps = requiredProps.filter(prop => !config.hasOwnProperty(prop));
    return missingProps.length > 0;
  }

}

// TODO Desired usage
// (async function () {
// const a = new MysqlReq();
//   // const r1: Promise<ActionResult<number>>
//   const r1 = a.query<{ a: string, b: string }[]>({
//     sql: `
//     // some sql query returning rows of a, b
//     `,
//     values: { userUUID: '' },
//     after: (res: { a: string, b: string }[]) => {
//       return 21;
//     },
//   });

//   // const r2: ActionResult<{
//   //   a: string;
//   //   b: string;
//   // }[]>
//   const r2 = await a.query<{ a: string, b: string }[]>({
//     sql: `
//     // some sql query returning rows of a, b
//     `,
//     values: { userUUID: '' },
//   });
// })