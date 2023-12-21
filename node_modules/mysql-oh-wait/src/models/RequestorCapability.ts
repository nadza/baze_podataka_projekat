import MysqlReq from "../MysqlReq";

let _requestor: MysqlReq | null = null;

export type InjectRequestorInterface = { requestor?: MysqlReq; }

export default class RequestorCapability {
  static inject({ requestor }: InjectRequestorInterface): void {
    requestor && RequestorCapability.setRequestor(requestor);
  }

  static setRequestor(requestor: MysqlReq): void {
    _requestor = requestor;
  }

  static getRequestor(): MysqlReq | never {
   if (!_requestor) {
      throw new Error('Must set requestor first');
    }
    return _requestor;
  }
}