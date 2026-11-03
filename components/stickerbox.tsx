"use client";
import {useEffect,useState} from "react";
import {ArrowUpRight,Download,Search,Sticker} from "lucide-react";

type Item={id:string;title:string;category:string;preview:string;png:string};
type Catalog={stickers:Item[];packs:Record<string,string>};

export function Stickerbox({expanded,open}:{expanded:boolean;open:()=>void}){
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [category,select]=useState("Alle"),[query,search]=useState(""),[error,setError]=useState(false),[attempt,retry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/stickerbox/katalog.json",{signal:controller.signal}).then(async res=>{
   if(!res.ok)throw Error();setCatalog(await res.json() as Catalog);setError(false);
  }).catch(()=>{if(!controller.signal.aborted)setError(true)});
  return ()=>controller.abort();
 },[attempt]);
 const all=catalog?.stickers||[];
 const matches=expanded?all.filter(s=>(category==="Alle"||category===s.category)&&
  (s.title+" "+s.category+" "+s.id).toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de"))):all.slice(4,8);
 return <section className="collection"><div className="sectiontop"><div><small><Sticker size={14}/> ZUM MITNEHMEN</small><h2>{expanded?"Alle Motive":"Bytes Stickerbox"}<em>.</em></h2></div>
 {!expanded&&<button className="link" onClick={open}>Alle {all.length||""} Sticker <ArrowUpRight size={16}/></button>}</div>
 {error?<button className="profile" onClick={()=>retry(n=>n+1)}>Sticker erneut laden</button>:!catalog?<p>Sticker werden geladen …</p>:null}
 {expanded&&catalog&&<><div className="st-tools"><label><Search size={17}/><input aria-label="Sticker suchen" placeholder="Sticker suchen …" value={query} onChange={e=>search(e.target.value)}/></label><div className="st-filters">{["Alle",...Object.keys(catalog.packs)].map(c=><button key={c} aria-pressed={c===category} onClick={()=>select(c)}>{c}</button>)}</div></div>
 <div className="st-count"><span aria-live="polite">{matches.length} von {all.length} Motiven</span>{catalog.packs[category]&&<a download href={catalog.packs[category]}><Download size={15}/> Themenpaket als ZIP</a>}</div></>}
 <div className="stickers">{matches.map((s,i)=><a key={s.id} download={"Byte-"+s.id+".png"} href={s.png} aria-label={s.title+" als PNG herunterladen"}><div className={"thumb c"+i%4}><span>{s.category.toLocaleUpperCase("de")}</span><img loading="lazy" src={s.preview} alt=""/></div><div className="stinfo"><div><strong>{s.title}</strong><small>PNG · TRANSPARENT</small></div><Download size={20}/></div></a>)}</div>
 {expanded&&catalog&&!matches.length&&<p>Kein passendes Motiv. <button className="link" onClick={()=>{select("Alle");search("")}}>Alle anzeigen</button></p>}</section>
}
