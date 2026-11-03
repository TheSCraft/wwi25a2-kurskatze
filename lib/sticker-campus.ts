import type {Motif} from "./sticker-types";

/* Byte is drawn in the same ink as the campus equipment. The cutouts have no background plate. */
const ink = "#453149", paper = "#fff5d8", green = "#8bd9b4", yellow = "#ffd875", rose = "#f59ca9", blue = "#95cddd", violet = "#b7a5dc";
function path(d:string, fill="none", width=3.5, stroke=ink) {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function oval(x:number,y:number,rx:number,ry:number,fill:string,width=3) {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${ink}" stroke-width="${width}"/>`;
}
function rect(x:number,y:number,w:number,h:number,r:number,fill:string,sw=3.5) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${ink}" stroke-width="${sw}"/>`;
}
const group=(transform:string,svg:string)=>`<g transform="${transform}">${svg}</g>`;
const shine=(x:number,y:number,k=1)=>group(`translate(${x} ${y}) scale(${k})`,path("M0 -10 Q1 -1 8 0 Q1 1 0 11 Q-1 1 -8 0 Q-1 -1 0 -10Z",paper,2));
const waves=(x:number,y:number)=>group(`translate(${x} ${y})`,path("M0 0 q-9 -9 -1 -17 q6 -5 3 -11 M12 0 q-4 -5 2 -13", "none",2.5,"#92737c"));
const book=(x:number,y:number,w:number,h:number,color:string,tilt=0)=>group(`translate(${x} ${y}) rotate(${tilt})`,path(`M5 0 H${w} q-5 ${h/2} 0 ${h} H5 Q-3 ${h/2} 5 0Z`,color)+path(`M15 4 H${w-5} M15 ${h-4} H${w-5}`,"none",1.4,paper)+path(`M10 1 v${h-2}`,"none",1.8));

type Pose = Motif["pose"];
function motif(id:string,title:string,pose:Pose,front:string,back="",transform=""):Motif {
  return {id:"hs-"+id,title,category:"Hörsaal",pose,front,back,transform};
}

