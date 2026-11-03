import {env} from "cloudflare:workers";

export const unit=360000, month=30*86400000;
export const db=()=>env.DB!;
export const sql=(s:string,...v:(string|number)[])=>db().prepare(s).bind(...v);
export const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join("");
export async function digest(value:string){
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function passwordHash(password:string,salt:string){
 const encoder=new TextEncoder();
 const material=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-512",iterations:100000,salt:encoder.encode(salt)},material,256);
 return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,"0")).join("");
}
export function loginKey(name:string){return "user:"+name.normalize("NFKC").toLowerCase()}
// Existing password accounts predate this feature, so a NULL join time counts as zero.
export const roster="password IS NOT NULL AND COALESCE(joined,0)<=food_expires";
