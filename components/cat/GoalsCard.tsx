import {Target,Megaphone,Volume2,Music,Crown,Fish,Brush,Gamepad2,GraduationCap,BookOpen,Award,LifeBuoy,Sparkles,type LucideIcon} from "lucide-react";
import type {Data} from "../../lib/cat-types";
import {goals,nextGoal,type GoalKind} from "../../lib/goals";

const icons:Record<string,LucideIcon>={Megaphone,Volume2,Music,Crown,Fish,Brush,Gamepad2,GraduationCap,BookOpen,Award,LifeBuoy,Sparkles};
const labels:Record<GoalKind,string>={calls:"Miauen",actions:"Aktionen",points:"Pfotenpunkte",revivals:"Wiederbelebungen"};
const kinds:GoalKind[]=["calls","actions","points","revivals"];
const format=(n:number)=>n.toLocaleString("de-DE");

type Props={data:Data["goals"]|undefined};

export function GoalsCard({data}:Props){
 const reached=data?Object.keys(data.reached):[];
 return <section className="card goals"><small><Target size={14}/> KURSZIELE</small><h2>Unser Kurs</h2>{!data?<p>Kursziele laden …</p>:<>
  <ul className="goalbars">{kinds.map(kind=>{const next=nextGoal(kind,reached);const value=data.counters[kind];return <li key={kind}>{next?<><div><span>{labels[kind]}</span><b>{format(value)} / {format(next.target)}</b></div><div className="track"><i style={{width:Math.min(100,Math.round(value*100/next.target))+"%"}}/></div></>:<div><span>{labels[kind]}</span><b>Alles geschafft</b></div>}</li>})}</ul>
  <p className="badgecount">Abzeichen {reached.length} von {goals.length}</p>
  <ul className="badges" aria-label="Abzeichen">{goals.map(g=>{const at=data.reached[g.id];const Icon=icons[g.icon]||Award;return <li key={g.id} className={at?"got":"open"} title={g.badge+(at?" · erreicht am "+new Date(at).toLocaleDateString("de-DE"):" · noch offen")}><Icon size={18} aria-hidden="true"/><span className="sr">{g.badge}{at?", erreicht":", noch offen"}</span></li>})}</ul>
 </>}</section>;
}
