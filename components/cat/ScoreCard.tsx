import {Star,PawPrint,ArrowUpRight} from "lucide-react";

type Props={points:number;onBoard:()=>void};

export function ScoreCard({points,onBoard}:Props){
 return <section className="card score"><small><Star size={14}/> DEIN SCORE</small><div className="points">{points}<span>Pfotenpunkte</span><PawPrint className="bigpaw"/></div><button className="link" onClick={onBoard}>Zur Kursrangliste <ArrowUpRight size={16}/></button></section>;
}
