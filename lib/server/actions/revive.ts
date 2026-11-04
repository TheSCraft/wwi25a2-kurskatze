import {db,sql,roster} from "../db";
import {response,type Body} from "../http";
import {state} from "../state";
import {foodLifetime} from "../../cat-rules";
import type {Member} from "../auth";

export async function handleRevive(body:Body, who:Member, now:number){
  const round=body.round;
  if(!Number.isSafeInteger(round)||typeof round!=="number"||round>now)return response({error:"Diese Futterrunde ist nicht aktiv."},400);
  const [vote]=await db().batch([
   sql("UPDATE accounts SET fed_round=? WHERE player=? AND password IS NOT NULL AND COALESCE(joined,0)<=? AND fed_round IS NOT ? AND EXISTS(SELECT 1 FROM cat WHERE id=1 AND food_expires=?)",round,who.player,round,round,round),
   sql(`UPDATE cat SET food_expires=?,active=? WHERE id=1 AND food_expires=? AND changes()>0 AND NOT EXISTS(SELECT 1 FROM accounts WHERE ${roster} AND fed_round IS NOT ?)`,now+foodLifetime,now,round,round)]);
  const data=await state(who);
  return vote.meta.changes?response(data):response({...data,error:"Deine Portion ist bereits gezählt oder diese Runde ist für dich geschlossen."},409);
}
