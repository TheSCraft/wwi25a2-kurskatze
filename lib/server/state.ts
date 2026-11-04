import {db,sql,unit,roster} from "./db";
import {foodLifetime,sharedPause} from "../cat-rules";
import type {Identity} from "./auth";
import {weekStart,nextWeekStart} from "../week";

export async function state(who:Identity){
 const now=Date.now(), id=who.player||"";
 const [,c,r,p,t,rev,team,ev,wk]=await db().batch([sql("INSERT OR IGNORE INTO events(key,type,player,at) SELECT 'died:'||food_expires,'died',NULL,food_expires FROM cat WHERE id=1 AND food_expires<=?",now),sql("SELECT food_expires AS food,love,calls,active FROM cat WHERE id=1"),sql("SELECT name,points FROM players JOIN accounts ON accounts.player=players.id WHERE accounts.password IS NOT NULL ORDER BY points DESC,last ASC LIMIT 100"),sql("SELECT name,points FROM players WHERE id=?",id),sql("SELECT action,until FROM cooldowns WHERE player=? AND until>?",id,now),sql(`SELECT count(*) AS total,count(CASE WHEN fed_round=food_expires THEN 1 END) AS fed,coalesce(max(player=?),0) AS eligible,coalesce(max(player=? AND fed_round=food_expires),0) AS contributed FROM cat JOIN accounts ON ${roster} WHERE cat.id=1 AND food_expires<=?`,id,id,now),sql("SELECT count(*) AS total FROM accounts WHERE password IS NOT NULL"),sql("SELECT e.id AS id,e.type AS type,e.at AS at,p.name AS name FROM events e LEFT JOIN players p ON p.id=e.player ORDER BY e.at DESC,e.id DESC LIMIT 10"),sql("SELECT p.name AS name,sum(a.points) AS points FROM actions a JOIN players p ON p.id=a.player JOIN accounts ac ON ac.player=p.id WHERE ac.password IS NOT NULL AND a.at>=? GROUP BY a.player ORDER BY sum(a.points) DESC,max(a.at) ASC LIMIT 100",weekStart(now))]);
 const revival=rev.results[0] as {total:number;fed:number;eligible:number;contributed:number};
 const cat=c.results[0] as {food:number;love:number;calls:number;active:number};
 return {weekBoard:wk.results,weekStart:weekStart(now),weekEnd:nextWeekStart(now),events:ev.results,playerCount:Number((team.results[0] as {total:number}).total),revival,food:Math.max(0,Math.ceil((cat.food-now)*100/foodLifetime)),love:Math.max(0,Math.ceil((cat.love-now)/unit)),calls:cat.calls,board:r.results,me:p.results[0]||null,account:who.account,foodExpires:cat.food,sharedUntil:cat.active+sharedPause,now,cooldowns:Object.fromEntries(t.results.map(row=>{const x=row as {action:string;until:number};return [x.action,x.until]}))};
}
