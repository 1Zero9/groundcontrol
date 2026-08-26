export type FamilyMember = {
  id: string;
  name: string;
  shortName?: string;
  colour?: string;
  avatar?: string;
  role?: "adult" | "teen" | "child";
};

export type Event = {
  id: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay?: boolean;
  personIds: string[];
  category?: string;
  type?: string;
  location?: string;
  source: string;
  sourceId?: string;
  status?: "active" | "cancelled";
};

export type BoardItem = {
  id: string;
  text: string;
  personIds?: string[];
  createdAt: string;
  expiresAt?: string;
  countdownDate?: string;
  progressCurrent?: number;
  progressTotal?: number;
  pinned?: boolean;
};

export type GroundControlModule = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  status?: "installed" | "available" | "coming-soon";
};
