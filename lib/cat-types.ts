export type Tab="Katzenzimmer"|"Rangliste"|"Stickerbox";
export type Entry={name:string;points:number};
export type Data={playerCount:number;revival:{total:number;fed:number;eligible:number;contributed:number};food:number;love:number;calls:number;me:Entry|null;board:Entry[];account:boolean;foodExpires:number;now:number;sharedUntil:number;cooldowns:Record<string,number>};
export const isDead=(d:Data|null,now:number)=>!!d&&now>=d.foodExpires;
