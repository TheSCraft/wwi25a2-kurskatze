"use client";
import {useEffect,useRef,useState} from "react";
import {Trophy,Sticker,UserRound,House} from "lucide-react";
import {useCat,ApiError} from "../hooks/use-cat";
import {useReaction} from "../hooks/use-reaction";
import {useSound} from "../hooks/use-sound";
import {isDead,type Tab} from "../lib/cat-types";
import {prepareMeow,playMeow} from "../lib/meow-sound";
import {CatStage} from "../components/cat/CatStage";
import {ActionPanel} from "../components/cat/ActionPanel";
import {RevivalPanel} from "../components/cat/RevivalPanel";
import {StatusCard} from "../components/cat/StatusCard";
import {ScoreCard} from "../components/cat/ScoreCard";
import {ActivityCard} from "../components/cat/ActivityCard";
import {Leaderboard} from "../components/cat/Leaderboard";
import {GoalsCard} from "../components/cat/GoalsCard";
import {unlockedTitle,unlockedEffects} from "../lib/goals";
import {moodLevel} from "../lib/mood";
import {Stickerbox} from "../components/stickerbox";
import {AccountDialog,type DialogMode} from "../components/cat/AccountDialog";

const phrases={play:["Den Laserpunkt krieg ich noch!"],brush:["Fell-Update installiert."],study:["Heute: lineare Mieugression."],food:["SELECT * FROM Thunfisch;","Nom nom. Prüfung bestanden!"],love:["Schnurr.exe läuft.","Mehr davon, bitte."],meow:["MIAU. War das klausurrelevant?","Miau zurück, letzte Reihe!"]};
function pick(pool:readonly string[]){return pool[Math.floor(Math.random()*pool.length)]}

