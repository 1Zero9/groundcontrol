"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ClipboardCheck, Home, Menu, Plus, Settings, StickyNote, UserRound, Users, X } from "lucide-react";
import type { BoardItem, Event, FamilyMember } from "../../src/core/models";
import { modules } from "../../src/core/modules";

type View = "home" | "week" | "board" | "family" | "settings" | "contribute" | "approvals";
type Props = { family: FamilyMember[]; events: Event[]; initialBoard: BoardItem[] };
type Contribution = { id:string; authorId:string; kind:"note"|"event"; text:string; date?:string; status:"pending"|"approved"|"rejected" };

const days = [
  { label: "Mon", date: "24", iso: "2026-08-24" }, { label: "Tue", date: "25", iso: "2026-08-25" },
  { label: "Wed", date: "26", iso: "2026-08-26" }, { label: "Thu", date: "27", iso: "2026-08-27" },
  { label: "Fri", date: "28", iso: "2026-08-28" }, { label: "Sat", date: "29", iso: "2026-08-29" },
  { label: "Sun", date: "30", iso: "2026-08-30" },
];

const timeOf = (event: Event) => event.allDay ? "All day" : new Intl.DateTimeFormat("en-IE", { hour:"numeric", minute:"2-digit" }).format(new Date(event.start));
const memberFor = (family: FamilyMember[], id: string) => family.find((member) => member.id === id);

function Avatar({ person, small = false }: { person: FamilyMember; small?: boolean }) {
  const bgStyle = {
    background: `linear-gradient(135deg, ${person.colour}2e 0%, ${person.colour}0c 100%)`,
    color: person.colour,
    borderColor: person.colour
  };
  return <span className={`avatar ${small ? "avatar-small" : ""}`} style={bgStyle}>{person.shortName}</span>;
}

function Header({ person, onAccount }: { person:FamilyMember; onAccount: () => void }) {
  return <header className="topbar"><button className="brand plain-button" onClick={() => location.assign("/")} aria-label="Ground Control home"><Menu className="menu-icon" size={23}/><span>Ground Control</span></button><button className="account-button" onClick={onAccount} aria-label="Open account menu"><Avatar person={person} small/><span>{person.name}</span></button></header>;
}

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow:string; title:string; action?:string; onAction?:()=>void }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <button className={action.includes("Add") ? "add-button" : "text-button"} onClick={onAction}>{action}</button>}</div>;
}

function BoardNote({ item, family, onRemove, large = false }: { item:BoardItem; family:FamilyMember[]; onRemove?:(id:string)=>void; large?:boolean }) {
  const assigned = item.personIds?.map((id) => memberFor(family, id)).filter(Boolean) as FamilyMember[] | undefined;
  const progress = item.progressCurrent && item.progressTotal ? `${(item.progressCurrent / item.progressTotal) * 100}%` : undefined;
  const style = assigned?.[0]?.colour ? { "--owner-color": assigned[0].colour } as React.CSSProperties : {};
  if (item.countdownDate) return <article className={`board-card countdown-card ${large ? "large" : ""}`}><div><strong>12</strong><span>days</span></div><p>to holidays</p><span className="sun">☀</span>{onRemove && <button className="remove-note" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.text}`}>×</button>}</article>;
  return <article className={`board-card ${item.pinned ? "pinned" : ""} ${large ? "large" : ""}`} style={style}>{item.pinned && <span className="pin-dot" aria-label="Pinned">●</span>}<p className="board-text">{item.text}</p>{progress && <div className="progress" aria-label={`${item.progressCurrent} of ${item.progressTotal}`}><i style={{ width: progress }} /></div>}{assigned?.length ? <div className="assigned">{assigned.map((person) => <Avatar person={person} small key={person.id} />)}</div> : null}{onRemove && <button className="remove-note" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.text}`}>×</button>}</article>;
}

function AddBoard({ onAdd, onCancel }: { onAdd:(text:string)=>void; onCancel:()=>void }) {
  const [text, setText] = useState(""); const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const submit = (event:FormEvent) => { event.preventDefault(); if (text.trim()) onAdd(text.trim()); };
  return <form className="quick-add" onSubmit={submit}><label htmlFor="board-note">What do we need to remember?</label><div><input ref={input} id="board-note" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a quick note…" /><button type="submit" disabled={!text.trim()}>Save</button><button type="button" className="cancel" onClick={onCancel}>Cancel</button></div><small>Just type it. You can sort out the details later.</small></form>;
}

