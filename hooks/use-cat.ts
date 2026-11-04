"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import type {Data} from "../lib/cat-types";

const sessionKey="byte-session-v2";
function sessionHeaders():Record<string,string>{const session=localStorage.getItem(sessionKey);return session?{"X-Byte-Session":session}:{}}
export class ApiError extends Error{constructor(message:string,readonly status:number){super(message)}}

/** Zustand von Byte: Polling alle 8 s, Uhr im Sekundentakt mit Server-Zeit-Offset, Session-Header, Revision-Zähler gegen veraltete Antworten, send(). */
export function useCat(){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[now,setNow]=useState(0);
 const sending=useRef(false),offset=useRef(0),revision=useRef(0);
 const apply=useCallback((next:Data)=>{offset.current=next.now-Date.now();setNow(next.now);setData(next)},[]);
 useEffect(()=>{
  let active=true;
  async function refresh(){const revisionAtStart=revision.current;try{const res=await fetch("/api/cat",{cache:"no-store",headers:sessionHeaders()});if(!res.ok)throw Error();const next=await res.json() as Data;if(active&&!sending.current&&revisionAtStart===revision.current){apply(next);setError("")}}catch{if(active)setError("Byte ist gerade offline. Wir versuchen es gleich erneut.")}}
  refresh();
  const poll=setInterval(refresh,8000),clock=setInterval(()=>setNow(Date.now()+offset.current),1000);
  return()=>{active=false;clearInterval(poll);clearInterval(clock)};
 },[apply]);
 /** Liefert die neuen Daten, null wenn schon eine Anfrage läuft; wirft bei Fehlern (ApiError bei HTTP-Fehlern). */
 const send=useCallback(async(action:string,fields:Record<string,string|number>={}):Promise<Data|null>=>{
  if(sending.current)return null;
  revision.current++;sending.current=true;setBusy(true);setError("");
  try{
   const res=await fetch("/api/cat",{method:"POST",headers:{"Content-Type":"application/json",...sessionHeaders()},body:JSON.stringify({action,...fields})});
   const payload=await res.json() as Data&{error?:string;session?:string};
   if(!res.ok){
    if(payload.board)apply(payload);
    if(res.status===401&&!["login","register"].includes(action)){localStorage.removeItem(sessionKey);setData(prev=>prev?{...prev,account:false,me:null}:prev)}
    throw new ApiError(payload.error||"Versuch es noch einmal.",res.status);
   }
   if(action==="register"||action==="login"){
    if(!payload.session)throw Error("Die Sitzung konnte nicht gestartet werden.");
    localStorage.setItem(sessionKey,payload.session);
    const check=await fetch("/api/cat",{cache:"no-store",headers:sessionHeaders()});
    if(!check.ok)throw Error("Die Anmeldung konnte nicht bestätigt werden.");
    const verified=await check.json() as Data;
    if(!verified.account){localStorage.removeItem(sessionKey);throw Error("Die Anmeldung konnte auf diesem Gerät nicht gespeichert werden.")}
    apply(verified);return verified;
   }
   if(action==="logout")localStorage.removeItem(sessionKey);
   apply(payload);return payload;
  }finally{revision.current++;sending.current=false;setBusy(false)}
 },[apply]);
 return {data,error,setError,busy,now,send};
}
