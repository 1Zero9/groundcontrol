import type { BoardItem, Event, FamilyMember } from "../core/models";

export const familyMembers: FamilyMember[] = [
  { id: "steve", name: "Steve", shortName: "S", colour: "#22C1A2", role: "adult" },
  { id: "jenny", name: "Jenny", shortName: "J", colour: "#FFB347", role: "adult" },
  { id: "lauren", name: "Lauren", shortName: "L", colour: "#6C4DFF", role: "teen" },
  { id: "nicole", name: "Nicole", shortName: "N", colour: "#FF5CA8", role: "teen" },
  { id: "finn", name: "Finn", shortName: "F", colour: "#4D96FF", role: "child" },
];

export const events: Event[] = [
  { id:"e1", title:"Office day", start:"2026-08-26T08:00:00", end:"2026-08-26T17:00:00", personIds:["steve"], category:"work", location:"Grand Canal", source:"mock" },
  { id:"e2", title:"GAA training", start:"2026-08-26T15:30:00", end:"2026-08-26T16:45:00", personIds:["nicole"], category:"sports", location:"St. Anne’s Park", description:"Bring rain jacket", source:"mock" },
  { id:"e3", title:"Football training", start:"2026-08-26T17:00:00", end:"2026-08-26T18:15:00", personIds:["finn"], category:"sports", location:"Belvedere", source:"mock" },
  { id:"e4", title:"Dentist appointment", start:"2026-08-27T11:30:00", end:"2026-08-27T12:00:00", personIds:["jenny"], category:"appointment", location:"Clontarf Dental", source:"mock" },
  { id:"e5", title:"Freshers society night", start:"2026-08-27T18:30:00", end:"2026-08-27T21:00:00", personIds:["lauren"], category:"college", location:"Trinity College", source:"mock" },
  { id:"e6", title:"Match vs. Raheny", start:"2026-08-29T10:30:00", end:"2026-08-29T12:00:00", personIds:["finn"], category:"sports", location:"Fairview Park", source:"mock" },
  { id:"e7", title:"Granny’s birthday lunch", start:"2026-08-30T13:00:00", end:"2026-08-30T15:30:00", personIds:["steve","jenny","lauren","nicole","finn"], category:"family", location:"Howth", source:"mock" },
  { id:"e8", title:"School parent evening", start:"2026-09-01T19:00:00", end:"2026-09-01T20:30:00", personIds:["jenny","steve","finn"], category:"school", location:"Finn’s school", source:"mock" },
];

export const initialBoardItems: BoardItem[] = [
  { id:"b1", text:"Antibiotics — Day 4 of 7", createdAt:"2026-08-23T09:00:00", progressCurrent:4, progressTotal:7 },
  { id:"b2", text:"12 days to holidays", createdAt:"2026-08-20T09:00:00", countdownDate:"2026-09-07" },
  { id:"b3", text:"Finn needs €5 Friday", personIds:["finn"], createdAt:"2026-08-25T19:20:00", pinned:true },
  { id:"b4", text:"Bring school form", personIds:["finn","jenny"], createdAt:"2026-08-26T07:40:00" },
  { id:"b5", text:"Ring mechanic", personIds:["steve"], createdAt:"2026-08-25T18:00:00" },
];
