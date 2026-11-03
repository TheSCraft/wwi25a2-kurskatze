import {Activity,Fish,Heart} from "lucide-react";
import {isDead,type Data} from "../../lib/cat-types";

type Props={data:Data|null;now:number};

export function StatusCard({data,now}:Props){
 const dead=isDead(data,now);
 const foodMinutes=data?Math.ceil(Math.max(0,data.foodExpires-now)/60000):0;
 return <section className="card status"><small><Activity size={14}/> LIVE-STATUS</small><h2>So geht’s Byte</h2>{[[Fish,"Sättigung",data?.food],[Heart,"Zuneigung",data?.love]].map(([Icon,label,value],i)=>{const I=Icon as typeof Fish;return <div className="meter" key={i}><div><span><I size={17}/>{String(label)}</span><b>{value==null?"…":value+" %"}</b></div><div className="track"><i style={{width:(value||0)+"%",background:i?"#f7a9c4":"#fac26e"}}/></div></div>})}<div className="mood"><span className="dot"/>{!data?"Byte wird geweckt …":dead?"Der Kurs kann Byte zurückholen.":data.food<30?"Byte könnte einen Snack vertragen.":data.love<30?"Byte vermisst seine Kursmenschen.":"Byte fühlt sich pudelwohl."}</div><div className="life"><strong>Bis der Napf leer ist</strong>{data&&<b>{foodMinutes?Math.floor(foodMinutes/60)+" h "+foodMinutes%60+" min":"Futterrunde läuft"}</b>}<p>Eine Portion macht Byte für 72 Stunden satt. Die Sättigung sinkt langsam auf null. Bei null stirbt Byte. Füttert danach jedes Kurskonto einmal, lebt er wieder.</p></div></section>;
}
