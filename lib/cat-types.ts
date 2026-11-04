import type {Counters} from "./goals";
export type Tab="Katzenzimmer"|"Rangliste"|"Stickerbox";
export type Entry={name:string;points:number};
export type FeedEvent={id:number;type:"joined"|"revive_portion"|"revived"|"died"|"goal";at:number;name:string|null;detail:string|null};
export type Data={loveExpires:number;goals:{counters:Counters;reached:Record<string,number>};weekBoard:Entry[];weekStart:number;weekEnd:number;events:FeedEvent[];playerCount:number;revival:{total:number;fed:number;eligible:number;contributed:number};food:number;love:number;calls:number;me:Entry|null;board:Entry[];account:boolean;foodExpires:number;now:number;sharedUntil:number;cooldowns:Record<string,number>};
export const isDead=(d:Data|null,now:number)=>!!d&&now>=d.foodExpires;
