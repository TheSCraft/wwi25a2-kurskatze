import {db,sql,unit,roster} from "./db";
import {foodLifetime,sharedPause} from "../cat-rules";
import type {Identity} from "./auth";
import {weekStart,nextWeekStart} from "../week";
import {newlyReached,type Counters} from "../goals";

// Das unäre Plus vor a.player hält den Planer auf dem Index auf at (sonst Scan der ganzen Historie).
export const weekBoardSql="SELECT p.name AS name,sum(a.points) AS points FROM actions a JOIN players p ON p.id=a.player JOIN accounts ac ON ac.player=p.id WHERE ac.password IS NOT NULL AND a.at>=? GROUP BY +a.player ORDER BY sum(a.points) DESC,max(a.at) ASC LIMIT 100";
export const feedSql="SELECT e.id AS id,e.type AS type,e.at AS at,p.name AS name,e.detail AS detail FROM events e LEFT JOIN players p ON p.id=e.player ORDER BY e.at DESC,e.id DESC LIMIT 10";
const goalsSql="SELECT goal,at FROM goals_reached";

export async function state(who:Identity){
 const now=Date.now(), id=who.player||"";
 const [,c,r,p,t,rev,team,ev,wk,pt,rv,gr]=await db().batch([sql("INSERT OR IGNORE INTO events(key,type,player,at) SELECT 'died:'||food_expires,'died',NULL,food_expires FROM cat WHERE id=1 AND food_expires<=?",now),sql("SELECT food_expires AS food,love,calls,actions,active FROM cat WHERE id=1"),sql("SELECT name,points FROM players JOIN accounts ON accounts.player=players.id WHERE accounts.password IS NOT NULL ORDER BY points DESC,last ASC LIMIT 100"),sql("SELECT name,points FROM players WHERE id=?",id),sql("SELECT action,until FROM cooldowns WHERE player=? AND until>?",id,now),sql(`SELECT count(*) AS total,count(CASE WHEN fed_round=food_expires THEN 1 END) AS fed,coalesce(max(player=?),0) AS eligible,coalesce(max(player=? AND fed_round=food_expires),0) AS contributed FROM cat JOIN accounts ON ${roster} WHERE cat.id=1 AND food_expires<=?`,id,id,now),sql("SELECT count(*) AS total FROM accounts WHERE password IS NOT NULL"),sql(feedSql),sql(weekBoardSql,weekStart(now)),sql("SELECT coalesce(sum(p.points),0) AS points FROM players p JOIN accounts ac ON ac.player=p.id WHERE ac.password IS NOT NULL"),sql("SELECT count(*) AS n FROM events WHERE type='revived'"),sql(goalsSql)]);
 const revival=rev.results[0] as {total:number;fed:number;eligible:number;contributed:number};
 const cat=c.results[0] as {food:number;love:number;calls:number;actions:number;active:number};
 const counters:Counters={calls:cat.calls,actions:cat.actions,points:Number((pt.results[0] as {points:number}).points),revivals:Number((rv.results[0] as {n:number}).n)};
 let reached=gr.results as {goal:string;at:number}[];
 let events=ev.results;
 const fresh=newlyReached(counters,reached.map(g=>g.goal));
 if(fresh.length){
  // Neu erreichte Ziele einmalig eintragen (idempotent über die eindeutigen Schlüssel) und die Antwort aktualisieren.
  const writes=fresh.flatMap(g=>[sql("INSERT OR IGNORE INTO goals_reached(goal,at) VALUES(?,?)",g.id,now),sql("INSERT OR IGNORE INTO events(key,type,player,at,detail) VALUES(?,'goal',NULL,?,?)","goal:"+g.id,now,g.id)]);
  const res=await db().batch([...writes,sql(goalsSql),sql(feedSql)]);
  reached=res[res.length-2].results as {goal:string;at:number}[];
  events=res[res.length-1].results;
 }
 return {goals:{counters,reached:Object.fromEntries(reached.map(g=>[g.goal,g.at]))},weekBoard:wk.results,weekStart:weekStart(now),weekEnd:nextWeekStart(now),events,playerCount:Number((team.results[0] as {total:number}).total),revival,food:Math.max(0,Math.ceil((cat.food-now)*100/foodLifetime)),love:Math.max(0,Math.ceil((cat.love-now)/unit)),calls:cat.calls,board:r.results,me:p.results[0]||null,account:who.account,foodExpires:cat.food,sharedUntil:cat.active+sharedPause,now,cooldowns:Object.fromEntries(t.results.map(row=>{const x=row as {action:string;until:number};return [x.action,x.until]}))};
}
