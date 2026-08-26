"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Home, Settings, StickyNote, Users } from "lucide-react";
import type { BoardItem, Event, FamilyMember } from "../../src/core/models";
import { modules } from "../../src/core/modules";

type View = "home" | "week" | "board" | "family" | "settings";
type Props = { family: FamilyMember[]; events: Event[]; initialBoard: BoardItem[] };

const days = [
  { label: "Mon", date: "24", iso: "2026-08-24" }, { label: "Tue", date: "25", iso: "2026-08-25" },
  { label: "Wed", date: "26", iso: "2026-08-26" }, { label: "Thu", date: "27", iso: "2026-08-27" },
  { label: "Fri", date: "28", iso: "2026-08-28" }, { label: "Sat", date: "29", iso: "2026-08-29" },
  { label: "Sun", date: "30", iso: "2026-08-30" },
];

const timeOf = (event: Event) => event.allDay ? "All day" : new Intl.DateTimeFormat("en-IE", { hour:"numeric", minute:"2-digit" }).format(new Date(event.start));
const memberFor = (family: FamilyMember[], id: string) => family.find((member) => member.id === id);

function Avatar({ person, small = false }: { person: FamilyMember; small?: boolean }) {
  return <span className={`avatar ${small ? "avatar-small" : ""}`} style={{ background: `${person.colour}24`, color: person.colour }}>{person.shortName}</span>;
}

function Header({ onSettings }: { onSettings: () => void }) {
  return <header className="topbar"><button className="brand plain-button" onClick={() => location.assign("/")} aria-label="Ground Control home"><span className="brand-mark"><i /><b /></span><span>Ground Control</span></button><button className="profile" onClick={onSettings} aria-label="Open settings"><Settings size={19} strokeWidth={2} /></button></header>;
}

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow:string; title:string; action?:string; onAction?:()=>void }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <button className={action.includes("Add") ? "add-button" : "text-button"} onClick={onAction}>{action}</button>}</div>;
}

function BoardNote({ item, family, onRemove, large = false }: { item:BoardItem; family:FamilyMember[]; onRemove?:(id:string)=>void; large?:boolean }) {
  const assigned = item.personIds?.map((id) => memberFor(family, id)).filter(Boolean) as FamilyMember[] | undefined;
  const progress = item.progressCurrent && item.progressTotal ? `${(item.progressCurrent / item.progressTotal) * 100}%` : undefined;
  if (item.countdownDate) return <article className={`board-card countdown-card ${large ? "large" : ""}`}><div><strong>12</strong><span>days</span></div><p>to holidays</p><span className="sun">☀</span>{onRemove && <button className="remove-note" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.text}`}>×</button>}</article>;
  return <article className={`board-card ${item.pinned ? "pinned" : ""} ${large ? "large" : ""}`}>{item.pinned && <span className="pin-dot" aria-label="Pinned">●</span>}<p className="board-text">{item.text}</p>{progress && <div className="progress" aria-label={`${item.progressCurrent} of ${item.progressTotal}`}><i style={{ width: progress }} /></div>}{assigned?.length ? <div className="assigned">{assigned.map((person) => <Avatar person={person} small key={person.id} />)}</div> : null}{onRemove && <button className="remove-note" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.text}`}>×</button>}</article>;
}

function AddBoard({ onAdd, onCancel }: { onAdd:(text:string)=>void; onCancel:()=>void }) {
  const [text, setText] = useState(""); const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const submit = (event:FormEvent) => { event.preventDefault(); if (text.trim()) onAdd(text.trim()); };
  return <form className="quick-add" onSubmit={submit}><label htmlFor="board-note">What do we need to remember?</label><div><input ref={input} id="board-note" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a quick note…" /><button type="submit" disabled={!text.trim()}>Save</button><button type="button" className="cancel" onClick={onCancel}>Cancel</button></div><small>Just type it. You can sort out the details later.</small></form>;
}

function EventRow({ event, family, featured=false }: { event:Event; family:FamilyMember[]; featured?:boolean }) {
  const person = memberFor(family, event.personIds[0]);
  return <article className={featured ? "next-event" : "event-row"}><time><strong>{timeOf(event).replace(/\s(am|pm)$/i, "")}</strong>{!event.allDay && <span>{timeOf(event).match(/(am|pm)$/i)?.[0]}</span>}</time><div className="event-copy">{person && <small style={{ color:person.colour }}><span className="person-dot" style={{background:person.colour}} />{person.name.toUpperCase()}{featured ? " · NEXT UP" : ""}</small>}<h3>{event.title}</h3><p>{event.location}{event.description ? ` · ${event.description}` : ""}</p></div>{featured && <span className="arrow">→</span>}</article>;
}

