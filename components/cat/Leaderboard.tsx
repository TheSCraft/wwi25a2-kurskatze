"use client";
import {useState,type KeyboardEvent} from "react";
import {Trophy,ArrowUpRight} from "lucide-react";
import type {Data} from "../../lib/cat-types";
import {remainingTime} from "../../lib/format-time";

type Props={data:Data|null;now:number;onRoom:()=>void};
type View="week"|"total";
const views:{id:View;label:string}[]=[{id:"week",label:"Diese Woche"},{id:"total",label:"Gesamt"}];

export function Leaderboard({data,now,onRoom}:Props){
 const [view,setView]=useState<View>("week");
 const list=data?(view==="week"?data.weekBoard:data.board):[];
 function onKeyDown(e:KeyboardEvent){
  if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const next:View=view==="week"?"total":"week";setView(next);document.getElementById("tab-"+next)?.focus()}
 }
 const intro=view==="week"?"Punkte seit Montag, 0 Uhr. Neue Woche "+(data?remainingTime(data.weekEnd,now):"")+".":"Miauen gibt 1 Punkt, Bürsten 4, Füttern und Streicheln je 5, Spielen 6 und Lernen 8.";
 const empty=view==="week"?"Diese Woche hat noch niemand Punkte gesammelt. Wer gibt Byte den ersten Snack?":"Die Rangliste ist noch leer. Wer gibt Byte den ersten Snack?";
 return <section className="card board"><small><Trophy size={15}/> KURS-CHARTS</small><h2>Die Pfotenpunkte</h2>
  <div className="tabs" role="tablist" aria-label="Zeitraum" onKeyDown={onKeyDown}>{views.map(v=><button key={v.id} id={"tab-"+v.id} role="tab" type="button" aria-selected={view===v.id} aria-controls="board-panel" tabIndex={view===v.id?0:-1} onClick={()=>setView(v.id)}>{v.label}</button>)}</div>
  <div id="board-panel" role="tabpanel" tabIndex={0} aria-labelledby={"tab-"+view}>{data&&<p>{intro}</p>}{list.length?<ol>{list.map((x,i)=><li key={i}><b>{String(i+1).padStart(2,"0")}</b><span>{x.name}</span><strong>{x.points} Pkt.</strong></li>)}</ol>:<p>{data?empty:"Rangliste lädt …"}</p>}</div>
  <button className="link" onClick={onRoom}>Ins Katzenzimmer <ArrowUpRight size={16}/></button></section>;
}