export default function Page(){
 const {data,error,setError,busy,now,send}=useCat();
 const {message,pose,say}=useReaction();
 const [tab,setTab]=useState<Tab>("Katzenzimmer"),[audio,toggleSound]=useSound();
 const [modal,setModal]=useState(false),[formError,setFormError]=useState(""),[dialogMode,setDialogMode]=useState<DialogMode>("register"),[dialogName,setDialogName]=useState(""),[dialogKey,setDialogKey]=useState(0);
 const dead=isDead(data,now);
 const reachedIds=data?.goals?Object.keys(data.goals.reached):[];
 const mood=data&&data.loveExpires!=null?moodLevel(data.loveExpires,now):"normal";
 const opener=useRef<HTMLElement|null>(null);
 // Erst nach dem Commit ist der alte (modale) Dialog weg, dann kann der Fokus zurück zum Auslöser.
 useEffect(()=>{if(!modal&&opener.current){if(opener.current.isConnected)opener.current.focus();opener.current=null}},[modal]);

 function openDialog(forced?:DialogMode){
  if(!modal&&document.activeElement instanceof HTMLElement)opener.current=document.activeElement;
  setDialogMode(forced??(data?.account?"profile":data?.me?"register":"login"));
  setDialogName(data?.me?.name||localStorage.getItem("byte-name")||"");
  setDialogKey(k=>k+1);setFormError("");setModal(true);
 }
 /** Neuer key beim Schließen: das Dialog-Passwort wird verworfen, bei Fehlern bleibt der Dialog offen. Den Fokus stellt der Effekt auf `modal` wieder her. */
 function closeDialog(){setDialogKey(k=>k+1);setModal(false)}
 async function run(action:string,fields:Record<string,string|number>={}){
  setFormError("");
  // AudioContext noch im Klick-Handler fortsetzen, bevor auf den Server gewartet wird (Mobilbrowser).
  if(action==="meow"&&audio)prepareMeow();
  try{
   const result=await send(action,fields);
   if(!result)return;
   if(["register","login","logout","rename"].includes(action))closeDialog();
   else if(action==="revive")say(result.food>0?"Miau! Ich bin wieder da!":"","");
   else{if(action==="meow"&&audio)playMeow();say(pick(phrases[action as keyof typeof phrases]),action)}
  }catch(e){
   if(e instanceof ApiError&&e.status===401&&!["login","register"].includes(action))openDialog("login");
   (modal?setFormError:setError)(e instanceof Error?e.message:"Verbindung fehlgeschlagen.");
  }
 }
 useEffect(()=>{function sync(){if(location.hash==="#stickerbox")setTab("Stickerbox");else if(location.hash==="#rangliste")setTab("Rangliste");else setTab("Katzenzimmer")}sync();window.addEventListener("hashchange",sync);return ()=>window.removeEventListener("hashchange",sync)},[]);
 function navigate(t:Tab){setTab(t);location.hash=t==="Stickerbox"?"stickerbox":t==="Rangliste"?"rangliste":"katzenzimmer";window.scrollTo({top:0,behavior:"smooth"})}

 return <><header><div className="bar"><button className="brand" onClick={()=>navigate("Katzenzimmer")}><img src="/cat.svg" alt=""/>Miau Campus<span>WWI25A2</span></button><nav>{(["Katzenzimmer","Rangliste","Stickerbox"] as Tab[]).map((x,i)=>{const I=[House,Trophy,Sticker][i];return <button key={x} aria-current={tab===x?"page":undefined} className={tab===x?"active":""} onClick={()=>navigate(x)}><I size={16}/>{x}</button>})}</nav><button className="profile" onClick={()=>openDialog()}><UserRound size={16}/>{data?.account?data.me?.name:"Anmelden"}</button></div></header><main>
<div className="eyebrow"><span className="dot"/> WWI25A2 <i>/</i> DIGITALER KURSMITBEWOHNER</div>
<h1>{tab==="Katzenzimmer"?"Das Katzenzimmer":tab==="Rangliste"?"Die Rangliste":"Die Stickerbox"}<em>.</em></h1>
<p className="sub">{tab==="Katzenzimmer"?"Ein Kurs, eine Katze und verdächtig viel Miau in der Vorlesung.":tab==="Rangliste"?"Wer hat Byte am häufigsten die Vorlesung versüßt?":"Byte für eure Folien, Chats und ausgedruckten Sticker."}</p>
{error&&<p role="alert">{error}</p>}
{tab==="Katzenzimmer"?<div className="columns"><section className="room">
<CatStage mood={mood} dead={dead} message={message} pose={pose} audio={audio} effects={unlockedEffects(reachedIds)} onToggleAudio={toggleSound}/>
<div className="actionarea"><div className="bytehead"><h2>Das ist Byte<span>.</span></h2><span className="tag">{unlockedTitle(reachedIds).toLocaleUpperCase("de")}</span></div><p>{dead?"Bytes Napf ist leer. Jetzt braucht er eine Portion von jedem Kurskonto.":"Professioneller Vorlesungsgast. Bestechlich mit Snacks."}</p>
{dead&&data?<RevivalPanel data={data} busy={busy} onRevive={()=>run("revive",{round:data.foodExpires})} onLogin={()=>openDialog()}/>:<ActionPanel mood={mood} data={data} now={now} busy={busy} onAction={a=>run(a)} onLogin={()=>openDialog()}/>}
</div></section>
<aside><StatusCard mood={mood} data={data} now={now}/>
<ScoreCard points={data?.me?.points||0} onBoard={()=>navigate("Rangliste")}/>
<ActivityCard events={data?.events} now={now}/>
<GoalsCard data={data?.goals}/></aside></div>:null}
{tab==="Rangliste"&&<Leaderboard data={data} now={now} onRoom={()=>navigate("Katzenzimmer")}/>}
{tab!=="Rangliste"&&<Stickerbox expanded={tab==="Stickerbox"} open={()=>navigate("Stickerbox")}/>}
<footer><span>Miau Campus · WWI25A2</span><span>Mit Pfoten programmiert.</span></footer></main>
<AccountDialog key={dialogKey} open={modal} initialMode={dialogMode} initialName={dialogName} busy={busy} error={formError} onClose={closeDialog} onSwitchMode={()=>setFormError("")} onSubmit={run}/></>}