function HomeView({ family, events, board, goBoard, goWeek, selectPerson }:{ family:FamilyMember[]; events:Event[]; board:BoardItem[]; goBoard:()=>void; goWeek:()=>void; selectPerson:(id:string)=>void }) {
  const today = events.filter((event) => event.start.startsWith("2026-08-26"));
  return <div className="dashboard home-dashboard">
    <section className="hero"><p className="eyebrow">WEDNESDAY · 26 AUGUST</p><h1>Good morning, Steve.</h1><p className="lede">A busy afternoon, then everyone’s home.</p><div className="family-strip" aria-label="Family members">{family.map((person) => <button className="family-person" key={person.id} onClick={() => selectPerson(person.id)}><Avatar person={person}/><span>{person.name}</span></button>)}</div></section>
    <section className="today"><SectionHeading eyebrow="TODAY" title="Three things on" action="See week" onAction={goWeek}/><EventRow event={today[1]} family={family} featured/><div className="compact-events">{[today[2],today[0]].map((event) => <EventRow key={event.id} event={event} family={family}/>)}</div></section>
    <aside className="board-preview"><SectionHeading eyebrow="FAMILY BOARD" title="Don’t forget" action="+ Add" onAction={goBoard}/><div className="home-board-list">{board.slice(0,3).map((item) => <BoardNote item={item} family={family} key={item.id}/>)}</div><button className="view-all" onClick={goBoard}>View the whole board <span>→</span></button></aside>
    <section className="look-ahead"><SectionHeading eyebrow="LOOKING AHEAD" title="The next few days"/><div className="ahead-list">{events.filter((e) => e.start > "2026-08-26T23:59").slice(0,3).map((event) => <div key={event.id}><span>{new Intl.DateTimeFormat("en-IE",{weekday:"short",day:"numeric"}).format(new Date(event.start))}</span><strong>{event.title}</strong><small>{event.personIds.length > 2 ? "Everyone" : memberFor(family,event.personIds[0])?.name}</small></div>)}</div></section>
  </div>;
}

function WeekView({ family, events, selectPerson }:{ family:FamilyMember[]; events:Event[]; selectPerson:(id:string)=>void }) {
  return <div className="screen week-screen"><div className="page-intro"><p className="eyebrow">24–30 AUGUST</p><h1>This week</h1><p>Everyone’s plans, without the calendar clutter.</p></div><div className="week-days">{days.map((day) => <div className={day.date === "26" ? "today-day" : ""} key={day.date}><span>{day.label}</span><strong>{day.date}</strong></div>)}</div><div className="week-lanes">{family.map((person) => { const own = events.filter((event) => event.personIds.includes(person.id)); return <section className="person-lane" key={person.id}><button className="lane-person plain-button" onClick={() => selectPerson(person.id)}><Avatar person={person}/><strong>{person.name}</strong></button><div className="lane-grid">{days.map((day) => <div key={day.date} className={day.date === "26" ? "today-cell" : ""}>{own.filter((event) => event.start.startsWith(day.iso)).map((event) => <article className="lane-event" key={event.id} style={{borderColor:person.colour}}><time>{timeOf(event)}</time><strong>{event.title}</strong><span>{event.location}</span></article>)}</div>)}</div></section>})}</div><div className="week-key"><span><i className="overlap-key"/>More than one person has plans on Sunday</span><span>Scroll sideways to see the whole week</span></div></div>;
}

function BoardView({ board, family, add, remove }:{ board:BoardItem[]; family:FamilyMember[]; add:(text:string)=>void; remove:(id:string)=>void }) {
  const [adding,setAdding] = useState(false);
  const save = (text:string) => { add(text); setAdding(false); };
  return <div className="screen board-screen"><div className="board-header"><div className="page-intro"><p className="eyebrow">SHARED FAMILY BOARD</p><h1>Things to remember</h1><p>Quick notes for everyone. No forms, no fuss.</p></div><button className="primary-button" onClick={() => setAdding(true)}>+ Add something</button></div>{adding && <AddBoard onAdd={save} onCancel={() => setAdding(false)}/>}<div className="board-grid">{board.map((item) => <BoardNote key={item.id} item={item} family={family} onRemove={remove} large/>)}</div><p className="board-hint">Board notes stay lightweight by design. Add it now, tidy it later.</p></div>;
}

