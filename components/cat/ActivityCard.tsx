import {History} from "lucide-react";
import type {FeedEvent} from "../../lib/cat-types";
import {relativeTime} from "../../lib/format-time";

type Props={events:FeedEvent[];now:number};

function describe(e:FeedEvent){
 const name=e.name||"Jemand";
 switch(e.type){
  case "joined":return name+" ist dem Kurs beigetreten";
  case "revive_portion":return name+" hat eine Portion in den Napf gelegt";
  case "revived":return "Byte ist wieder da";
  case "died":return "Byte ist gestorben";
 }
}

export function ActivityCard({events,now}:Props){
 return <section className="card activity"><small><History size={14}/> AKTIVITÄT</small><h2>Letzte Ereignisse</h2>{events.length?<ol aria-label="Letzte Ereignisse">{events.map(e=><li key={e.id}><span>{describe(e)}</span><time>{relativeTime(e.at,now)}</time></li>)}</ol>:<p>Noch nichts passiert. Hier erscheinen Beitritte und Wiederbelebungen.</p>}</section>;
}
