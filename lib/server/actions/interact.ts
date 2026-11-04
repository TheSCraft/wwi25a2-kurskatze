import {db,sql,unit} from "../db";
import {response,type Body} from "../http";
import {state} from "../state";
import {rules,foodLifetime,sharedPause,minimumTeamSize} from "../../cat-rules";
import type {Member} from "../auth";
import {moodLevel,effectivePoints,foodFactor} from "../../mood";
import {settleStatement} from "../settle";

// Die Bedingung `love=?` ist der Guard: hat sich die Zuneigung seit dem Lesen geändert, wird nichts geschrieben.
export const cooldownSql="INSERT INTO cooldowns(id,player,action,until) SELECT ?,?,?,? FROM cat WHERE id=1 AND food_expires>? AND active<=? AND love=? ON CONFLICT(id) DO UPDATE SET until=excluded.until WHERE cooldowns.until<=?";

export async function handleInteract(body:Body, who:Member, now:number){
 const {action}=body as {action:string};
 if(!Object.hasOwn(rules,action))return response({error:"Unbekannte Aktion."},400);
 const rule=rules[action as keyof typeof rules],slot=who.player+"/"+action;
 // Zuneigung vor dem Batch lesen: Stufe, Punkte und Futterwirkung werden vor dem Batch bestimmt (Guard `love=?` im Cooldown).
 const cat=await db().prepare("SELECT love FROM cat WHERE id=1").first<{love:number}>();
 const love=cat?cat.love:0,level=moodLevel(love,now);
 if(level==="sulking"&&action==="meow"){const data=await state(who);return response({...data,error:data.food===0?"Byte ist gestorben. Beteilige dich an der gemeinsamen Futterrunde.":"Byte schmollt und antwortet nicht."},409)}
 const points=effectivePoints(action,rule.points,level),foodGain=rule.food*foodLifetime/100*foodFactor(level);
 // The batch serializes the eligibility check, points and shared cat update.
 const [,accepted]=await db().batch([settleStatement(now),
  sql(cooldownSql,slot,who.player,action,now+rule.seconds*1000,now,now-sharedPause,love,now),
  sql("UPDATE players SET points=points+?,last=? WHERE id=? AND changes()>0",points,now,who.player),
  // Count accounts inside the same atomic batch, including concurrent registrations.
  sql("UPDATE cat SET active=?,food_expires=min(?,food_expires+CAST(? / max(?,(SELECT count(*) FROM accounts WHERE password IS NOT NULL)) AS INTEGER)),love=CASE WHEN ?>0 THEN min(?,max(love,?)+? / max(?,(SELECT count(*) FROM accounts WHERE password IS NOT NULL))) ELSE love END,calls=calls+?,actions=actions+1 WHERE id=1 AND changes()>0",now,now+foodLifetime,foodGain,minimumTeamSize,rule.love,now+100*unit,now,rule.love*unit,minimumTeamSize,Number(action==="meow")),sql("INSERT INTO actions(player,action,points,at) SELECT ?,?,?,? WHERE changes()>0",who.player,action,points,now)]);
 const data=await state(who);
 if(accepted.meta.changes)return response(data);
 return data.food===0?response({...data,error:"Byte ist gestorben. Beteilige dich an der gemeinsamen Futterrunde."},409):response({...data,error:"Byte braucht noch einen Moment."},429);
}
