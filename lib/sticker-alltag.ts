import type { Motif } from "./sticker-types";

const ink = "#453149";
const cream = "#fff1ce";
const rose = "#f5a1b0";
const lilac = "#bbabe4";
const teal = "#8ad9c0";
const honey = "#ffc269";
const blue = "#a4d7eb";

function path(d: string, fill = "none", width = 3.6, stroke = ink) {
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
}
function oval(x: number, y: number, rx: number, ry: number, fill: string, w = 3.6) {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${ink}" stroke-width="${w}"/>`;
}
function rounded(x: number, y: number, w: number, h: number, radius: number, fill: string) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${ink}" stroke-width="3.6"/>`;
}
function strokes(...lines: string[]) { return lines.map(d => path(d, "none", 2.3)).join(""); }
function sparkle(x: number, y: number, k = 1) {
  return `<g transform="translate(${x} ${y}) scale(${k})">${path("M0 -10 Q1 -2 8 0 Q1 2 0 10 Q-2 2 -8 0 Q-1 -2 0 -10Z", cream, 2.4)}</g>`;
}
function heart(x: number, y: number, k = 1) {
  return `<g transform="translate(${x} ${y}) scale(${k})">${path("M0 6 Q-16 -3 -11 -10 Q-7 -17 0 -9 Q7 -18 12 -10 Q16 -4 0 6Z", rose, 2.7)}</g>`;
}
function art(id: string, title: string, pose: Motif["pose"], transform: string, back: string, front: string): Motif {
  return { id: "kat-" + id, title, category: "Katzenalltag", pose, transform, back, front };
}

