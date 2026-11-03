import type { Motif } from "./sticker-types";

const ink = "#453149", gold = "#ffd075", mint = "#9bdfc9", lilac = "#baa9ec";
const pink = "#f5a6b2", blue = "#98cede", cream = "#fff0cf", navy = "#625382";
const path = (d:string, fill="none", width=4, stroke=ink) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const oval = (x:number,y:number,rx:number,ry:number,fill:string,w=3) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${ink}" stroke-width="${w}"/>`;
const group = (transform:string,art:string) => `<g transform="${transform}">${art}</g>`;
const star = (x:number,y:number,size:number,c=gold) =>
  group(`translate(${x} ${y}) scale(${size/10})`,path("M0 -11 Q2 -2 10 0 Q2 2 0 11 Q-2 2 -10 0 Q-2 -2 0 -11Z",c,1.6));
const fish = (x:number,y:number,scale:number,angle:number,fill=blue) =>
  group(`translate(${x} ${y}) rotate(${angle}) scale(${scale})`,path("M-20 0 Q-4 -18 12 -4 L22 -12 L22 11 L12 5 Q-5 17 -20 0Z",fill,2.7)+oval(-10,-2,2,2,ink,0)+path("M3 -6 Q8 0 3 6","none",1.5));
const jewel = (x:number,y:number,s:number,c=pink) =>
  group(`translate(${x} ${y}) scale(${s})`,path("M0 -11L8 -3L5 6L0 12L-7 3L-8 -4Z",c,2.5)+path("M-5 -3L0 -8L-1 2","none",1.6,cream));
function motif(id:string,title:string,pose:Motif["pose"],transform:string,back:string,front:string):Motif {
  return {id:"fan-"+id,title,category:"Fantasie",pose,transform,back,front};
}

