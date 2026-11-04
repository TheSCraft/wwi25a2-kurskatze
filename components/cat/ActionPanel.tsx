import {Fish,HandHeart,AudioLines,Gamepad2,Brush,BookOpen} from "lucide-react";
import {rules,actionGain} from "../../lib/cat-rules";
import {effectivePoints,foodFactor,type Mood} from "../../lib/mood";
import type {Data} from "../../lib/cat-types";

const actions=[["food","Füttern",Fish],["love","Streicheln",HandHeart],["meow","Miauen",AudioLines],["play","Spielen",Gamepad2],["brush","Bürsten",Brush],["study","Lernen",BookOpen]] as const;
function duration(seconds:number){const hours=Math.floor(seconds/3600);return (hours?hours+" h ":"")+Math.floor(seconds%3600/60)+":"+String(seconds%60).padStart(2,"0")}

type Props={mood:Mood;data:Data|null;now:number;busy:boolean;onAction:(a:string)=>void;onLogin:()=>void};

export function ActionPanel({mood,data,now,busy,onAction,onLogin}:Props){
 function benefit(action:keyof typeof rules){const rule=rules[action];const amount=actionGain(rule.food||rule.love,data?.playerCount||0)*(rule.food?foodFactor(mood):1);return amount?"+ "+amount.toLocaleString("de",{maximumFractionDigits:1})+" % "+(rule.food?"Sättigung":"Zuneigung"):(mood==="sulking"&&action==="meow"?"Byte schmollt":"Miau für den Kurs")}
 function remaining(a:string){return data?Math.max(0,Math.ceil((Math.max(data.sharedUntil,data.cooldowns[a]||0)-now)/1000)):0}
 return <div className="actions">{actions.map(([a,label,I])=><button key={a} className={a} onClick={()=>data?.account?onAction(a):onLogin()} disabled={busy||!data||remaining(a)>0||(a==="meow"&&mood==="sulking")}><I size={21}/><span>{label}<small>{remaining(a)>0?"in "+duration(remaining(a)):"+"+effectivePoints(a,rules[a].points,mood)+" Pkt."}</small><small>{benefit(a)}</small></span></button>)}</div>;
}
