import type { Motif } from "./sticker-types";

const ink = "#453149", mint = "#9ae0bc", plum = "#b79bd5", peach = "#ffd497";
const rose = "#f3a7b8", blue = "#a1d5e8", cream = "#fff3d8", shadow = "#796481";
const path = (d:string, fill="none", width=3.6, stroke=ink) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const ellipse = (x:number,y:number,rx:number,ry:number,fill:string, width=3.2) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${ink}" stroke-width="${width}"/>`;
const rect = (x:number,y:number,w:number,h:number,r:number,fill:string,width=3.2) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${ink}" stroke-width="${width}"/>`;
const group = (transform:string,...parts:string[]) => `<g transform="${transform}">${parts.join("")}</g>`;
const spark = (x:number,y:number,s=1) => group(`translate(${x} ${y}) scale(${s})`,path("M0 -10 Q1 -1 9 0 Q1 2 0 11 Q-2 2 -9 0 Q-1 -1 0 -10Z",peach,2));
const fish = (x:number,y:number,s:number) => group(`translate(${x} ${y}) scale(${s})`,path("M-12 0 Q-2 -13 13 -3 L21 -10 L20 8 L12 3 Q-2 13 -12 0Z",blue,2.6),ellipse(-3,-2,1.5,1.5,ink,0));
const sticker = (id:string,title:string,pose:Motif["pose"],back:string,front:string,transform?:string):Motif =>
  ({id:"ds-"+id,title,category:"Data Science",pose,back,front,transform});

