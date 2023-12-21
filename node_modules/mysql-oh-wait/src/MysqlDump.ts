import { readFileSync, existsSync } from "fs";
import { LoggerInterface } from "./MysqlReq";
import { MysqlReq } from ".";
import { ConnectionConfig } from "mysql";

export type InjectProps = {
  requestor?: MysqlReq;
  logger?: LoggerInterface
  readFileSync?: typeof readFileSync;
  existsSync?: typeof existsSync;
}

export interface ExecuteSqlFileOptProps {
  filePath: string;
  disconnectOnFinish?: boolean;
  connectionConfig?: ConnectionConfig;
}

class MysqlDump {

  private logger: LoggerInterface | null = { log: () => undefined, debug: () => undefined };
  private requestor: MysqlReq | null = null;
  private readFileSync: typeof readFileSync | null = null;
  private existsSync: typeof existsSync | null = null;

  inject({ requestor, logger, readFileSync, existsSync }: InjectProps) {
    logger && this.setLogger(logger);
    requestor && this.setRequestor(requestor);
    this.readFileSync = readFileSync || null;
    this.existsSync = existsSync || null;
  }

  setRequestor(req: MysqlReq): void {
    this.requestor = req;
  }

  getRequestor(): MysqlReq | never {
    if (!this.requestor) {
      throw new Error('Must set Requestor first');
    }
    return this.requestor;
  }

  setLogger(logger: LoggerInterface) {
    this.logger = logger;
  }

  getLogger(): LoggerInterface | never {
    if (null === this.logger) {
      throw new Error('You must set the logger first');
    }
    return this.logger;
  }


  async executeSqlFileOnExistingConnection({ filePath, disconnectOnFinish }: ExecuteSqlFileOptProps ): Promise<void> {
    if (!this.existsSync || !this.readFileSync ) {
      throw new Error('Need to pass existsSync, and readFileSync to MysqlDum.inject');
    }
    if (!this.existsSync(filePath)) {
      throw new Error('File path does not exists ');
    }
    this.getLogger().log('executeSchemaOntoExistingConnection');
    await this.getRequestor().query({
      sql: this.readFileSync(filePath, 'utf-8'),
    });

    if (disconnectOnFinish) {
      await this.getRequestor().disconnect();
    }
  }

  async executeSqlFile({ filePath, connectionConfig, disconnectOnFinish }: ExecuteSqlFileOptProps): Promise<void>  {
    if (!this.logger) {
      throw new Error('Must set logger before calling MysqlDump.executeSqlFile');
    }

    this.logger.log(`MysqlDump:executeSqlFile(${filePath})`);

    if (!connectionConfig) {
      connectionConfig = process.env
        ? MysqlReq.extractConfigFromEnv(process.env)
        : {};
    }

    this.getRequestor().setConnectionConfig({
      ...connectionConfig,
      multipleStatements: true,
    });

    await this.executeSqlFileOnExistingConnection({
      filePath,
      disconnectOnFinish: disconnectOnFinish === undefined
        ? true
        : disconnectOnFinish
    });
  }
}

export default MysqlDump;
