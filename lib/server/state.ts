import {db,sql,unit,roster} from "./db";
import {foodLifetime,sharedPause} from "../cat-rules";
import type {Identity} from "./auth";

export async function state(who:Identity){
 const now=Date.now(), id=who.player||"";
 const [c,r,p,t,rev]=await db().batch([sql("SELECT food_expires AS food,love,calls,active FROM cat WHERE id=1"),sql("SELECT name,points FROM players JOIN accounts ON accounts.player=players.id WHERE accounts.password IS NOT NULL ORDER BY points DESC,last ASC LIMIT 100"),sql("SELECT name,points FROM players WHERE id=?",id),sql("SELECT action,until FROM cooldowns WHERE player=? AND until>?",id,now),sql(`SELECT count(*) AS total,count(CASE WHEN fed_round=food_expires THEN 1 END) AS fed,coalesce(max(player=?),0) AS eligible,coalesce(max(player=? AND fed_round=food_expires),0) AS contributed FROM cat JOIN accounts ON ${roster} WHERE cat.id=1 AND food_expires<=?`,id,id,now)]);
 const revival=rev.results[0] as {total:number;fed:number;eligible:number;contributed:number};
 const cat=c.results[0] as {food:number;love:number;calls:number;active:number};
 return {revival,food:Math.max(0,Math.ceil((cat.food-now)*100/foodLifetime)),love:Math.max(0,Math.ceil((cat.love-now)/unit)),calls:cat.calls,board:r.results,me:p.results[0]||null,account:who.account,foodExpires:cat.food,sharedUntil:cat.active+sharedPause,now,cooldowns:Object.fromEntries(t.results.map(row=>{const x=row as {action:string;until:number};return [x.action,x.until]}))};
}