export const dataMotifs: Motif[] = [
  sticker("debugging","Käfer im Code", "pfote",
    group("rotate(18 222 172)",path("M214 185 L222 185 L223 84 L214 84Z",peach),path("M181 51 Q188 25 229 29 Q260 33 261 51 Q262 67 245 81 Q230 93 217 91 Q186 83 181 51Z","#cceada"),path("M181 51 Q218 70 261 51 M189 57 Q192 71 221 88 M203 61 Q216 79 239 85 M220 64 Q231 73 248 78 M252 58 Q236 76 222 88 M235 63 Q220 76 201 78","none",1.8,"#739985")),
    group("rotate(-14 61 208)",path("M56 209 L42 204 M54 217 L39 218 M64 204 L60 193 M75 205 L81 194 M81 214 L95 210 M81 222 L92 228"),ellipse(67,216,15,12,rose),path("M68 206 L69 227","none",2),ellipse(65,204,7,5,ink),ellipse(61,214,2.4,2.4,ink,0),ellipse(76,221,2.4,2.4,ink,0))+
    path("M36 188 Q18 170 28 157 Q38 146 43 155 Q50 165 35 165","none",2.4,shadow)),
  sticker("datamining","Schürft nach Daten","sitz",
    group("rotate(28 238 170)",rect(233,90,11,140,4,peach),path("M193 105 Q219 70 246 74 Q263 76 279 92 Q256 87 242 89 Q217 91 193 105Z",blue)),
    path("M78 91 Q86 44 139 40 Q184 34 211 79 L224 84 Q227 91 218 94 L83 104 Q66 104 65 98 Q65 94 78 91Z",peach)+path("M133 48 Q126 62 127 82 M151 44 Q148 63 152 82","none",3,"#b47558")+rect(128,59,39,34,9,shadow)+ellipse(147,76,13,12,cream)+
    path("M31 252 L46 220 L60 216 L67 231 L61 251Z",plum)+path("M46 220 L48 246 L60 216 M66 250 L78 229 L91 231 L89 250Z",mint,2.6)+spark(32,218,.65)),
  sticker("neuron","Neuron mit Schnurrhaar","pfote",
    path("M35 77 L63 39 L92 80 L73 134 L35 77 M35 77 L24 139 L73 134 M203 64 L243 40 L278 69 L249 102 L203 64 M249 102 L282 143 L278 69","none",3.5,shadow)+
    [[35,77],[63,39],[92,80],[73,134],[24,139],[203,64],[243,40],[278,69],[249,102],[282,143]].map(([x,y],i)=>ellipse(x,y,7,7,[mint,plum,peach][i%3])).join(""),
    path("M94 82 Q140 49 198 70 L200 81 Q143 61 97 93Z",plum)+path("M124 67 Q119 51 125 42 M168 63 Q178 48 175 36","none",3.5)+ellipse(125,38,7,7,mint)+ellipse(174,32,7,7,rose)),
  sticker("speichern","Speicherpfote","pfote",
    rect(55,48,208,208,13,plum)+path("M80 48 H219 V139 H80Z",cream)+rect(168,53,27,65,2,shadow),
    path("M42 183 Q42 173 52 173 H135 L151 189 V265 Q151 274 141 274 H52 Q42 274 42 264Z",plum)+
    path("M66 173 H119 V207 H66Z",shadow)+rect(91,176,15,24,1,cream)+rect(58,221,77,46,4,cream)+path("M68 234 H123 M68 246 H110","none",2.3,shadow)+spark(250,224,.7),
    "translate(51 41) scale(.78)"),
  sticker("merge","Merge mit Gefühl","sitz",
    path("M66 221 V138 Q66 111 44 101 Q25 91 27 60 M66 140 V41 M235 218 V167 Q235 139 258 125 Q279 113 278 83","none",9,ink)+
    path("M66 221 V138 Q66 111 44 101 Q25 91 27 60 M66 140 V41 M235 218 V167 Q235 139 258 125 Q279 113 278 83","none",4,mint)+
    [[66,221],[66,139],[27,60],[66,41],[235,218],[278,83]].map(([x,y],i)=>ellipse(x,y,8,8,i%2?rose:mint)).join(""),
    group("rotate(-9 103 195)",path("M87 183 Q93 176 102 184 Q111 173 119 183 Q129 194 104 210 Q80 199 87 183Z",rose))+spark(256,176,.75)),
  sticker("inkognito","Inkognito im Terminal","code",
    path("M35 68 Q53 37 80 39 M243 68 Q258 43 277 45","none",2.5,shadow)+
    [0,1,2].map(i=>path(`M${32+i*13} ${91-i*7}v13m0 5v4 M${260+i*11} ${90+i*6}v17m0 5v5`,"none",3,mint)).join(""),
    path("M72 105 Q141 98 211 100 L211 106 L202 108 Q197 131 181 133 Q160 136 152 111 Q147 106 138 112 Q135 132 119 136 Q96 141 87 115 L74 114Z",ink)+
    path("M102 112 L112 108 M109 120 L126 109 M167 110 L177 106 M174 119 L190 109","none",2.5,mint)),
  sticker("stack","Pfannkuchen-Overflow","sitz",
    spark(247,134,.75)+spark(271,156,.5),
    group("rotate(4 169 232)",ellipse(172,258,85,13,blue),
    ...[0,1,2,3].map(i=>path(`M106 ${247-i*10} Q125 ${232-i*10} 160 ${232-i*10} Q216 ${228-i*10} 228 ${244-i*10} Q232 ${257-i*10} 169 ${259-i*10} Q107 ${262-i*10} 106 ${247-i*10}Z`,i%2?peach:"#e79f65",2.8)),
    path("M113 214 Q120 201 161 200 Q210 198 224 212 Q229 220 209 223 Q198 224 198 235 Q195 244 189 238 L187 224 Q157 222 146 230 Q137 235 135 225 Q133 220 124 221Z","#c88161",2.4),path("M148 205 L167 198 L186 205 L167 214Z",cream,2.4))),
  sticker("datalake","Ab ins Data Lake","pfote",
    path("M38 198 Q60 172 115 180 Q149 154 195 174 Q246 159 278 191 Q300 217 277 246 Q250 273 172 268 Q104 283 48 257 Q17 238 38 198Z",blue)+
    path("M36 223 Q49 218 57 224 M242 203 Q256 197 273 204 M205 252 Q227 257 238 247","none",2.4,"#4d98a8"),
    path("M42 213 Q68 184 120 177 Q152 174 158 187 Q164 203 132 227 Q94 250 47 244 Q31 241 42 213Z",peach)+
    path("M65 203 Q80 212 85 237 M98 185 Q117 198 120 229","none",6,"#db8b73")+fish(257,238,.75),
    "translate(71 52) scale(.69)"),
  sticker("wolke","Lädt in die Wolke","pfote",
    path("M185 74 Q161 76 161 59 Q159 43 176 40 Q182 19 201 23 Q212 12 227 20 Q246 22 247 40 Q269 37 275 56 Q279 75 257 77Z",blue)+
    path("M218 82 V109 M209 90 L218 81 L227 90","none",4,shadow)+spark(270,91,.6),
    path("M73 251 Q48 247 56 229 Q58 217 71 216 Q75 199 90 200 Q106 193 118 209 Q134 211 136 225 Q150 227 147 240 Q145 252 127 252Z",cream)+path("M85 231 Q91 236 97 230 M107 229 Q114 235 120 228","none",2.5,shadow)),
  sticker("gradient","Gradientenabfahrt","sitz",
    path("M19 243 L105 153 L127 168 L196 94 L287 221 Q252 260 148 269Z",blue)+
    path("M167 125 L196 94 L224 133 L207 128 L201 138 L188 124 L180 134Z",cream,2.3)+path("M31 235 Q91 207 116 193 M210 224 Q246 213 271 201","none",2.6,"#6da9bd"),
    path("M56 220 Q137 217 220 193 Q235 189 243 180 Q247 196 223 205 Q165 226 71 235Z",rose)+
    path("M63 239 Q160 235 241 208 Q254 204 261 195 Q267 211 243 219 Q182 243 80 253Z",mint)+path("M224 153 L256 234 M246 228 L263 222","none",3.5)+spark(57,181,.6),
    "translate(40 2) rotate(-10 155 165) scale(.84)"),
  sticker("null","Schrödingers Nullwert","pfote","",
    path("M49 174 L157 158 L264 183 L260 250 L157 278 L57 250Z",peach)+
    path("M51 176 L155 201 L262 183 L157 162Z","#8e665e")+path("M51 176 L31 198 L133 226 L155 201Z","#ffe1af")+path("M155 201 L177 225 L284 206 L262 183Z","#ffdda7")+
    path("M155 222 L157 271 M64 230 L88 237 M68 237 L86 242","none",2.4,"#b67b62")+path("M201 226 Q201 218 209 217 Q219 216 219 224 Q219 229 212 232 Q210 234 211 238","none",3,shadow)+ellipse(211,245,2,2,shadow,0),
    "translate(24 -4) scale(.87)"),
  sticker("projektion","Beamer-Komponente","pfote",
    path("M158 236 L269 40 L290 179Z","#ffecb3",0)+path("M264 32 L294 27 L295 167 L264 173Z",cream)+
    path("M272 141 L288 133 M271 141 L272 57 M278 104 L284 77","none",2.4,plum),
    group("rotate(-8 142 241)",rect(78,215,105,50,8,plum),rect(89,224,48,25,3,shadow),path("M95 230 H129 M95 237 H129 M95 244 H129","none",1.8,mint),ellipse(162,238,15,15,blue),ellipse(162,238,8,9,mint,2),ellipse(159,235,2.5,2.5,cream,0),path("M91 267 L89 272 M166 267 L169 272","none",4))+
    spark(254,80,.5)),
  sticker("server","Server im Ruhemodus","schlaf",
    rect(48,67,118,166,11,shadow)+[0,1,2].map(i=>group(`translate(0 ${i*47})`,rect(55,74,104,40,5,plum,2.7),ellipse(70,93,4,4,mint,2),ellipse(83,93,4,4,peach,2),path("M108 87 H145 M108 95 H145 M108 102 H135","none",2.1,ink))).join("")+
    path("M83 233 Q85 253 40 244 Q22 242 21 257","none",4),
    path("M60 251 Q139 232 239 239 Q263 238 267 250 Q265 265 187 271 Q117 278 67 267 Q52 261 60 251Z",mint),
    "translate(79 92) scale(.69)"),
  sticker("glocke","Normal verteilt","sitz",
    path("M36 245 Q47 227 61 233 Q64 216 80 219 Q97 218 100 231","none",3.5,shadow),
    group("rotate(-5 136 241)",ellipse(135,254,88,12,plum),path("M63 248 Q68 240 78 240 Q98 237 111 210 Q126 175 138 174 Q154 174 167 211 Q181 237 201 240 Q211 240 213 249Z",mint),path("M88 239 Q110 235 123 206 Q132 187 139 185","none",3,cream),ellipse(138,167,6,7,peach,2.5),path("M136 190 V243","none",2,"#6ca999"))+spark(231,185,.8)),
  sticker("sql","SELECT Thunfisch","code",
    path("M237 88 Q263 85 274 98 L274 173 Q275 188 242 189 Q214 189 212 176 L212 102 Q211 90 237 88Z",blue)+
    ellipse(243,101,31,11,mint)+path("M213 125 Q240 144 274 127 M213 151 Q239 169 274 151","none",2.5,ink)+fish(244,101,.55),
    fish(219,235,.85)+fish(256,216,.58)+path("M235 216 Q226 207 222 211 M262 192 Q273 180 279 184","none",2.4,"#6da9bd")),
  sticker("deploy","Deploy im Höhenflug","pfote",
    path("M79 181 Q51 188 43 208 Q38 225 22 236 Q49 242 66 228 Q69 248 96 229 Q111 214 114 199Z",rose)+
    path("M86 186 Q66 195 65 212 Q57 218 52 225 Q69 226 81 217 Q91 224 101 200Z",peach)+
    path("M70 187 Q78 128 141 84 Q206 35 269 28 Q272 96 222 159 Q172 216 110 226Z",cream)+path("M216 43 Q245 28 269 28 Q271 55 260 81 Q236 75 216 43Z",rose)+
    path("M74 170 Q49 163 37 187 Q31 200 28 215 L74 198Z",plum)+path("M135 219 Q137 247 119 258 Q110 265 90 268 L105 223Z",plum)+
    ellipse(165,132,56,55,blue)+ellipse(165,132,47,46,mint),
    path("M79 194 L104 217 M85 189 L110 211","none",3,shadow)+spark(255,165)+spark(77,70,.75),
    "translate(119 91) scale(.31)"),
];
