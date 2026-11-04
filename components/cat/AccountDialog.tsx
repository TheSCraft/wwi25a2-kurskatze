"use client";
import {useEffect,useRef,useState} from "react";
import {X} from "lucide-react";

export type DialogMode="register"|"login"|"profile";
type Props={open:boolean;initialMode:DialogMode;initialName:string;busy:boolean;error:string;onClose:()=>void;onSwitchMode:()=>void;onSubmit:(action:string,fields:Record<string,string>)=>void};

/** Die Seite gibt beim Öffnen und beim Schließen einen neuen key mit, dadurch starten Modus, Name und Passwort frisch und ein eingegebenes Passwort bleibt nach dem Schließen nicht im DOM. */
export function AccountDialog({open,initialMode,initialName,busy,error,onClose,onSwitchMode,onSubmit}:Props){
 const [mode,setMode]=useState<DialogMode>(initialMode),[draft,setDraft]=useState(initialName),[password,setPassword]=useState("");
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open]);
 return <dialog ref={dialog} onCancel={e=>{if(busy)e.preventDefault();else onClose()}}><form onSubmit={e=>{e.preventDefault();onSubmit(mode==="profile"?"rename":mode,mode==="profile"?{name:draft}:{name:draft,password})}}>
<button disabled={busy} type="button" className="close" onClick={onClose} aria-label="Schließen"><X/></button>
<small>WWI25A2 · KURSKONTO</small><h2>{mode==="profile"?"Dein Profil":mode==="login"?"Willkommen zurück!":"Konto erstellen"}</h2>
<p>{mode==="profile"?"Mit deinem Spitznamen und Passwort kannst du dich auch auf einem anderen Gerät anmelden.":mode==="login"?"Melde dich mit deinem Spitznamen und Passwort an.":"Wähle deinen Spitznamen für die Rangliste und ein eigenes Passwort."}</p>
<label>Spitzname<input required name="username" autoComplete="username" maxLength={22} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="z. B. Schnurrbert"/></label>
{mode!=="profile"&&<label style={{marginTop:12}}>Passwort<input required name="password" type="password" autoComplete={mode==="login"?"current-password":"new-password"} minLength={mode==="register"?8:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="register"?"Mindestens 8 Zeichen":"Dein Passwort"}/></label>}
{error&&<p role="alert">{error}</p>}<button className="save" disabled={busy||!draft.trim()||(mode!=="profile"&&!password)}>{mode==="profile"?"Spitznamen speichern":mode==="login"?"Anmelden":"Konto erstellen"}</button>
{mode==="profile"?<button type="button" disabled={busy} className="formlink" onClick={()=>onSubmit("logout",{})}>Auf diesem Gerät abmelden</button>:<button type="button" disabled={busy} className="formlink" onClick={()=>{setMode(mode==="register"?"login":"register");setPassword("");onSwitchMode()}}>{mode==="login"?"Neu hier? Konto erstellen":"Schon registriert? Anmelden"}</button>}</form></dialog>;
}