export const fantasie: Motif[] = [
  motif("kessel","Schnurrtrank auf Stufe neun","pfote","translate(21 12) scale(.87)",
    path("M195 268 Q182 258 185 243 Q177 255 169 251 Q168 231 154 218 Q160 241 142 249 Q139 235 129 232 Q132 247 114 257 Q116 278 151 280Z",gold)+
    path("M63 214 Q71 205 76 220 M247 211 Q245 198 253 197","none",3)+oval(238,149,8,8,mint)+oval(249,133,4,4,pink),
    path("M68 203 Q54 181 48 192 Q41 210 66 221 M225 209 Q248 182 254 197 Q258 213 234 222",lilac)+
    path("M69 193 Q52 222 72 246 Q93 272 153 269 Q211 270 230 244 Q244 221 229 193Z",navy)+
    oval(149,193,83,17,lilac)+oval(149,192,73,10,mint)+path("M98 192 Q114 185 128 191 M168 193 Q188 188 201 194","none",2,"#578e85")+
    star(147,233,14)+star(166,222,5)+path("M79 219Q78 236 92 245","none",4,lilac)+
    group("rotate(13 150 58)",path("M108 63 Q123 47 130 16 Q140 34 169 34 L157 46 L183 65Z",navy)+oval(147,65,44,8,lilac)+star(139,41,6))),
  motif("teppich","Fliegender Teppich, Sitzplatz 1A","sitz","translate(74 32) scale(.69)",
    path("M19 209 Q63 208 101 186 L277 191 Q270 204 301 207 Q222 263 175 266 Q94 242 19 209Z",pink)+
    path("M35 210 Q75 207 103 193L262 197 Q264 207 280 209 Q236 237 175 257Z",lilac)+
    path("M47 220L34 231 M55 224L43 235 M65 229L52 241 M251 237L255 248 M261 231L266 240 M274 223L280 232","none",4)+
    path("M32 172Q45 174 55 169 M16 183Q40 185 62 177 M49 251Q66 251 79 245","none",3,navy)+star(253,116,11)+star(271,96,5),
    path("M34 211 Q85 236 177 259 Q246 238 288 208L277 221Q243 247 179 271 Q86 246 34 218Z",gold)+
    path("M110 244L121 239L131 250L141 246L151 255","none",2.5,ink)+jewel(180,257,.56,pink)),
  motif("mond","Schlafmodus im Sichelmond","schlaf","translate(50 88) scale(.70)",
    path("M217 23 Q154 19 109 60 Q41 127 59 196 Q75 266 153 273 Q224 280 267 222 Q222 246 180 220 Q130 190 132 145 Q129 70 217 23Z",gold)+
    path("M81 173 Q74 135 98 100 M95 221 Q104 235 118 243","none",4,cream)+
    oval(86,187,6,10,"#e9a55d",0)+oval(112,253,7,3,"#e9a55d",0)+star(237,52,13)+star(263,86,6)+star(46,130,8)+star(197,73,5),
    path("M63 202 Q77 245 120 262 Q188 290 252 240 Q217 274 161 277 Q88 279 63 219Z",gold)+
    path("M166 264 Q191 265 208 255","none",3,cream)),
  motif("ufo","Bitte einmal zur Mensa beamen","sitz","translate(90 15) scale(.46)",
    path("M106 131L68 259 Q150 280 231 255L202 133Z","#d7edcd",2.5)+
    path("M116 152L95 229 M184 152L202 219","none",3,"#9cc6ae")+
    oval(160,121,57,56,"#c2e9e4")+path("M113 108 Q121 79 144 73","none",5,cream)+star(60,67,11)+star(263,100,7),
    path("M51 132Q74 114 108 114Q156 137 215 114Q248 120 269 135Q239 158 169 162Q86 161 51 143Z",lilac)+
    path("M52 139Q151 165 268 135Q258 156 216 165Q151 183 88 160Q62 152 52 139Z",navy)+
    oval(85,137,7,3,gold,1)+oval(130,145,7,3,pink,1)+oval(183,145,7,3,mint,1)+oval(230,137,7,3,gold,1)+
    fish(157,217,.91,-23)+path("M136 194L139 187 M152 189L155 180 M168 191L170 185","none",2.6)),
  motif("drache","Endgegner mit Milchzähnen","sitz","translate(21 28) scale(.88)",
    path("M108 170Q70 103 24 101Q42 135 35 159Q58 151 64 175Q82 161 91 191Z",mint)+path("M188 161Q229 95 289 92Q260 132 279 150Q253 148 249 172Q226 162 215 186Z",mint)+
    path("M102 171 L41 114L64 165 M204 165L276 104L247 163","none",2.5,"#588b87"),
    path("M87 76 Q70 51 81 28Q87 45 103 59Z",cream)+path("M190 65Q210 42 202 26Q224 44 204 81Z",cream)+
    path("M151 145Q165 137 179 140Q187 129 184 123Q203 129 206 141L218 133Q218 143 240 144Q258 145 267 158Q245 152 234 165Q215 179 191 163Q177 152 151 145Z","#f69b75",3)+
    path("M182 145Q199 141 208 149L218 145Q216 154 233 154Q221 165 205 156Z",gold,0)+star(273,145,5)),
  motif("schneekugel","Schneesturm im Katzenformat","schlaf","translate(67 77) scale(.62)",
    oval(160,142,102,109,"#d5edf0")+path("M78 128 Q85 83 120 62","none",7,"#fffaf1")+
    path("M73 170Q100 160 126 177Q171 190 191 175Q223 153 247 166Q230 228 161 245Q98 237 73 170Z",cream,2)+
    [star(142,69,8,cream),star(222,105,8,cream),star(90,151,5,cream),star(195,69,4,cream),star(231,130,4,cream)].join(""),
    path("M96 223Q158 241 223 221 L240 254 Q164 275 79 255Z",navy)+
    path("M80 251Q159 269 241 250L244 262Q161 282 76 263Z",lilac)+
    oval(160,248,19,9,gold,2)+star(159,247,5,cream)+star(194,130,6,cream)),
  motif("sternangler","Stern an der Angel","pfote","translate(55 51) scale(.73)",
    path("M53 244Q59 227 76 228Q82 214 104 216Q116 197 137 211Q156 205 170 219Q199 210 208 229Q232 223 245 246Q223 259 184 259Q131 269 80 257Q63 256 53 244Z","#c8bbeb")+
    path("M83 246Q93 241 105 246 M179 244Q195 241 207 247","none",2.5,navy)+star(241,57,7)+star(60,101,8),
    path("M111 190Q166 103 228 41","none",5,"#ac785d")+path("M111 190Q166 103 228 41","none",1.2,cream)+
    path("M228 41Q256 87 251 151","none",2.4)+path("M251 149q9 9 13 -2","none",2)+
    group("translate(258 165) rotate(14)",path("M0 -19L6 -5L21 -4L10 6L12 21L-1 14L-14 20L-12 5L-22 -4L-7 -6Z",gold,3)+oval(-5,1,1.4,2.2,ink,0)+oval(6,1,1.4,2.2,ink,0)+path("M-2 7Q1 10 4 7","none",1.5))),
  motif("koenig","König der Pappkartons","sitz","translate(13 1) scale(.93)",
    path("M86 248Q47 223 67 142L64 96L94 107Q138 71 181 91L212 78L220 110Q234 167 247 239Z",pink)+
    path("M60 251L55 270 M242 246L250 264","none",6),
    group("rotate(-7 145 63)",path("M105 70L100 36L121 48L137 22L157 45L181 27L179 66Q142 80 105 70Z",gold)+path("M106 63Q139 69 178 59L178 68Q146 78 106 71Z",cream,2)+jewel(139,53,.64)+oval(100,35,4,4,gold)+oval(137,22,4,4,gold)+oval(181,27,4,4,gold))+
    path("M47 201L151 221L263 195L260 251L155 282L46 253Z","#d5a775")+path("M151 222L155 280 M47 200L32 215L134 240L152 222L174 238L277 210L262 195","#f2d1a0",3)+
    group("translate(193 245) rotate(-15)",path("M-11 3L-14 -7L-5 -3L0 -11L5 -3L12 -8L10 3Z",ink,1))),
  motif("rakete","Abflug zur Thunfischgalaxie","pfote","translate(83 63) scale(.50)",
    group("rotate(13 159 173)",path("M124 183 Q100 191 94 225L129 211 M184 185Q214 190 224 222L185 211",pink)+
      path("M143 212Q120 239 134 263Q141 252 149 257L156 282Q181 255 175 215Z",gold)+path("M151 215Q140 233 151 252Q163 241 166 217Z","#f49971",2)+
      path("M119 204Q106 91 151 29Q203 80 196 204L180 218L136 218Z",cream)+path("M128 73Q136 46 151 29Q172 51 182 76Q157 68 128 73Z",pink)+
      oval(158,130,38,41,navy)+oval(158,130,31,35,blue,2))+
    star(58,139,10)+star(226,54,11)+star(247,182,6),
    group("rotate(13 159 173)",path("M119 169Q157 181 197 169L194 203L181 217L136 217L121 204Z",cream)+path("M127 203L188 203L184 214L134 214Z",lilac,2)+jewel(158,191,.6,mint))),
  motif("zauberbuch","Ein Kapitel vor Mitternacht","schlaf","translate(73 80) scale(.61)",
    path("M42 192 Q89 166 157 190 Q206 161 271 180L282 223Q231 218 165 248 Q104 222 45 237Z",navy)+
    path("M41 185Q99 164 157 185Q216 152 267 172L277 217Q211 214 164 238Q100 211 45 227Z",cream)+
    path("M157 187L164 238 M54 204Q90 194 120 203 M207 195Q234 185 255 190 M65 213Q89 207 105 212","none",2.5,"#af8e83")+
    star(91,102,10)+star(204,74,12)+star(232,107,6)+path("M83 151Q61 135 77 119 M200 115Q220 114 215 92","none",2.3,navy),
    path("M189 226L201 223L205 253L198 247L190 255Z",pink,2.4)+star(124,90,5,mint)),
  motif("pilz","Fundbüro für Waldgeister","sitz","translate(105 112) scale(.48)",
    path("M104 254Q109 218 113 164Q116 127 139 107L168 108Q177 162 163 211Q156 239 163 260Q127 270 104 254Z",cream)+
    path("M26 147Q42 110 69 84Q101 45 129 39Q169 33 199 59Q225 81 248 110Q255 121 248 127Q210 150 153 155Q84 173 29 158Z",pink)+
    path("M29 152Q129 158 248 122Q232 146 152 161Q68 176 29 159Z","#f6cdaf",2.7)+
    oval(95,86,14,8,cream,0)+oval(132,59,9,5,cream,0)+oval(178,83,11,7,cream,0)+oval(56,124,8,4,cream,0)+oval(145,117,17,7,cream,0)+
    path("M117 179L112 229 M144 170Q151 182 147 202","none",2.4,"#c1a494")+star(252,163,10)+star(273,174,5),
    path("M80 255Q77 237 88 225Q94 239 90 249Q95 241 106 239Q103 251 93 257Z",mint,2.5)+
    path("M230 257Q224 247 229 232Q239 238 237 250Q244 242 254 245Q250 256 237 258Z",mint,2.5)),
  motif("taucher","Auf Tauchstation bei Neptun","sitz","translate(49 42) scale(.71)",
    oval(157,127,82,88,"#d4eeeb")+path("M86 117Q90 87 108 74","none",6,cream)+
    oval(249,89,10,10,"#d4eeeb",2)+oval(265,66,5,5,"#d4eeeb",2)+oval(228,49,5,5,"#d4eeeb",2)+
    path("M72 248Q49 234 53 211Q61 225 69 224Q57 198 67 181Q78 201 76 222Q85 210 88 199Q94 228 81 246Z",mint,3)+
    fish(259,173,.67,-12,pink),
    path("M91 176Q157 208 224 174L227 189Q155 225 87 190Z",gold)+
    path("M82 244L109 231L132 236L138 248Q118 259 81 258Z M168 245L188 232L207 234L230 244L231 254Q192 264 168 257Z",mint,3)+
    group("translate(38 175) rotate(-12)",path("M0 -42L0 72 M-13 -54L-12 -35Q0 -24 12 -36L15 -55 M0 -61L0 -31","none",4)+path("M-17 -50L-13 -61L-9 -50 M-4 -58L0 -69L4 -58 M11 -52L16 -63L19 -51",gold,2))),
  motif("ritter","Der heilige Napf","pfote","translate(12 15) scale(.91)",
    path("M64 107Q37 176 52 249Q73 241 98 252Q95 205 126 170Z",navy)+
    group("rotate(18 239 140)",path("M232 164L232 83L241 54L249 83L246 165Z",blue)+path("M240 76L239 151","none",2,cream)+path("M219 164Q239 153 258 166L254 174L244 170L242 200L232 200L233 170L221 173Z",gold)),
    path("M78 170Q99 172 116 160Q132 173 149 171L146 213Q135 234 112 244Q85 228 79 209Z",lilac)+
    path("M85 178Q101 180 116 169L140 178L138 210Q129 225 113 235Q91 221 87 205Z",mint,2)+fish(113,200,.68,-24,cream)+
    group("translate(139 57) rotate(-9)",path("M-42 7Q-35 -21 -1 -24Q25 -25 40 1L43 14Q4 2 -40 19Z",blue)+path("M-5 -23Q-9 -50 16 -47Q27 -48 35 -56Q35 -30 15 -30Q2 -31 -1 -19Z",pink,3)+path("M-28 9L-20 6 M17 -2L30 2","none",2))),
  motif("kristall","Die Glaskugel sagt: Miau","code","translate(83 83) scale(.49)",
    oval(160,143,85,88,"#c4b9e5")+oval(160,141,72,75,"#d8d8ef",1.5)+
    path("M90 120Q95 91 122 77","none",6,cream)+star(123,108,7,cream)+star(207,104,5,cream)+star(57,117,8)+star(263,83,12)+
    path("M87 242L103 214Q125 204 157 205Q198 203 219 216L237 244Z",navy),
    path("M93 222Q147 245 224 223L236 247Q157 270 84 246Z",gold)+
    path("M85 246Q157 263 235 244L241 254Q157 278 79 255Z",lilac)+jewel(160,246,.76)+
    path("M217 118Q223 129 220 142 M96 156Q94 167 100 174","none",3,cream)),
  motif("pirat","Käpt’n Knusperkeks","pfote","translate(14 20) scale(.86)",
    path("M47 216Q135 237 275 206L258 242Q218 275 130 267Q75 264 48 237Z","#bb8a73")+path("M63 229Q153 252 257 221","none",3,cream)+
    path("M222 205L217 43","none",6)+path("M217 47Q239 41 250 52Q263 61 277 54L272 89Q255 93 243 80Q232 73 219 80Z",navy)+fish(248,66,.62,11,cream)+
    path("M34 260Q52 272 74 264Q88 260 100 270 M198 274Q220 263 232 269Q247 278 271 262","none",4,blue),
    path("M64 200Q143 224 274 195L270 218Q144 248 58 218Z","#e7ba8e")+oval(91,216,4,4,ink,0)+oval(216,217,4,4,ink,0)+
    group("translate(139 77) rotate(-9)",path("M-55 5Q-42 7 -40 -7Q-17 -20 0 -17Q16 -19 31 -8Q38 2 51 -6L41 16Q-11 8 -49 21Z",navy)+path("M-46 13Q-7 2 39 9","none",2,gold)+fish(1,-4,.42,-10,cream))),
  motif("komet","Mit Überschnurrgeschwindigkeit","sitz","translate(104 46) rotate(14 90 90) scale(.55)",
    path("M19 238Q68 209 120 132Q139 106 174 102Q206 90 233 118Q257 139 246 169Q236 199 202 211Q155 217 117 228L133 209Q74 241 19 238Z","#f2a08c")+
    path("M30 234Q80 214 122 172L110 193Q147 161 158 158L174 187Q120 216 88 225L100 211Q70 226 30 234Z",gold,2.6)+
    oval(200,155,53,52,pink,3)+
    path("M31 195L91 158 M43 207L83 186 M94 137L123 118","none",2.7,navy)+star(259,76,11)+star(282,117,5)+star(91,230,6),
    path("M173 186Q204 204 232 178Q223 197 206 204Q185 208 165 196Z",gold,2.8)+star(251,207,8,cream)),
];
