"use client";
import {useSyncExternalStore} from "react";

const key="byte-sound",changed="byte-sound-change";
function subscribe(notify:()=>void){window.addEventListener(changed,notify);return ()=>window.removeEventListener(changed,notify)}
const read=()=>localStorage.getItem(key)==="on";
/** Server und erster Client-Render sehen "aus", danach gilt der gespeicherte Wert. */
export function useSound(){
 const audio=useSyncExternalStore(subscribe,read,()=>false);
 function toggle(){localStorage.setItem(key,audio?"off":"on");window.dispatchEvent(new Event(changed))}
 return [audio,toggle] as const;
}
