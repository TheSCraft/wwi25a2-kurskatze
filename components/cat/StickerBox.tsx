import {Sticker,ArrowUpRight,Download} from "lucide-react";
import type {Tab} from "../../lib/cat-types";

const stickers=[["sitz","Sitz & schnurr"],["code","Debuggt gerade"],["schlaf","Standby-Modus"],["pfote","Hier, Herr Professor!"]];

type Props={tab:Tab;onAll:()=>void};

export function StickerBox({tab,onAll}:Props){
 return <section className="collection"><div className="sectiontop"><div><small><Sticker size={14}/> ZUM MITNEHMEN</small><h2>{tab==="Stickerbox"?"Alle Posen":"Bytes Stickerbox"}<em>.</em></h2></div>{tab==="Katzenzimmer"&&<button className="link" onClick={onAll}>Alle Sticker <ArrowUpRight size={16}/></button>}</div><div className="stickers">{stickers.map(([file,label],i)=><a key={file} href={"/art/"+file+".png"} download={"Byte-"+file+".png"}><div className={"thumb c"+i}><span>NO. 0{i+1}</span><img src={"/art/"+file+".svg"} alt={label}/></div><div className="stinfo"><div><strong>{label}</strong><small>PNG · TRANSPARENT</small></div><Download size={20}/></div></a>)}</div></section>;
}
