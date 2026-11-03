import {initialize} from "../../../lib/server/initialize";
import {identity,type Member} from "../../../lib/server/auth";
import {state} from "../../../lib/server/state";
import {response,type Body} from "../../../lib/server/http";
import {handleLogout,handleCredentials,handleRename} from "../../../lib/server/actions/account";
import {handleRevive} from "../../../lib/server/actions/revive";
import {handleInteract} from "../../../lib/server/actions/interact";

export async function GET(req:Request){await initialize(Date.now());return response(await state(await identity(req)))}
export async function POST(req:Request){
 if(!req.headers.get("content-type")?.startsWith("application/json")||req.headers.get("sec-fetch-site")==="cross-site")return response({error:"Unzulässige Anfrage."},403);
 const body=await req.json().catch(()=>null) as Body|null;
 if(!body||typeof body.action!=="string")return response({error:"Ungültige Anfrage."},400);
 const {action}=body,now=Date.now(),who=await identity(req);
 await initialize(now);
 if(action==="logout")return handleLogout(req);
 if(action==="register"||action==="login")return handleCredentials(req,body,who,now);
 if(!who.account||!who.player)return response({error:"Bitte melde dich an."},401);
 if(action==="rename")return handleRename(req,body,who as Member);
 if(action==="revive")return handleRevive(req,body,who as Member,now);
 return handleInteract(req,body,who as Member,now);
}
