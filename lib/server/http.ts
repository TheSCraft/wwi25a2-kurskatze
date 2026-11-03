export type Body={action?:string;name?:string;password?:string;round?:number};
export function response(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"private, no-store","Vary":"X-Byte-Session"}})}