function FamilyView({ family, events, board, selected, setSelected }:{family:FamilyMember[]; events:Event[]; board:BoardItem[]; selected:string|null; setSelected:(id:string|null)=>void}) {
  if (selected) { const person = memberFor(family,selected)!; const ownEvents = events.filter((event) => event.personIds.includes(selected)); const ownNotes = board.filter((item) => item.personIds?.includes(selected)); return <div className="screen person-screen"><button className="back-button" onClick={() => setSelected(null)}>← All family</button><div className="person-hero"><Avatar person={person}/><div><p className="eyebrow">FAMILY MEMBER</p><h1>{person.name}</h1><p>{person.role === "adult" ? "Adult" : person.role === "teen" ? "Teenager" : "Child"} · {ownEvents.length} things coming up</p></div></div><div className="person-columns"><section><SectionHeading eyebrow="NEXT UP" title={ownEvents[0]?.title || "Nothing planned"}/>{ownEvents.slice(0,4).map((event) => <EventRow key={event.id} event={event} family={family}/>)}</section><section><SectionHeading eyebrow="ON THE BOARD" title={ownNotes.length ? "Worth remembering" : "All clear"}/>{ownNotes.map((item) => <BoardNote key={item.id} item={item} family={family} large/>)}</section></div></div>; }
  return <div className="screen family-screen"><div className="page-intro"><p className="eyebrow">YOUR HOUSEHOLD</p><h1>The family</h1><p>Tap a person for their plans and reminders.</p></div><div className="family-grid">{family.map((person) => { const next = events.find((event) => event.personIds.includes(person.id)); return <button className="family-card" key={person.id} onClick={() => setSelected(person.id)}><Avatar person={person}/><div><h2>{person.name}</h2><p>Next: {next?.title}</p><small>{next ? `${new Intl.DateTimeFormat("en-IE",{weekday:"short"}).format(new Date(next.start))} · ${timeOf(next)}` : "Nothing planned"}</small></div><span>→</span></button>})}</div></div>;
}

function SettingsView({ close }:{close:()=>void}) {
  const installed = modules.filter((mod) => mod.enabled), available = modules.filter((mod) => !mod.enabled);
  return <div className="screen settings-screen"><button className="back-button" onClick={close}>← Back</button><div className="page-intro"><p className="eyebrow">GROUND CONTROL</p><h1>Settings & modules</h1><p>Choose what belongs in your family’s Ground Control.</p></div><section className="settings-section"><SectionHeading eyebrow="INSTALLED" title="Ready to use"/><div className="module-list">{installed.map((mod) => <article key={mod.id}><span className="module-icon">✓</span><div><h3>{mod.name}</h3><p>{mod.description}</p></div><span className="installed-tag">On</span></article>)}</div></section><section className="settings-section"><SectionHeading eyebrow="COMING SOON" title="More ways to stay organised"/><div className="module-list muted-modules">{available.map((mod) => <article key={mod.id}><span className="module-icon">+</span><div><h3>{mod.name}</h3><p>{mod.description}</p></div><span className="soon-tag">Soon</span></article>)}</div></section><p className="settings-note">External connectors will translate events into Ground Control’s standard format. Your planner stays independent of any one provider.</p></div>;
}

function BottomNav({ view, setView }:{view:View; setView:(view:View)=>void}) {
  const items = [{id:"home" as View,label:"Home",Icon:Home},{id:"week" as View,label:"Week",Icon:CalendarDays},{id:"board" as View,label:"Board",Icon:StickyNote},{id:"family" as View,label:"Family",Icon:Users}];
  return <nav className="bottom-nav" aria-label="Primary navigation">{items.map(({id,label,Icon}) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon size={20} strokeWidth={view === id ? 2.5 : 1.8}/><span>{label}</span></button>)}</nav>;
}

export function GroundControlApp({ family, events, initialBoard }:Props) {
  const [view,setViewState] = useState<View>("home"); const [previousView,setPreviousView] = useState<View>("home"); const [selected,setSelected] = useState<string|null>(null); const [board,setBoard] = useState(initialBoard);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);
  const setView = (next:View) => { if (next !== "settings") setPreviousView(next); setViewState(next); if (next !== "family") setSelected(null); window.scrollTo({top:0,behavior:"smooth"}); };
  const add = (text:string) => setBoard((items) => [{id:`local-${Date.now()}`,text,createdAt:new Date().toISOString()},...items]);
  const remove = (id:string) => setBoard((items) => items.filter((item) => item.id !== id));
  const content = useMemo(() => { if (view === "home") return <HomeView family={family} events={events} board={board} goBoard={() => setView("board")} goWeek={() => setView("week")} selectPerson={(id) => {setSelected(id);setViewState("family");}}/>; if (view === "week") return <WeekView family={family} events={events} selectPerson={(id) => {setSelected(id);setViewState("family");}}/>; if (view === "board") return <BoardView board={board} family={family} add={add} remove={remove}/>; if (view === "family") return <FamilyView family={family} events={events} board={board} selected={selected} setSelected={setSelected}/>; return <SettingsView close={() => setView(previousView)}/>; }, [view,family,events,board,selected,previousView]);
  return <main className="app-shell"><Header onSettings={() => {setPreviousView(view);setViewState("settings");}}/>{content}{view !== "settings" && <BottomNav view={view} setView={setView}/>}</main>;
}
