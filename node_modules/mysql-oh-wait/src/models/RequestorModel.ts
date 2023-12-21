import RequestorCapability, { InjectRequestorInterface } from './RequestorCapability';
import { ReqQueryOptions } from '../MysqlReq';

export interface EventsInterface {
  emit: (eventName: string, data: any) => void;
}

export interface InjectRequestorEventsInterface extends InjectRequestorInterface {
  events?: EventsInterface;
}

let _events: EventsInterface | null = null;

export default class RequestorModel extends RequestorCapability {

  static inject({ events, requestor }: InjectRequestorEventsInterface) {
    requestor && RequestorCapability.inject({ requestor });
    events && RequestorModel.setEvents(events);
  }

  static setEvents(events: EventsInterface) {
    _events = events;
  }

  static getEvents(): EventsInterface {
    if (!_events) {
      throw new Error('Must set events first');
    }
    return _events;
  }

  static async query<RawReturnType, InferredTransformedType = RawReturnType>(params: ReqQueryOptions<RawReturnType, InferredTransformedType>) {

    const actionResult = await RequestorModel.getRequestor().query<RawReturnType, InferredTransformedType>(params);

    if (actionResult.error) {
      RequestorModel.getEvents().emit('RequestorModel:query:error', actionResult.error);
    }

    return actionResult;
  }

}
