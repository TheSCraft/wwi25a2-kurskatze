"use client";
import {useEffect,useRef,useState} from "react";

export function useReaction(){
 const [message,setMessage]=useState(""),[pose,setPose]=useState("");
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 function say(next:string,nextPose:string){
  if(timer.current)clearTimeout(timer.current);
  setMessage(next);setPose(nextPose);
  timer.current=setTimeout(()=>{setMessage("");setPose("")},3500);
 }
 return {message,pose,say};
}
