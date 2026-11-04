import {History} from "lucide-react";
import type {FeedEvent} from "../../lib/cat-types";
import {goalById} from "../../lib/goals";
import {relativeTime} from "../../lib/format-time";

type Props={events:FeedEvent[]|undefined;now:number};

function describe(e:FeedEvent){
 const name=e.name||"Jemand";
 switch(e.type){
  case "joined":return name+" ist dem Kurs beigetreten";
  case "revive_portion":return name+" hat eine Portion in den Napf gelegt";
  case "revived":return "Byte ist wieder da";
  case "died":return "Byte ist gestorben";
  case "goal":{const g=e.detail?goalById(e.detail):undefined;return g?"Kursziel erreicht: "+g.badge:"Kursziel erreicht"}
 }
}

export function ActivityCard({events,now}:Props){
 return <section className="card activity"><small><History size={14}/> AKTIVITÄT</small><h2>Letzte Ereignisse</h2>{events===undefined?<p>Ereignisse laden …</p>:events.length?<ol aria-label="Letzte Ereignisse">{events.map(e=><li key={e.id}><span>{describe(e)}</span><time dateTime={new Date(e.at).toISOString()}>{relativeTime(e.at,now)}</time></li>)}</ol>:<p>Noch nichts passiert. Hier erscheinen Beitritte und Wiederbelebungen.</p>}</section>;
}