function EventRow({ event, family, featured=false }: { event:Event; family:FamilyMember[]; featured?:boolean }) {
  const person = memberFor(family, event.personIds[0]);
  const style = person?.colour ? { "--owner-color": person.colour } as React.CSSProperties : {};
  const icon = event.category === "sports" ? "⚽" : event.category === "school" || event.category === "college" ? "🎓" : event.category === "appointment" ? "📅" : event.category === "family" ? "💛" : "🗓️";
  if(featured) return <article className="next-event" style={style}><i className="event-stripe"/><div className="event-copy"><h3>{event.title}</h3><p>Today · {timeOf(event)} · {event.location}</p></div><span className="event-icon" aria-hidden="true">{icon}</span><span className="arrow">›</span></article>;
  return <article className="event-row" style={style}><span className="event-icon" aria-hidden="true">{icon}</span><time><strong>{timeOf(event).replace(/\s(am|pm)$/i, "")}</strong>{!event.allDay && <span>{timeOf(event).match(/(am|pm)$/i)?.[0]}</span>}</time><div className="event-copy">{person && <small style={{ color:person.colour }}><span className="person-dot" style={{background:person.colour}} />{person.name.toUpperCase()}</small>}<h3>{event.title}</h3><p>{event.location}{event.description ? ` · ${event.description}` : ""}</p></div></article>;
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

function PersonalHome({ person, family, events, board, contributions, onAdd, onWeek }:{person:FamilyMember;family:FamilyMember[];events:Event[];board:BoardItem[];contributions:Contribution[];onAdd:()=>void;onWeek:()=>void}) {
  const mine = events.filter((event) => event.personIds.includes(person.id));
  const notes = board.filter((item) => item.personIds?.includes(person.id));
  const pending = contributions.filter((item) => item.authorId === person.id && item.status === "pending");
  return <div className="personal-home screen"><section className="mission-panel"><div className="personal-greeting"><div><p className="eyebrow">WEDNESDAY · 26 AUGUST</p><h1>Hi, {person.name}!</h1><p>Here’s what you need today.</p></div><span className="planet" aria-hidden="true">🪐</span></div><section className="personal-next"><p className="card-kicker">UP NEXT</p>{mine[0] && <EventRow event={mine[0]} family={family} featured/>}</section></section><button className="week-launch" onClick={onWeek}><CalendarDays size={19}/><strong>See my week</strong><span>›</span></button><section className="personal-reminders"><p className="card-kicker">FOR YOU</p>{notes[0]&&<BoardNote item={notes[0]} family={family} large/>}{notes[1]&&<article className="task-card"><span className="task-check"><Check size={18}/></span><strong>{notes[1].text}</strong><Avatar person={person} small/></article>}</section>{pending.length > 0 && <section className="pending-strip"><ClipboardCheck size={18}/><div><strong>{pending.length} update{pending.length > 1 ? "s" : ""} waiting for approval</strong><span>Your parent will add it to the family view.</span></div></section>}<button className="contribute-cta" onClick={onAdd}><Plus size={20}/><span><strong>Add an update</strong><small>Share something with the family</small></span></button></div>;
}

function ContributeView({ person, onSubmit }:{person:FamilyMember;onSubmit:(item:Contribution)=>void}) {
  const [kind,setKind] = useState<"note"|"event">("note"); const [text,setText] = useState(""); const [date,setDate] = useState(""); const [sent,setSent] = useState(false);
  const submit = (event:FormEvent) => { event.preventDefault(); if(!text.trim()) return; onSubmit({id:`c-${Date.now()}`,authorId:person.id,kind,text:text.trim(),date:date||undefined,status:"pending"}); setSent(true); setText(""); setDate(""); };
  if(sent) return <div className="screen submit-success"><span><Check size={28}/></span><h1>Sent for approval</h1><p>A parent will review your update before it appears for the whole family.</p><button className="primary-button" onClick={() => setSent(false)}>Add another</button></div>;
  return <div className="screen contribute-screen"><div className="page-intro"><p className="eyebrow">YOUR PROFILE</p><h1>Add an update</h1><p>Share it now. A parent approves it for the family.</p></div><form className="contribute-form" onSubmit={submit}><fieldset><legend>What are you adding?</legend><div className="type-choice"><button type="button" className={kind==="note"?"selected":""} onClick={() => setKind("note")}><StickyNote size={19}/>Quick note</button><button type="button" className={kind==="event"?"selected":""} onClick={() => setKind("event")}><CalendarDays size={19}/>Event</button></div></fieldset><label htmlFor="contribution-text">{kind==="note"?"What should the family know?":"What’s happening?"}</label><textarea id="contribution-text" value={text} onChange={(e)=>setText(e.target.value)} placeholder={kind==="note"?"e.g. No training tonight":"e.g. Match vs Raheny"} rows={4}/>{kind==="event"&&<><label htmlFor="contribution-date">When?</label><input id="contribution-date" type="datetime-local" value={date} onChange={(e)=>setDate(e.target.value)}/></>}<button className="primary-button submit-update" disabled={!text.trim()}>Send for approval</button></form></div>;
}

function ApprovalsView({ family, contributions, onDecision }:{family:FamilyMember[];contributions:Contribution[];onDecision:(id:string,status:"approved"|"rejected")=>void}) {
  const pending=contributions.filter((item)=>item.status==="pending");
  return <div className="screen approvals-screen"><div className="page-intro"><p className="eyebrow">PARENT ADMIN</p><h1>Approvals</h1><p>Review family updates before everyone sees them.</p></div>{pending.length===0?<div className="empty-approvals"><Check size={24}/><h2>All caught up</h2><p>There are no updates waiting.</p></div>:<div className="approval-list">{pending.map((item)=>{const author=memberFor(family,item.authorId)!;return <article key={item.id}><header><Avatar person={author} small/><div><strong>{author.name}</strong><span>wants to add a {item.kind}</span></div></header><p>{item.text}</p>{item.date&&<time>{new Intl.DateTimeFormat("en-IE",{weekday:"long",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"}).format(new Date(item.date))}</time>}<footer><button className="reject" onClick={()=>onDecision(item.id,"rejected")}><X size={18}/>Not now</button><button className="approve" onClick={()=>onDecision(item.id,"approved")}><Check size={18}/>Approve</button></footer></article>})}</div>}</div>;
}

function AccountSheet({ family, current, onSelect, onClose }:{family:FamilyMember[];current:string;onSelect:(id:string)=>void;onClose:()=>void}) {
  return <div className="sheet-backdrop" onClick={onClose}><section className="account-sheet" onClick={(event)=>event.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="account-title"><div className="sheet-handle"/><header><div><p className="eyebrow">POC ACCOUNT SWITCHER</p><h2 id="account-title">Who’s using Ground Control?</h2></div><button onClick={onClose} aria-label="Close"><X size={20}/></button></header><p className="sheet-help">Parents manage the family. Everyone else contributes through their own profile.</p><div className="account-list">{family.map((person)=>{const admin=person.role==="adult";return <button key={person.id} className={current===person.id?"current":""} onClick={()=>onSelect(person.id)}><Avatar person={person}/><span><strong>{person.name}</strong><small>{admin?"Parent · Admin":"Contributor"}</small></span>{current===person.id&&<Check size={19}/>}</button>})}</div></section></div>;
}

function SettingsView({ close }:{close:()=>void}) {
  const installed = modules.filter((mod) => mod.enabled), available = modules.filter((mod) => !mod.enabled);
  return <div className="screen settings-screen"><button className="back-button" onClick={close}>← Back</button><div className="page-intro"><p className="eyebrow">GROUND CONTROL</p><h1>Settings & modules</h1><p>Choose what belongs in your family’s Ground Control.</p></div><section className="settings-section"><SectionHeading eyebrow="INSTALLED" title="Ready to use"/><div className="module-list">{installed.map((mod) => <article key={mod.id}><span className="module-icon">✓</span><div><h3>{mod.name}</h3><p>{mod.description}</p></div><span className="installed-tag">On</span></article>)}</div></section><section className="settings-section"><SectionHeading eyebrow="COMING SOON" title="More ways to stay organised"/><div className="module-list muted-modules">{available.map((mod) => <article key={mod.id}><span className="module-icon">+</span><div><h3>{mod.name}</h3><p>{mod.description}</p></div><span className="soon-tag">Soon</span></article>)}</div></section><p className="settings-note">External connectors will translate events into Ground Control’s standard format. Your planner stays independent of any one provider.</p></div>;
}

function BottomNav({ view, setView, isAdmin }:{view:View; setView:(view:View)=>void;isAdmin:boolean}) {
  const items = isAdmin ? [{id:"home" as View,label:"Today",Icon:Home},{id:"week" as View,label:"Week",Icon:CalendarDays},{id:"approvals" as View,label:"Approvals",Icon:ClipboardCheck},{id:"family" as View,label:"Family",Icon:Users}] : [{id:"home" as View,label:"Today",Icon:Home},{id:"week" as View,label:"My week",Icon:CalendarDays},{id:"contribute" as View,label:"Add",Icon:Plus},{id:"family" as View,label:"Profile",Icon:UserRound}];
  return <nav className="bottom-nav" aria-label="Primary navigation">{items.map(({id,label,Icon}) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon size={20} strokeWidth={view === id ? 2.5 : 1.8}/><span>{label}</span></button>)}</nav>;
}

export function GroundControlApp({ family, events, initialBoard }:Props) {
  const [view,setViewState] = useState<View>("home"); const [previousView,setPreviousView] = useState<View>("home"); const [selected,setSelected] = useState<string|null>(null); const [board,setBoard] = useState(initialBoard); const [currentUserId,setCurrentUserId]=useState("finn"); const [accountOpen,setAccountOpen]=useState(false); const [contributions,setContributions]=useState<Contribution[]>([{id:"c1",authorId:"nicole",kind:"note",text:"No training tonight — pitch is closed",status:"pending"},{id:"c2",authorId:"finn",kind:"event",text:"Match vs Clontarf",date:"2026-08-30T10:30",status:"pending"}]);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);
  const currentUser=memberFor(family,currentUserId) || family[0]; const isAdmin=currentUser.role==="adult";
  const setView = (next:View) => { if (next !== "settings") setPreviousView(next); setViewState(next); if (next !== "family") setSelected(null); window.scrollTo({top:0,behavior:"smooth"}); };
  const add = (text:string) => setBoard((items) => [{id:`local-${Date.now()}`,text,createdAt:new Date().toISOString()},...items]);
  const remove = (id:string) => setBoard((items) => items.filter((item) => item.id !== id));
  const decide=(id:string,status:"approved"|"rejected")=>{const item=contributions.find((entry)=>entry.id===id);setContributions((items)=>items.map((entry)=>entry.id===id?{...entry,status}:entry));if(status==="approved"&&item?.kind==="note")setBoard((items)=>[{id:`approved-${id}`,text:item.text,personIds:[item.authorId],createdAt:new Date().toISOString()},...items]);};
  const content = useMemo(() => { if (view === "home") return isAdmin ? <HomeView family={family} events={events} board={board} goBoard={() => setView("board")} goWeek={() => setView("week")} selectPerson={(id) => {setSelected(id);setViewState("family");}}/> : <PersonalHome person={currentUser} family={family} events={events} board={board} contributions={contributions} onAdd={()=>setView("contribute")} onWeek={()=>setView("week")}/>; if (view === "week") return <WeekView family={isAdmin?family:[currentUser]} events={isAdmin?events:events.filter((event)=>event.personIds.includes(currentUser.id))} selectPerson={(id) => {setSelected(id);setViewState("family");}}/>; if (view === "board") return <BoardView board={board} family={family} add={add} remove={remove}/>; if(view==="contribute")return <ContributeView person={currentUser} onSubmit={(item)=>setContributions((items)=>[item,...items])}/>;if(view==="approvals")return <ApprovalsView family={family} contributions={contributions} onDecision={decide}/>; if (view === "family") return <FamilyView family={family} events={events} board={board} selected={isAdmin?selected:currentUser.id} setSelected={isAdmin?setSelected:()=>undefined}/>; return <SettingsView close={() => setView(previousView)}/>; }, [view,family,events,board,selected,previousView,isAdmin,currentUser,contributions]);
  const chooseAccount=(id:string)=>{setCurrentUserId(id);setAccountOpen(false);setSelected(null);setViewState("home");};
  return <main className="app-shell"><Header person={currentUser} onAccount={() => setAccountOpen(true)}/>{content}{view !== "settings" && <BottomNav view={view} setView={setView} isAdmin={isAdmin}/>} {accountOpen&&<AccountSheet family={family} current={currentUser.id} onSelect={chooseAccount} onClose={()=>setAccountOpen(false)}/>}</main>;
}
