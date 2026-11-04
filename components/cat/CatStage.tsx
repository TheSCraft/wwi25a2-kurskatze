import {Volume2,VolumeX} from "lucide-react";
import {Bowl} from "./Bowl";

type Props={mood:string;dead:boolean;message:string;pose:string;audio:boolean;effects:string[];onToggleAudio:()=>void};

export function CatStage({mood,dead,message,pose,audio,effects,onToggleAudio}:Props){
 return <div className={(dead?"stage memorial":"stage")+effects.map(x=>" fx-"+x).join("")+" mood-"+mood}><div className="paperlabel"><b/> {dead?"BYTE IST GESTORBEN":"BYTE IST DA"}</div><button className="speaker" onClick={onToggleAudio} aria-label={audio?"Ton ausschalten":"Ton einschalten"} title={audio?"Ton an":"Ton aus"}>{audio?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><div className="sun"/><span className="tw t1">✦</span><span className="tw t2">✧</span><span className="tw t3">✦</span><span className="cross">✧</span><span className="speech" aria-live="polite">{dead?"♡":message||({happy:"schnurr!",normal:"miau!",lonely:"miau …",sulking:"…"} as Record<string,string>)[mood]||"miau!"}</span><div className="shadow"/><img className={"cat "+pose} src={dead?"/art/schlaf.svg":pose==="study"?"/art/code.svg":pose==="play"?"/art/pfote.svg":"/art/hero.svg"} alt="Byte, eine orange getigerte Kurskatze mit mintgrünem Halstuch"/><Bowl/><span className="stagecaption">ABB. 01 — FELIS CAMPUS</span></div>;
}