export const campus:Motif[]=[
  motif("summa","Summa cum Miau","pfote",
    path("M99 50 Q140 30 192 40 L191 70 Q155 88 113 76Z","#615475")+
    path("M57 51 L140 16 L233 44 L150 77Z","#796891")+
    path("M149 47 L205 47 Q218 47 219 60 L220 83","none",3,yellow)+oval(149,47,5,3,yellow,1.7)+
    path("M218 82 L213 96 Q217 102 228 97 L223 82Z",yellow,2.3)+
    group("translate(209 208) rotate(-31)",path("M0 0 Q4 -10 12 -6 L57 -5 Q65 -3 63 8 Q62 16 53 15 L7 14 Q-2 14 0 0Z",paper)+oval(56,5,7,10,paper,2)+path("M27 -6 L35 -6 L35 14 L27 14Z",rose,2)+path("M30 13 l-2 13 6 -3 4 4 1 -11",rose,2)),
    shine(46,126)+shine(254,89,.7)),
  motif("kreide","Tafel-Tiger","pfote",
    path("M176 206 L244 145","none",6)+path("M178 205 L238 151","none",2,"#e9c68a")+
    rect(91,241,132,10,4,"#c49265")+rect(184,231,23,7,3,paper,2),
    group("rotate(3 223 96)",rect(134,36,156,105,6,"#c79768")+rect(141,43,142,90,3,"#4c776c",2)+
    path("M157 77 q6 -14 14 -1 q-7 11 -12 13 h15 M183 75 h11 m-6 -6 v13 M201 68 q10 -8 13 1 q2 7 -11 8 q15 -2 12 9 q-3 8 -15 2 M224 76 h12 m-12 6 h12 M245 72 q5 -12 14 -4 q7 6 -3 11 q-5 3 -4 8 m-1 7 h1","none",3,paper)+path("M166 112 q26 -11 53 -4","none",2,"#aac9b6")),
    "translate(-19 43) scale(.86)"),
  motif("winkel","Rechter Miau-Winkel","sitz",
    group("rotate(-12 163 226)",path("M68 254 L228 155 L228 254Z","#ffd97e",4)+
    path("M137 234 L207 191 L207 234Z","#fff1c2",2.5)+
    path("M80 249 l4 6 m10 -15 5 8 m11 -18 6 9 m11 -18 5 8 m12 -18 7 10 m11 -18 5 8 m11 -18 6 8 m11 -18 6 8 M218 243 h10 m-6 -10 h6 m-10 -10 h10 m-6 -10 h6","none",2)),
    path("M37 141 Q25 91 66 66 M57 68 l11 -3 -3 12","none",3,"#8d80aa")+shine(259,144)),
  motif("kaffee","Espress(o)klausur","sitz",
    path("M207 190 Q254 176 254 210 Q251 231 214 233 L212 220 Q239 220 239 204 Q239 197 219 204Z",rose)+
    path("M75 180 Q148 165 218 181 L212 232 Q204 260 151 261 Q95 261 84 238Z","#f3a5a5",4)+oval(147,181,71,11,paper,3)+oval(147,183,56,5,"#946653",1.5)+
    path("M128 210 q-9 -16 -17 -7 q-9 9 16 25 q29 -14 20 -24 q-10 -10 -19 6Z",paper,2.5)+
    path("M91 200 q2 19 8 29","none",4,"#ffd6c7")+waves(217,171),
    shine(54,178,.7),"translate(11 10) scale(.91)"),
  motif("flieger","Abgabe im Gleitflug","pfote",
    group("rotate(-10 177 207)",path("M52 218 L269 156 L191 251 L161 217 L119 235 L125 211Z","#dce9ec",4)+
    path("M52 218 L269 156 L128 211Z",paper,2.8)+path("M128 211 L119 235 L151 204 L269 156Z",blue,2.7)+
    path("M161 217 L269 156 L191 251Z",paper,2.7)),
    path("M27 193 q-21 -22 4 -33 q24 -8 21 12 q-3 10 -15 4 q-13 -9 -4 -23","none",2.5,"#9890af")+shine(272,140,.65),
    "translate(-12 -7) rotate(-8 160 150) scale(.94)"),
  motif("projektor","Folie 87","pfote",
    path("M185 247 L211 209 L249 209 L270 247Z","#bbb4cc")+rect(177,242,102,17,5,"#81798f")+
    path("M196 216 L245 216 L252 229 L187 229Z",blue,2.7)+path("M241 210 L241 137 L218 127","none",9)+
    path("M203 116 L235 123 L232 139 L199 133Z","#b6a9c9")+oval(201,124,5,9,"#d0eef0",2)+
    path("M253 251 h14 m-32 0 h8","none",2,paper),
    path("M196 124 L96 72 L84 152 L197 130Z","#fff2bb",1.8,"#d3ac66")+shine(92,104,.7),
    "translate(-11 31) scale(.88)"),
  motif("bibliothek","Literatur-Miez","schlaf",
    book(50,222,224,15,green,-2)+book(63,239,201,15,rose,1)+book(46,252,221,16,"#a99cc9",-1)+
    path("M218 243 l6 0 2 19 -6 -4 -5 4Z",yellow,1.7),
    book(66,206,188,12,blue,3),"translate(10 -4) scale(.94)"),
  motif("mikroskop","Pfotologie I","sitz",
    group("translate(183 133) rotate(6 38 63)",path("M28 15 C85 10 88 86 47 100 L34 87 Q64 73 58 47 Q55 37 44 35Z",green,3.8)+
    path("M7 85 H55 L52 93 H10Z",violet,2.7)+path("M27 94 L41 93 L51 114 L66 118 L66 127 L2 127 L2 119 L18 114Z",green)+
    group("rotate(32 29 28)",rect(18,-3,22,45,3,"#9dabbd")+rect(15,-7,28,8,3,violet)+rect(22,42,14,9,2,paper))+
    oval(57,48,10,10,violet)+oval(57,48,4,4,paper,1.4)+
    path("M9 80 h29 m-16 -5 6 -2","none",2,"#667d83"))),
  motif("marker","Alles klausurrelevant","pfote",
    group("translate(59 228) rotate(-28)",path("M0 0 L20 -5 V20 L0 14Z","#f38b9b")+path("M20 -8 H147 Q155 -7 156 1 V15 Q155 24 148 24 H20Z",yellow)+
    rect(34,-8,10,32,2,rose,2)+rect(135,-8,20,32,3,rose,2.5)+path("M53 -1 H120 M57 5 h34","none",2.5,paper)),
    path("M33 264 q65 -8 121 -6","none",10,"#f9b9b6")+shine(235,163,.75)),
  motif("ordner","Ordnung im Fell","sitz",
    group("rotate(-11 170 217)",rect(82,169,145,94,6,"#a69acb")+rect(83,169,18,94,4,violet,2)+
    rect(114,181,83,35,3,paper,2)+path("M127 193 h53 m-53 10 h38","none",2,"#8d8493")+
    oval(93,245,4,4,ink,0)+path("M210 164 v-10 h17 v15 M174 167 v-9 h20 v10",green,2.2)+path("M144 166 v-13 h18 v15",rose,2.2)),
    path("M71 174 q-10 -1 -14 -10 m12 18 q-11 2 -16 -3","none",2.3,"#9586a1")),
  motif("kopfhoerer","Lernplaylist läuft","sitz",
    path("M68 118 C46 11 225 7 232 106","none",13)+path("M68 116 C50 19 219 11 232 103","none",6,violet)+
    group("rotate(-12 71 123)",rect(57,100,23,51,9,violet)+rect(72,101,9,48,4,"#716885",2))+
    group("rotate(10 228 119)",rect(218,98,24,48,9,violet)+rect(216,102,9,43,4,"#716885",2))+
    path("M236 145 q17 31 -4 46 q-16 10 -5 21","none",2.7)+
    path("M254 71 v-20 l17 -5 v18 m-17 -8 17 -5","none",3.3)+oval(249,71,6,4,rose,2)+oval(266,64,6,4,rose,2),
    shine(43,87,.6)),
  motif("mensa","Mensa-Mampf","sitz",
    path("M40 222 L249 216 Q259 216 263 224 L275 249 Q277 258 263 259 L58 266 Q48 266 45 257 L33 234 Q30 226 40 222Z",green)+
    oval(129,238,59,17,paper,3)+path("M90 237 q3 -13 12 -11 q4 -13 15 -9 q6 -10 16 -4 q8 -9 16 0 q16 -1 20 16 q-25 14 -79 8Z","#f6c56e",2.7)+
    path("M102 231 q10 -10 20 0 m7 -9 q14 -5 19 3 m-25 10 9 -3","none",2,"#b2814e")+
    oval(150,220,7,6,"#ee8985",2)+path("M202 199 h27 l-3 35 q-12 8 -20 0Z",blue)+oval(215,199,14,4,paper,2)+path("M216 197 l3 -17 10 -4","none",3)),
  motif("fahrrad","Campus auf zwei Rädern","pfote",
    oval(82,230,29,29,"#f3e8cd",4)+oval(233,230,29,29,"#f3e8cd",4)+
    path("M82 204 v51 m-25 -25 h51 m-43 -18 36 35 M233 205 v50 m-26 -25 h52 m-45 17 36 -36","none",1.7,"#a59a91")+
    path("M82 230 L126 185 L155 230Z M126 185 L202 180 L155 230 M233 230 L199 167 L187 163 M125 183 L117 172","none",6)+
    path("M82 230 L126 185 L155 230Z M126 185 L202 180 L155 230 M233 230 L199 167","none",3,rose)+
    path("M106 171 q11 3 23 -1 m59 -7 h-11","none",5)+oval(155,230,6,6,violet,2)+path("M155 230 l11 8 h9","none",2.8),
    "", "translate(37 15) scale(.73)"),
  motif("schirm","Regenpause","sitz",
    path("M59 80 L75 191 Q77 207 63 204 Q55 202 58 196","none",4.5)+
    group("rotate(-10 99 68)",path("M20 83 Q40 32 93 24 Q149 21 179 71 Q161 63 145 78 Q127 68 109 83 Q89 71 69 88 Q48 77 20 93Z",rose)+
    path("M20 89 Q45 43 93 24 Q73 47 69 88 Q46 78 20 93Z",yellow,2.3)+
    path("M92 25 Q133 38 145 78 Q125 69 109 83 Q106 49 92 25Z",blue,2.3)+path("M92 25 l-1 -7","none",3.5)),
    path("M43 113 l-5 10 m242 -27 -5 12 m-5 28 -5 11 m-224 9 -5 10","none",3.5,"#80adbd"),
    "translate(33 40) scale(.85)"),
  motif("wecker","Acht Uhr c. t.","schlaf",
    group("translate(198 164) rotate(12 40 42)",path("M14 77 L7 90 M65 77 l9 13","none",6)+
    path("M13 14 l-5 -8 m55 7 7 -8","none",3)+path("M2 15 Q-2 -8 18 -7 Q26 -7 28 1Z",rose)+path("M52 0 Q65 -14 78 -4 Q85 3 80 14Z",rose)+
    oval(40,44,36,36,rose,3.8)+oval(40,44,28,28,paper,2.6)+
    path("M40 22 v4 m24 17 h-5 m-20 24 v-4 m-22 -19 h4 M39 44 l-9 -9 m9 9 13 -16","none",3)+oval(39,44,3,3,ink,0)+
    path("M-4 1 q-5 6 -5 12 m93 -17 q6 5 7 12","none",2.5,"#92788e"))),
  motif("bibliothekskarte","Ausweis, bitte!","pfote",
    group("rotate(8 187 203)",path("M132 151 L171 200 L190 195 L213 144","none",6,"#609d91")+
    rect(130,185,106,67,7,"#f4d38c")+rect(138,193,90,51,4,paper,2)+rect(142,199,28,27,3,blue,1.5)+
    path("M146 209 l1 -7 6 4 7 -1 5 -4 1 11 q0 10 -10 10 q-10 0 -10 -8Z","#f8a968",1.5)+
    path("M178 203 h39 m-39 6 h28 m-28 8 h33 M146 234 v4 m4 -6 v6 m6 -6 v6 m4 -6 v6 m6 -6 v6 m3 -6 v6 m5 -6 v6 m6 -6 v6 m4 -6 v6 m6 -6 v6","none",2)),shine(255,189,.65)),
];
