"use client";
import {useSyncExternalStore} from "react";
import {prepareMeow,playMeow} from "../lib/meow-sound";

const key="byte-sound",changed="byte-sound-change";
function subscribe(notify:()=>void){window.addEventListener(changed,notify);return ()=>window.removeEventListener(changed,notify)}
const read=()=>localStorage.getItem(key)!=="off";
/** Ton ist standardmäßig an (nur ein gespeichertes "off" schaltet ihn aus); Server und erster Client-Render sehen "an", danach gilt der gespeicherte Wert. */
export function useSound(){
 const audio=useSyncExternalStore(subscribe,read,()=>true);
 // Beim Einschalten den AudioContext im Klick-Handler starten und zur Probe miauen.
 function toggle(){if(!audio){prepareMeow();playMeow()}localStorage.setItem(key,audio?"off":"on");window.dispatchEvent(new Event(changed))}
 return [audio,toggle] as const;
}
