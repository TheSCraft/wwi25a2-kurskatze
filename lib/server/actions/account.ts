import {sql,db,digest,secret,passwordHash,loginKey,roster,month} from "../db";
import {response,type Body} from "../http";
import {state} from "../state";
import type {Identity,Member} from "../auth";

export async function handleLogout(req:Request){
  await sql("DELETE FROM sessions WHERE token=?",await digest(req.headers.get("x-byte-session")||"")).run();
  return response(await state({player:null,account:false}));
}

export async function handleCredentials(req:Request, body:Body, who:Identity, now:number){
 const {action}=body;
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

export async function handleRename(_req:Request, body:Body, who:Member){
  const name=typeof body.name==="string"?body.name.trim():"";if(!name||name.length>22)return response({error:"Ungültiger Spitzname."},400);
  try{await db().batch([sql("UPDATE accounts SET key=? WHERE player=?",loginKey(name),who.player),sql("UPDATE players SET name=? WHERE id=?",name,who.player)])}catch(e){if(String(e).includes("UNIQUE"))return response({error:"Dieser Spitzname ist schon vergeben."},409);throw e}return response(await state(who));
}
