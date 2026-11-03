import {env} from "cloudflare:workers";
import {lifetime, rules, sharedPause} from "../../../lib/cat-rules";

const unit=360000, month=30*86400000;
const db=()=>env.DB!;
const sql=(s:string,...v:(string|number)[])=>db().prepare(s).bind(...v);
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join("");
async function digest(value:string){
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
}
function cookie(req:Request,name:string){return (req.headers.get("cookie")||"").split(/;\s*/).find(c=>c.startsWith(name+"="))?.slice(name.length+1)||""}
async function identity(req:Request){
 const raw=cookie(req,"byte_session");
 if(/^[a-f0-9]{32}$/.test(raw)){
  const player=await sql("SELECT player FROM sessions WHERE token=? AND expires>?",await digest(raw),Date.now()).first<string>("player");
  if(player)return {player,account:true};
 }
 const old=cookie(req,"campuskatze");
 const player=/^[a-f0-9-]{36}$/.test(old)?await sql("SELECT id FROM players WHERE id=? AND NOT EXISTS(SELECT 1 FROM accounts WHERE player=?)",old,old).first<string>("id"):null;
 return {player,account:false};
}
type Identity=Awaited<ReturnType<typeof identity>>;
async function initialize(now:number){
 await db().batch([sql("INSERT OR IGNORE INTO cat(id,food,love,calls,active) VALUES(1,?,?,0,?)",now+72*unit,now+84*unit,now),
 sql("UPDATE cat SET active=COALESCE((SELECT MAX(last) FROM players WHERE last>0),?) WHERE id=1 AND active IS NULL",now)]);
}
async function state(who:Identity){
 const now=Date.now(), id=who.player||"";
 const [c,r,p,t]=await db().batch([sql("SELECT food,love,calls,active FROM cat WHERE id=1"),sql("SELECT name,points FROM players ORDER BY points DESC,last ASC LIMIT 100"),sql("SELECT name,points FROM players WHERE id=?",id),sql("SELECT action,until FROM cooldowns WHERE player=? AND until>?",id,now)]);
 const cat=c.results[0] as {food:number;love:number;calls:number;active:number};
 return {food:Math.max(0,Math.ceil((cat.food-now)/unit)),love:Math.max(0,Math.ceil((cat.love-now)/unit)),calls:cat.calls,board:r.results,me:p.results[0]||null,account:who.account,expires:cat.active+lifetime,sharedUntil:cat.active+sharedPause,now,cooldowns:Object.fromEntries(t.results.map(row=>{const x=row as {action:string;until:number};return [x.action,x.until]}))};
}
function response(data:unknown,status=200,session?:string){
 const h=new Headers({"Cache-Control":"no-store"});if(session!==undefined)h.set("Set-Cookie","byte_session="+session+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age="+(session?month/1000:0));
 return Response.json(data,{status,headers:h});
}
export async function GET(req:Request){await initialize(Date.now());return response(await state(await identity(req)))}
export async function POST(req:Request){
 if(!req.headers.get("content-type")?.startsWith("application/json")||(req.headers.get("origin") && req.headers.get("origin")!==new URL(req.url).origin))return response({error:"Unzulässige Anfrage."},403);
 const body=await req.json().catch(()=>null) as {action?:string;name?:string;code?:string}|null;
 if(!body||typeof body.action!=="string")return response({error:"Ungültige Anfrage."},400);
 const {action}=body,now=Date.now(),who=await identity(req);
 await initialize(now);
 if(action==="logout"){
  await sql("DELETE FROM sessions WHERE token=?",await digest(cookie(req,"byte_session"))).run();
  return response(await state({player:null,account:false}),200,"");
 }
 if(action==="register"||action==="login"){
  let id=who.player,code="";
  const session=secret(),sessionHash=await digest(session);
  if(action==="register"){
   if(who.account)return response({error:"Du bist schon angemeldet."},409);
   const name=typeof body.name==="string"?body.name.trim():"";
   if(!name||name.length>22)return response({error:"Bitte gib einen Spitznamen mit höchstens 22 Zeichen ein."},400);
   id=id||crypto.randomUUID();code=secret();
   try{await db().batch([sql("INSERT INTO accounts(player,key) VALUES(?,?)",id,await digest(code)),sql("INSERT INTO players(id,name,points,last) VALUES(?,?,0,0) ON CONFLICT(id) DO UPDATE SET name=excluded.name",id,name),sql("INSERT INTO sessions VALUES(?,?,?)",sessionHash,id,now+month)])}
   catch(e){if(String(e).includes("UNIQUE"))return response({error:"Dieses Profil hat schon einen Login. Nutze deinen Pfotencode."},409);throw e}
  }else{
   const key=typeof body.code==="string"?body.code.toLowerCase().replace(/[\s-]/g,""):"";
   id=/^[0-9a-f]{32}$/.test(key)?await sql("SELECT player FROM accounts WHERE key=?",await digest(key)).first<string>("player"):null;
   if(!id)return response({error:"Dieser Pfotencode ist ungültig."},401);
   await sql("INSERT INTO sessions VALUES(?,?,?)",sessionHash,id,now+month).run();
  }
  return response({...await state({player:id,account:true}),code:code.match(/.{4}/g)?.join("-")},200,session);
 }
 if(!who.account||!who.player)return response({error:"Bitte melde dich an."},401);
 if(action==="rename"){
  const name=typeof body.name==="string"?body.name.trim():"";if(!name||name.length>22)return response({error:"Ungültiger Spitzname."},400);
  await sql("UPDATE players SET name=? WHERE id=?",name,who.player).run();return response(await state(who));
 }
 if(!Object.hasOwn(rules,action))return response({error:"Unbekannte Aktion."},400);
 const rule=rules[action as keyof typeof rules],slot=who.player+"/"+action;
 // The batch serializes the eligibility check, points and shared cat update.
 const [accepted]=await db().batch([
  sql("INSERT INTO cooldowns(id,player,action,until) SELECT ?,?,?,? FROM cat WHERE id=1 AND active>? AND active<=? ON CONFLICT(id) DO UPDATE SET until=excluded.until WHERE cooldowns.until<=?",slot,who.player,action,now+rule.seconds*1000,now-lifetime,now-sharedPause,now),
  sql("UPDATE players SET points=points+?,last=? WHERE id=? AND changes()>0",rule.points,now,who.player),
  sql("UPDATE cat SET active=?,food=CASE WHEN ?>0 THEN min(?,max(food,?)+?) ELSE food END,love=CASE WHEN ?>0 THEN min(?,max(love,?)+?) ELSE love END,calls=calls+? WHERE id=1 AND changes()>0",now,rule.food,now+100*unit,now,rule.food*unit,rule.love,now+100*unit,now,rule.love*unit,Number(action==="meow"))]);
 const data=await state(who);
 return accepted.meta.changes?response(data):response({...data,error:data.expires<=now?"Byte ist gestorben.":"Byte braucht noch einen Moment."},data.expires<=now?410:429);
}
