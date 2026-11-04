import {sql,digest} from "./db";

export async function identity(req:Request){
 const token=req.headers.get("x-byte-session")||"";
 const player=/^[a-f0-9]{32}$/.test(token)?await sql("SELECT s.player FROM sessions s JOIN accounts a ON a.player=s.player WHERE s.token=? AND s.expires>? AND a.password IS NOT NULL",await digest(token),Date.now()).first<string>("player"):null;
 return {player,account:!!player};
}
export type Identity=Awaited<ReturnType<typeof identity>>;
export type Member=Identity&{player:string};
