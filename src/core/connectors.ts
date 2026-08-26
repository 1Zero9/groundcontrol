import type { Event } from "./models";

export interface EventConnector {
  id: string;
  name: string;
  sync(): Promise<Event[]>;
}

class MockConnector implements EventConnector {
  constructor(public id: string, public name: string) {}
  async sync(): Promise<Event[]> { return []; }
}

export const connectorRegistry: EventConnector[] = [
  new MockConnector("clubzap", "ClubZap"),
  new MockConnector("ddsl", "DDSL"),
  new MockConnector("ical", "Generic iCal"),
];
