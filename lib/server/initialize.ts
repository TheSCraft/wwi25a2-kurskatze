import {db,sql,unit} from "./db";
import {foodLifetime} from "../cat-rules";

export async function initialize(now:number){
 await db().batch([sql("INSERT OR IGNORE INTO cat(id,food,love,calls,active) VALUES(1,?,?,0,?)",now+72*unit,now+84*unit,now),
 sql("UPDATE cat SET food_expires=? + min(?,max(0,food-?))*?/ ? WHERE id=1 AND food_expires IS NULL",now,100*unit,now,foodLifetime,100*unit),
 sql("UPDATE cat SET active=COALESCE((SELECT MAX(last) FROM players WHERE last>0),?) WHERE id=1 AND active IS NULL",now)]);
}
