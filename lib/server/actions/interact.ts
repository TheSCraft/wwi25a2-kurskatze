import {db,sql,unit} from "../db";
import {response,type Body} from "../http";
import {state} from "../state";
import {rules,foodLifetime,sharedPause} from "../../cat-rules";
import type {Member} from "../auth";

export async function handleInteract(body:Body, who:Member, now:number){
 const {action}=body as {action:string};
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
