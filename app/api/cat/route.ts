import {env} from "cloudflare:workers";
import {foodLifetime, rules, sharedPause} from "../../../lib/cat-rules";

const unit=360000, month=30*86400000;
const db=()=>env.DB!;
const sql=(s:string,...v:(string|number)[])=>db().prepare(s).bind(...v);
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join("");
async function digest(value:string){
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
}
async function passwordHash(password:string,salt:string){
 const encoder=new TextEncoder();
 const material=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-512",iterations:100000,salt:encoder.encode(salt)},material,256);
 return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,"0")).join("");
}
function loginKey(name:string){return "user:"+name.normalize("NFKC").toLowerCase()}
async function identity(req:Request){
 const token=req.headers.get("x-byte-session")||"";
 const player=/^[a-f0-9]{32}$/.test(token)?await sql("SELECT s.player FROM sessions s JOIN accounts a ON a.player=s.player WHERE s.token=? AND s.expires>? AND a.password IS NOT NULL",await digest(token),Date.now()).first<string>("player"):null;
 return {player,account:!!player};
}
type Identity=Awaited<ReturnType<typeof identity>>;
async function initialize(now:number){
 await db().batch([sql("INSERT OR IGNORE INTO cat(id,food,love,calls,active) VALUES(1,?,?,0,?)",now+72*unit,now+84*unit,now),
 sql("UPDATE cat SET food_expires=? + min(?,max(0,food-?))*?/ ? WHERE id=1 AND food_expires IS NULL",now,100*unit,now,foodLifetime,100*unit),
 sql("UPDATE cat SET active=COALESCE((SELECT MAX(last) FROM players WHERE last>0),?) WHERE id=1 AND active IS NULL",now)]);
}
// Existing password accounts predate this feature, so a NULL join time counts as zero.
const roster="password IS NOT NULL AND COALESCE(joined,0)<=food_expires";
async function state(who:Identity){
 const now=Date.now(), id=who.player||"";
 const [c,r,p,t,rev]=await db().batch([sql("SELECT food_expires AS food,love,calls,active FROM cat WHERE id=1"),sql("SELECT name,points FROM players JOIN accounts ON accounts.player=players.id WHERE accounts.password IS NOT NULL ORDER BY points DESC,last ASC LIMIT 100"),sql("SELECT name,points FROM players WHERE id=?",id),sql("SELECT action,until FROM cooldowns WHERE player=? AND until>?",id,now),sql(`SELECT count(*) AS total,count(CASE WHEN fed_round=food_expires THEN 1 END) AS fed,coalesce(max(player=?),0) AS eligible,coalesce(max(player=? AND fed_round=food_expires),0) AS contributed FROM cat JOIN accounts ON ${roster} WHERE cat.id=1 AND food_expires<=?`,id,id,now)]);
 const revival=rev.results[0] as {total:number;fed:number;eligible:number;contributed:number};
 const cat=c.results[0] as {food:number;love:number;calls:number;active:number};
 return {revival,food:Math.max(0,Math.ceil((cat.food-now)*100/foodLifetime)),love:Math.max(0,Math.ceil((cat.love-now)/unit)),calls:cat.calls,board:r.results,me:p.results[0]||null,account:who.account,foodExpires:cat.food,sharedUntil:cat.active+sharedPause,now,cooldowns:Object.fromEntries(t.results.map(row=>{const x=row as {action:string;until:number};return [x.action,x.until]}))};
}
function response(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"private, no-store","Vary":"X-Byte-Session"}})}
export async function GET(req:Request){await initialize(Date.now());return response(await state(await identity(req)))}
export async function POST(req:Request){
 if(!req.headers.get("content-type")?.startsWith("application/json")||req.headers.get("sec-fetch-site")==="cross-site")return response({error:"Unzulässige Anfrage."},403);
 const body=await req.json().catch(()=>null) as {action?:string;name?:string;password?:string;round?:number}|null;
 if(!body||typeof body.action!=="string")return response({error:"Ungültige Anfrage."},400);
 const {action}=body,now=Date.now(),who=await identity(req);
 await initialize(now);
 if(action==="logout"){
  await sql("DELETE FROM sessions WHERE token=?",await digest(req.headers.get("x-byte-session")||"")).run();
  return response(await state({player:null,account:false}));
 }
 if(action==="register"||action==="login"){
  const name=typeof body.name==="string"?body.name.trim():"";
  const password=body.password;
  if(!name||name.length>22||typeof password!=="string"||password.length>128||!password.length)return response({error:"Bitte prüfe Spitzname und Passwort."},400);
  const key=loginKey(name), session=secret(),sessionHash=await digest(session);
  let id:string;
  if(action==="register"){
   if(who.account)return response({error:"Du bist bereits angemeldet."},409);
   if(password.length<8)return response({error:"Nutze mindestens 8 Zeichen für dein Passwort."},400);
   const salt=secret(),stored=salt+":"+await passwordHash(password,salt);id=crypto.randomUUID();
   try{await db().batch([sql("INSERT INTO accounts(player,key,password,joined) SELECT ?,?,?,CASE WHEN food_expires<=? AND NOT EXISTS(SELECT 1 FROM accounts WHERE "+roster+") THEN food_expires ELSE ? END FROM cat WHERE id=1",id,key,stored,now,now),sql("INSERT INTO players(id,name,points,last) VALUES(?,?,0,0)",id,name),sql("INSERT INTO sessions VALUES(?,?,?)",sessionHash,id,now+month)])}
   catch(e){if(String(e).includes("UNIQUE"))return response({error:"Dieser Spitzname ist schon vergeben."},409);throw e}
  }else{
   const bucket=await digest((req.headers.get("cf-connecting-ip")||"local")+"|"+key);
   const attempt=await sql("INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET tries=CASE WHEN reset<=? THEN 1 ELSE tries+1 END,reset=CASE WHEN reset<=? THEN excluded.reset ELSE reset END WHERE reset<=? OR tries<12",bucket,now+300000,now,now,now).run();
   if(!attempt.meta.changes)return response({error:"Zu viele Versuche. Bitte warte fünf Minuten."},429);
   const account=await sql("SELECT player,password FROM accounts WHERE key=? AND password IS NOT NULL",key).first<{player:string;password:string}>();
   const [salt,expected]=(account?.password||"00000000000000000000000000000000:"+"0".repeat(64)).split(":");
   const actual=await passwordHash(password,salt);
   let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);
   if(!account||diff)return response({error:"Spitzname oder Passwort ist falsch."},401);
   id=account.player;
   await db().batch([sql("INSERT INTO sessions VALUES(?,?,?)",sessionHash,id,now+month),sql("DELETE FROM login_attempts WHERE key=?",bucket)]);
  }
  return response({...await state({player:id,account:true}),session});

 }
 if(!who.account||!who.player)return response({error:"Bitte melde dich an."},401);
 if(action==="rename"){
  const name=typeof body.name==="string"?body.name.trim():"";if(!name||name.length>22)return response({error:"Ungültiger Spitzname."},400);
  try{await db().batch([sql("UPDATE accounts SET key=? WHERE player=?",loginKey(name),who.player),sql("UPDATE players SET name=? WHERE id=?",name,who.player)])}catch(e){if(String(e).includes("UNIQUE"))return response({error:"Dieser Spitzname ist schon vergeben."},409);throw e}return response(await state(who));
 }
 if(action==="revive"){
  const round=body.round;
  if(!Number.isSafeInteger(round)||typeof round!=="number"||round>now)return response({error:"Diese Futterrunde ist nicht aktiv."},400);
  const [vote]=await db().batch([
   sql("UPDATE accounts SET fed_round=? WHERE player=? AND password IS NOT NULL AND COALESCE(joined,0)<=? AND fed_round IS NOT ? AND EXISTS(SELECT 1 FROM cat WHERE id=1 AND food_expires=?)",round,who.player,round,round,round),
   sql(`UPDATE cat SET food_expires=?,active=? WHERE id=1 AND food_expires=? AND changes()>0 AND NOT EXISTS(SELECT 1 FROM accounts WHERE ${roster} AND fed_round IS NOT ?)`,now+foodLifetime,now,round,round)]);
  const data=await state(who);
  return vote.meta.changes?response(data):response({...data,error:"Deine Portion ist bereits gezählt oder diese Runde ist für dich geschlossen."},409);
 }
 if(!Object.hasOwn(rules,action))return response({error:"Unbekannte Aktion."},400);
 const rule=rules[action as keyof typeof rules],slot=who.player+"/"+action;
 // The batch serializes the eligibility check, points and shared cat update.
 const [accepted]=await db().batch([
  sql("INSERT INTO cooldowns(id,player,action,until) SELECT ?,?,?,? FROM cat WHERE id=1 AND food_expires>? AND active<=? ON CONFLICT(id) DO UPDATE SET until=excluded.until WHERE cooldowns.until<=?",slot,who.player,action,now+rule.seconds*1000,now,now-sharedPause,now),
  sql("UPDATE players SET points=points+?,last=? WHERE id=? AND changes()>0",rule.points,now,who.player),
  sql("UPDATE cat SET active=?,food_expires=CASE WHEN ?>0 THEN ? ELSE food_expires END,love=CASE WHEN ?>0 THEN min(?,max(love,?)+?) ELSE love END,calls=calls+? WHERE id=1 AND changes()>0",now,rule.food,now+foodLifetime,rule.love,now+100*unit,now,rule.love*unit,Number(action==="meow"))]);
 const data=await state(who);
 if(accepted.meta.changes)return response(data);
 return data.food===0?response({...data,error:"Byte ist gestorben. Beteilige dich an der gemeinsamen Futterrunde."},409):response({...data,error:"Byte braucht noch einen Moment."},429);
}