export const alltag: Motif[] = [
  art("karton", "Wenn ich passe, zieh ich ein", "pfote", "translate(36 22) scale(.78)",
    path("M38 184 L90 151 L234 155 L280 183 L235 211 L83 211Z", "#dc9b64") +
    path("M41 184 L21 166 L75 133 L94 150Z", "#f7c58a") + path("M232 155 L249 135 L298 165 L278 185Z", "#f7c58a"),
    path("M40 181 L163 199 L163 276 L48 251Z", "#efbc84") + path("M163 199 L279 180 L269 249 L163 276Z", "#d39a65") +
    path("M40 181 L163 199 L148 224 L24 201Z", "#ffd59a") + path("M163 199 L279 180 L292 201 L177 224Z", "#f1be85") +
    path("M85 220 L106 224 L103 257 L83 253Z", cream, 1.8) +
    strokes("M198 238 l15 -4 m-15 9 15 -4","M228 240 l0 -14 m-4 5 4 -5 4 3","M241 237 l0 -14 m-4 5 4 -5 4 3") + sparkle(61,76,.8)),
  art("wolle", "Ich hatte den Faden gerade noch", "pfote", "translate(4 5) scale(.94)",
    path("M26 217 C5 263 71 284 73 243 S32 225 47 253 S112 278 143 254", "none", 6, "#b36689"),
    oval(244,238,44,43,rose) + strokes("M208 219 Q230 204 250 199","M204 231 Q234 206 265 202","M205 242 Q235 215 274 209","M210 249 Q245 222 280 217","M218 259 Q248 234 283 228","M222 263 Q235 266 246 279","M231 255 Q250 262 262 276","M242 247 Q265 253 275 265","M253 239 Q276 242 284 249") +
    path("M204 231 Q163 215 128 229 T77 222 Q53 208 64 202 Q76 194 91 207 Q130 228 179 205 Q210 192 198 181 Q186 171 171 185 Q139 209 109 190", "none", 5, "#b36689")),
  art("teetasse", "Bitte erst nach dem Tee", "sitz", "translate(49 22) scale(.72)",
    path("M215 179 Q282 151 278 194 Q277 222 240 234 L234 219 Q259 215 261 196 Q264 180 238 192Z", lilac) +
    oval(151,255,95,15,cream) + oval(152,253,72,8,"#e6c6a9",2) + oval(151,185,91,20,"#895e59") +
    path("M75 105 C54 86 82 80 67 61 M245 117 C232 103 255 92 246 79","none",4,"#ad95bc"),
    path("M60 182 Q148 211 242 183 Q229 249 184 257 Q145 266 107 253 Q73 241 60 182Z", lilac) +
    path("M67 192 Q147 218 234 192","none",3,cream) + heart(153,232,1.1) +
    path("M209 193 Q206 210 221 218", "none",2.3) + path("M214 216 L226 212 L234 225 L221 232Z",teal,2.4)),
  art("fridge", "Nur kurz den Käse kontrollieren", "sitz", "translate(85 56) scale(.76)",
    rounded(21,29,124,227,14,teal) + rounded(30,42,108,202,8,cream) +
    rounded(33,103,100,7,2,blue) + rounded(33,163,100,7,2,blue) +
    path("M44 99 L44 64 L52 52 L69 52 L76 64 L76 99Z",blue,2.5) +
    path("M44 65 L76 65 M53 52 L59 64 M53 80 Q60 71 68 80 Q64 88 53 85Z",cream,2) +
    path("M81 100 L84 82 L109 73 L122 82 L122 99Z",honey,2.5) + oval(101,89,3,3,"#dd9851",1.2) +
    rounded(43,127,26,34,5,rose) + rounded(40,123,32,7,2,lilac) +
    path("M27 41 L14 51 L13 234 L27 246Z", "#69b8a8") + sparkle(167,56) + sparkle(189,46,.58),
    path("M66 252 L77 232 L106 227 L110 252Z",honey,2.8) + oval(88,241,3,3,"#d98d4b",1.4)),
  art("toast", "Einmal Miez-Toast, bitte", "sitz", "translate(23 38) scale(.85)",
    path("M57 240 L57 123 Q28 109 43 80 Q58 57 87 68 Q134 32 185 56 Q228 48 250 75 Q268 97 251 116 L249 234 Q250 253 230 256 L80 262 Q59 263 57 240Z","#db935b"),
    path("M62 209 Q76 226 99 229 Q153 250 222 222 L241 213 L238 238 Q236 247 222 247 L80 251 Q68 252 66 241Z","#f7cf8d",2.5) +
    path("M93 222 Q104 216 118 224 Q129 211 143 220 Q151 226 146 233 Q131 245 110 238 Q91 235 93 222Z","#ffe683",2.4) +
    sparkle(253,56,.85) + sparkle(276,80,.48)),
  art("roboter", "Dienstwagen mit Saugfunktion", "sitz", "translate(41 0) scale(.76)",
    path("M24 239 Q32 219 46 216 M26 252 Q36 235 49 232","none",4,"#9a8bad") +
    path("M51 217 Q159 188 268 216 L267 244 Q257 266 164 272 Q69 274 48 248Z","#8c83ae"),
    oval(159,224,111,31,lilac) + path("M52 232 Q103 263 218 246","none",2.8) +
    rounded(180,231,38,8,4,teal) + oval(231,228,4,3,cream,2) +
    strokes("M66 251 l11 3 m5 2 9 2","M228 260 l13 12 m-11 -15 20 4","M81 265 l-10 12 m14 -13 -1 13")),
  art("blume", "Biologisch abbaubarer Blumentopf", "sitz", "translate(43 39) scale(.73)",
    path("M71 192 Q35 166 43 136 Q68 145 75 172 Q65 116 41 108 Q36 138 62 158",teal) +
    path("M214 180 Q219 114 266 95 Q279 124 245 149 Q251 113 264 101 M220 169 Q251 139 283 143 Q273 171 240 178Z","#9cdaa4") +
    strokes("M65 165 Q49 139 45 114","M231 159 L264 109"),
    path("M64 184 L249 184 L228 263 Q226 270 219 271 L94 270 Q86 270 84 260Z","#dc9279") + rounded(58,180,197,21,6,"#f2b096") +
    path("M99 212 l9 39 m0 -39 4 14","none",4,"#ffdaae") + heart(159,239,.9)),
  art("keks", "Krümel sind Indizien", "pfote", "translate(9 4) scale(.91)",
    sparkle(263,89,.9),
    path("M224 175 Q252 168 267 188 Q258 191 261 203 Q262 212 277 211 Q275 219 287 222 Q285 254 256 266 Q223 277 201 255 Q180 233 193 203 Q202 183 224 175Z","#e5ad72") +
    strokes("M202 211 q3 -11 13 -17","M246 257 q13 -2 19 -8") +
    path("M220 195 l9 -4 4 9 -9 5Z M207 225 l7 -6 6 7 -5 7Z M243 225 l6 -8 9 6 -3 6Z M224 246 l8 -1 1 8 -6 1Z","#845641",2.2) +
    path("M277 191 l8 -5 5 8 -7 4Z M291 207 l4 -4 5 5 -4 4Z M192 267 l5 -3 4 5 -5 3Z",honey,2)),
  art("bad", "Nur die Pfoten, bitte!", "pfote", "translate(38 28) scale(.8)",
    path("M39 202 L40 96 Q39 53 68 51 Q87 50 95 71 L83 76 Q79 61 67 63 Q54 66 54 95 L55 201Z","#b3c5d9") +
    path("M77 74 Q89 59 104 70 L115 80 L83 93Z",blue,3) + strokes("M89 95 l4 8","M103 91 l5 9","M114 87 l4 7") +
    path("M64 238 L53 260 Q54 270 67 266 L88 245 M233 238 L247 261 Q251 266 240 269 L217 251",honey),
    path("M38 192 Q165 212 281 191 Q266 252 215 257 Q143 270 92 251 Q55 238 38 192Z","#a8d7e2") +
    path("M42 197 Q31 196 31 189 Q31 181 42 181 Q167 192 279 179 Q290 179 290 187 Q291 194 280 196 Q165 212 42 197Z",cream) +
    oval(65,185,13,10,"#f9faf3",2) + oval(83,182,15,12,"#e2f4ef",2) + oval(101,186,11,8,"#f9faf3",2) +
    oval(228,172,19,14,honey,2.8) + oval(241,154,10,11,honey,2.8) + path("M248 154 l12 4 -12 4Z","#f39a60",2) + oval(243,151,1.8,1.8,ink,0)),
  art("disco", "Pfoten auf den Dancefloor", "pfote", "translate(9 14) rotate(-8 157 151) scale(.94)",
    path("M217 95 L178 255 L274 252Z","#ffeabc",0) + path("M246 93 L228 248 L292 220Z","#f5c5d5",0) +
    path("M232 18 L232 36","none",3) + oval(232,65,36,33,"#b7d4df") +
    path("M207 43 Q229 54 259 45 M199 59 Q233 73 267 60 M199 75 Q236 89 263 76 M216 36 Q195 62 219 95 M232 33 Q218 64 237 98 M247 36 Q253 65 251 92","none",2,"#6f748a") +
    sparkle(263,39,.6) + sparkle(275,91,.85) +
    path("M53 99 L52 77 L66 72 L67 92 M52 79 L66 75","none",3) + oval(47,100,5,4,rose,2) + oval(62,94,5,4,rose,2),
    path("M105 114 Q124 105 144 111 L143 123 Q130 136 117 128Z M151 110 Q169 102 185 103 L185 117 Q178 129 161 124Z","#796590",2.8) +
    strokes("M144 114 L152 113","M111 114 l-10 -1","M185 105 l13 -5") +
    sparkle(44,181,.63)),
  art("geist", "Buh. Jetzt Leckerli?", "sitz", "translate(24 33) scale(.84)",
    path("M42 150 Q44 116 70 93 Q62 66 68 44 Q70 34 81 40 L115 63 Q157 43 189 59 Q205 39 231 34 Q238 42 234 73 Q270 97 275 139 L279 200 L297 239 Q286 240 279 237 Q272 267 250 247 Q237 266 226 254 Q207 278 193 258 Q168 278 151 260 Q130 278 117 260 Q97 274 84 253 Q66 269 60 251 Q42 263 38 239 Q28 248 21 241 Q42 204 42 150Z","#e8e1f3") + sparkle(265,67,.7),
    path("M72 213 Q94 222 111 235 Q130 246 144 230 Q159 218 169 231 Q184 252 201 232 L230 209 L248 234 L231 248 Q216 269 204 249 Q190 268 175 251 Q159 273 144 254 Q128 265 119 253 Q102 265 91 248 Q78 259 67 244Z","#eee8f6",3) +
    strokes("M85 227 l12 15","M197 240 l7 -9","M230 230 l4 -5") +
    path("M237 226 Q246 211 256 223 Q267 212 278 227 L276 249 Q261 264 240 252Z","#efa66c") +
    path("M253 218 l1 -8 8 -2 -1 10Z",teal,2) + path("M245 233 l4 -5 5 6Z M264 233 l4 -6 4 6Z M249 242 q10 10 20 -1Z",ink,1.3)),
  art("mond", "Schlummerfunktion aktiviert", "schlaf", "translate(55 45) scale(.68)",
    path("M84 37 Q52 78 61 122 Q69 195 134 218 Q207 246 263 184 Q251 244 192 264 Q112 293 57 237 Q9 190 22 122 Q32 66 84 37Z","#ffce76") +
    path("M39 151 Q35 185 58 214","none",4,"#ffe8a7") + oval(47,179,5,7,"#e8a961",0) +
    sparkle(226,68,1.25) + sparkle(176,38,.6) + sparkle(272,120,.8),
    path("M61 224 Q82 240 116 245 Q158 257 187 244","none",3,"#db9859") + sparkle(48,66,.6)),
  art("kino", "Spoiler: Der Fisch war's", "sitz", "translate(19 16) scale(.91)",
    path("M45 201 L33 171 Q28 154 39 146 Q52 138 66 148 L73 176 L241 175 L247 150 Q255 138 267 145 Q279 151 273 168 L259 211Z","#cb7891") +
    path("M45 209 L40 256 L57 263 L73 218 M246 209 L249 260 L264 256 L265 209Z","#975d71",3),
    path("M178 185 L264 183 L252 261 L193 265Z",cream) +
    path("M183 187 L197 187 L208 261 L195 263Z M212 186 L226 185 L227 262 L214 263Z M245 184 L259 184 L249 260 L237 261Z","#e9858c",1.6) +
    path("M177 186 Q168 170 180 164 Q176 152 190 151 Q192 141 203 146 Q209 129 221 141 Q232 133 239 147 Q252 139 255 153 Q273 152 269 166 Q279 172 265 185Z","#ffe09c",3.2) +
    strokes("M183 168 q7 -6 12 0","M208 151 q8 -5 11 1","M227 164 q7 -5 12 0","M246 158 q5 -1 7 5") +
    path("M100 114 L142 112 L142 134 L104 136Z M151 111 L190 109 L189 130 L151 132Z",cream,3.4) +
    path("M106 118 L137 116 L137 130 L109 132Z",rose,0) + path("M155 115 L185 113 L184 126 L155 128Z",blue,0) + strokes("M142 117 l9 0")),
  art("spiegel", "Wer ist das hübsche Tier?", "pfote", "translate(1 20) scale(.82)",
    path("M200 232 L177 269 L195 267 L222 235 M241 228 L256 264 L268 264 L252 224Z","#a990b4",2.8) +
    path("M201 226 Q180 205 186 157 L198 94 Q207 58 244 61 Q279 68 279 100 L269 188 Q266 234 230 238Z",lilac) +
    path("M208 218 Q192 209 196 166 L208 102 Q215 68 244 72 Q271 77 269 104 L260 186 Q256 222 230 226Z","#cbe6e7",2.5) +
    path("M206 168 L213 134 L222 145 L239 142 L252 132 L252 159 Q256 185 234 189 Q213 191 206 168Z","#efbf91",2.5) +
    strokes("M219 162 q3 5 7 0","M235 159 q4 4 7 -1","M228 170 q2 4 6 0") +
    path("M215 110 l18 -19 m-21 32 37 -36 M245 201 l9 -10","none",3,"#fffaf0"),
    heart(168,91,.95) + heart(185,64,.62)),
  art("burrito", "Heute nur als Schnurrito", "schlaf", "translate(50 49) scale(.72)",
    path("M42 221 Q21 178 47 140 Q72 98 117 93 L174 106 L213 93 Q244 94 261 121 Q289 170 270 211 Q260 244 214 259 Q134 283 73 254Z","#e5bb85") +
    path("M47 179 Q24 152 48 144 Q42 120 66 125 Q67 103 86 112 Q99 87 115 106 L130 129Z",teal) +
    path("M225 114 Q240 91 246 115 Q268 104 265 129 Q289 134 272 149 L243 157Z","#f39493"),
    path("M43 176 Q81 208 165 221 L221 252 Q149 282 86 255 Q53 244 43 220Z","#f2d095") +
    path("M268 149 Q280 175 268 214 Q260 248 219 256 Q143 270 92 248 Q191 220 268 149Z","#ffdda0") +
    strokes("M64 209 q9 7 16 7","M71 230 l8 4","M177 241 l6 -4","M224 209 l8 -7","M209 239 l5 -3") + sparkle(58,82,.7)),
  art("regenschirm", "Wasser? Bin dagegen.", "sitz", "translate(42 70) scale(.68)",
    path("M69 96 Q103 30 168 36 Q235 28 276 84 Q253 74 236 93 Q208 79 187 99 Q157 81 132 104 Q104 90 84 109 Q77 100 69 96Z","#c0a4db") +
    path("M167 37 Q134 61 132 102 Q158 82 186 97 Q187 64 167 37Z",rose,2.5) +
    path("M168 36 Q212 48 236 92 M165 35 L166 26","none",3) +
    path("M169 92 L175 213 Q174 226 163 227 Q154 228 154 219","none",5) +
    path("M44 102 l-10 18 m28 6 -10 18 m226 -35 -8 16 m-250 28 -6 14 m255 -5 -10 19","none",4,"#83b7ce") +
    oval(151,260,94,10,"#bcdeeb",1.8),
    path("M42 249 Q29 255 31 263 M253 251 q17 -2 23 5","none",3,"#83b7ce") + sparkle(255,57,.55)),
  art("ufo", "Abgeholt vom Mutterschiff", "pfote", "translate(51 53) scale(.69)",
    path("M92 213 L65 280 Q154 299 246 273 L221 213Z","#fbe9a6",2.8) +
    path("M60 187 Q56 127 87 93 Q126 44 179 55 Q235 63 257 117 Q268 145 262 185Z","#c8e7e7") +
    path("M82 124 Q88 97 112 81","none",6,"#fff6da") + sparkle(264,56,.9) + sparkle(34,145,.65),
    path("M36 182 Q76 165 102 175 Q142 195 204 182 Q232 167 252 170 L281 179 Q304 187 275 204 Q244 226 163 230 Q83 230 38 210 Q13 198 36 182Z",lilac) +
    path("M32 193 Q78 216 159 216 Q245 214 281 192","none",3) +
    oval(66,199,7,4,cream,2) + oval(106,210,8,4,teal,2) + oval(159,214,8,4,rose,2) + oval(216,208,8,4,teal,2) + oval(253,198,6,4,cream,2) +
    strokes("M111 244 l-5 12","M212 241 l6 11","M154 250 l-1 13")),
];
