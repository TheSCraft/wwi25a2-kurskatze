import {env} from "cloudflare:workers";
const unit=360000;
async function state(id:string){
 const db=env.DB!,now=Date.now();
 await db.prepare("INSERT OR IGNORE INTO cat VALUES(1,?,?,0)").bind(now+72*unit,now+84*unit).run();
 const [c,r,p]=await db.batch([db.prepare("SELECT * FROM cat WHERE id=1"),db.prepare("SELECT name,points FROM players ORDER BY points DESC,last ASC LIMIT 100"),db.prepare("SELECT name,points,last FROM players WHERE id=?").bind(id)]);
 const v=c.results[0] as {food:number;love:number;calls:number};return {food:Math.max(0,Math.ceil((Number(v.food)-now)/unit)),love:Math.max(0,Math.ceil((Number(v.love)-now)/unit)),calls:v.calls,board:r.results,me:p.results[0]||null};
}
function token(req:Request){return req.headers.get("cookie")?.match(/(?:^|; )campuskatze=([a-f0-9-]{36})(?:;|$)/)?.[1]||crypto.randomUUID()}
function respond(data:unknown,id:string){return Response.json(data,{headers:{"Cache-Control":"no-store","Set-Cookie":"campuskatze="+id+"; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000"}})}
export async function GET(req:Request){const id=token(req);return respond(await state(id),id)}
export async function POST(req:Request){
 const {name,action}=await req.json() as {name:unknown;action:string};if(typeof name!=="string"||!name.trim()||name.trim().length>22||!["food","love","meow","rename"].includes(action))return new Response("Ungültige Eingabe",{status:400});
 const db=env.DB!,id=token(req),now=Date.now();
 await state(id);
 if(action==="rename"){await db.prepare("UPDATE players SET name=? WHERE id=?").bind(name.trim(),id).run();return respond(await state(id),id)}
 const points=action==="meow"?1:5;
 const [updated]=await db.batch([
 db.prepare("INSERT INTO players VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,points=players.points+excluded.points,last=excluded.last WHERE players.last<=excluded.last-2000").bind(id,name.trim(),points,now),
 db.prepare("UPDATE cat SET food=CASE WHEN ?='food' THEN min(?,max(food,?)+?) ELSE food END,love=CASE WHEN ?='love' THEN min(?,max(love,?)+?) ELSE love END,calls=calls+(?='meow') WHERE id=1 AND changes()>0").bind(action,now+100*unit,now,12*unit,action,now+100*unit,now,12*unit,action)]);
 return respond({...await state(id),ok:updated.meta.changes>0},id)
}
