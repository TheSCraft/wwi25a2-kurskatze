import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import sharp from "sharp";
import { zipSync } from "fflate";
import { campus } from "../lib/sticker-campus.ts";
import { dataMotifs } from "../lib/sticker-data.ts";
import { abenteuer } from "../lib/sticker-abenteuer.ts";
import { alltag } from "../lib/sticker-alltag.ts";
import { fantasie } from "../lib/sticker-fantasie.ts";
import { kueche } from "../lib/sticker-kueche.ts";

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
const directory = join(publicDir, "stickerbox");
const classics = [["sitz","Sitz & schnurr"],["code","Debuggt gerade"],["schlaf","Standby-Modus"],["pfote","Hier, Herr Professor!"]];
const poses = new Map();
const catalog = [];
const archive = {};
await mkdir(directory, { recursive: true });
for (const [id, title] of classics) {
  const original = await readFile(join(publicDir, "art", id + ".svg"), "utf8");
  const content = original.slice(original.indexOf(">") + 1, original.lastIndexOf("</svg>"));
  const viewBox = original.match(/viewBox="([^"]+)"/)[1];
  poses.set(id, `<svg x="40" y="32" width="240" height="232" viewBox="${viewBox}" overflow="visible">${content}</svg>`);
  catalog.push({id,title,category:"Klassiker",preview:"/art/"+id+".svg",png:"/art/"+id+".png"});
  archive["Klassiker/Byte-"+id+".png"] = await readFile(join(publicDir,"art",id+".png"));
}
const groups = [campus,dataMotifs,abenteuer,alltag,fantasie,kueche];
// Interleave collections so the unfiltered gallery starts with a varied mix.
const motifs = [];
for (let i=0; i<Math.max(...groups.map(group=>group.length)); i++) {
  for (const group of groups) if(group[i]) motifs.push(group[i]);
}
const ids = new Set(classics.map(([id])=>id));
for (const motif of motifs) {
  if(ids.has(motif.id) || !/^[a-z0-9-]+$/.test(motif.id) || !poses.has(motif.pose)) throw Error("Invalid sticker: "+motif.id);
  ids.add(motif.id);
  const artwork = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="300" viewBox="0 0 320 300">${motif.back||""}<g transform="${motif.transform||"translate(0)"}">${poses.get(motif.pose)}</g>${motif.front||""}</svg>`;
  const input = Buffer.from(artwork);
  const png = await sharp(input,{density:360}).png({compressionLevel:8}).toBuffer();
  await writeFile(join(directory,motif.id+".png"), png);
  await sharp(input,{density:100}).webp({quality:86,alphaQuality:100}).toFile(join(directory,motif.id+".webp"));
  archive[motif.category+"/Byte-"+motif.id+".png"] = png;
  catalog.push({id:motif.id,title:motif.title,category:motif.category,preview:"/stickerbox/"+motif.id+".webp",png:"/stickerbox/"+motif.id+".png"});
}
// Individual themed ZIPs keep each download within the static hosting file-size limit.
const packs = {};
for (const category of new Set(catalog.map(item=>item.category))) {
  const files = Object.fromEntries(Object.entries(archive).filter(([name])=>name.startsWith(category+"/")));
  const file = "byte-"+category.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replaceAll(" ","-")+".zip";
  await writeFile(join(directory,file),zipSync(files,{level:0}));
  packs[category]="/stickerbox/"+file;
}
await writeFile(join(directory,"katalog.json"), JSON.stringify({stickers:catalog,packs}));
console.log("Stickerbox: "+catalog.length+" Motive als transparente PNGs und "+Object.keys(packs).length+" Themenpakete.");
