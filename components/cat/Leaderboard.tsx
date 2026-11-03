import {Trophy,ArrowUpRight} from "lucide-react";
import type {Data} from "../../lib/cat-types";

type Props={data:Data|null;onRoom:()=>void};

export function Leaderboard({data,onRoom}:Props){
 return <section className="card board"><small><Trophy size={15}/> KURS-CHARTS</small><h2>Die Pfotenpunkte</h2><p>Miauen gibt 1 Punkt, Bürsten 4, Füttern und Streicheln je 5, Spielen 6 und Lernen 8.</p>{data?.board.length?<ol>{data.board.map((x,i)=><li key={i}><b>{String(i+1).padStart(2,"0")}</b><span>{x.name}</span><strong>{x.points} Pkt.</strong></li>)}</ol>:<p>{data?"Die Rangliste ist noch leer. Wer gibt Byte den ersten Snack?":"Rangliste lädt …"}</p>}<button className="link" onClick={onRoom}>Ins Katzenzimmer <ArrowUpRight size={16}/></button></section>;
}
