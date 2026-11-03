import type {Motif} from './sticker-types';

const ink = '#453149';
const milk = '#fff2cc';
const mint = '#9bdec3';
const pink = '#efa1b3';
const toast = '#d98c51';
const gold = '#f8c56e';
const red = '#e87867';
const blue = '#93bfd5';
const plum = '#9e8ab8';
const leaf = '#73a378';
const dark = '#695061';
const p = (d:string, fill='none', w=3) => `<path d="${d}" fill="${fill}" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const line = (d:string, color=ink, w=2.5) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const e = (cx:number,cy:number,rx:number,ry:number,fill:string,w=2.5) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${ink}" stroke-width="${w}"/>`;
const rect = (x:number,y:number,w:number,h:number,r:number,fill:string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${ink}" stroke-width="3"/>`;
const g = (transform:string, art:string) => `<g transform="${transform}">${art}</g>`;
const sparkle = (x:number,y:number,s=1) => g(`translate(${x} ${y}) scale(${s})`,p('M0 -10 Q1 -2 7 0 Q1 2 0 10 Q-1 2 -7 0 Q-1 -2 0 -10Z',gold,1.8));
const steam = (x:number,y:number,s=1) => g(`translate(${x} ${y}) scale(${s})`,line('M0 5 Q8 -1 2 -9 Q-4 -17 2 -22','#9f809a',3));
const sesame = (x:number,y:number,rot:number) => g(`rotate(${rot} ${x} ${y})`,e(x,y,3.8,1.4,milk,0));
const dots = (a:number[][],color:string) => a.map(([x,y,r])=>e(x,y,r,r,color,0)).join('');
const chef = g('translate(113 35) rotate(-8)',p('M0 18 Q-12 15 -11 4 Q-10 -6 0 -6 Q4 -19 17 -13 Q29 -24 38 -10 Q54 -13 55 1 Q55 12 43 16 L42 31 Q22 37 2 29Z','#fff8e7')+line('M2 21 Q20 27 42 20 M11 14 L9 5 M30 13 L33 3',ink,2));
const garnish = (x:number,y:number) => g(`translate(${x} ${y})`,p('M0 0 Q-12 -15 -14 -4 Q-16 4 -1 6 Q8 -15 13 -11 Q23 -5 2 7Z',leaf,2));
const fish = (x:number,y:number,s=1) => g(`translate(${x} ${y}) scale(${s})`,p('M-24 0 Q-5 -22 15 -4 L28 -12 L26 11 L15 5 Q-8 20 -24 0Z',pink)+e(-12,-2,2,2,ink,0)+line('M-5 -8 Q0 0 -5 8',ink,2));
const motif=(id:string,title:string,pose:Motif['pose'],transform:string,back:string,front:string):Motif=>({id:'me-'+id,title,category:'Mensa',pose,transform,back,front});

export const kueche:Motif[]=[
  motif('ramen','Heute bade ich in Ramen','sitz','translate(47 27) scale(.73)',
    line('M203 174 L272 53 M215 177 L289 66',ink,6)+line('M203 174 L272 53 M215 177 L289 66',toast,2.4)+steam(50,137)+steam(250,124,.8),
    p('M33 174 Q150 146 286 175 Q278 237 213 260 L201 273 Q170 283 123 273 L113 259 Q47 237 33 174Z',blue)+
    p('M35 174 Q150 150 283 175 Q173 200 35 174Z',toast)+line('M48 174 q20 -12 43 -3 t42 -2 t43 0 t37 0 M59 178 q20 -11 45 -3 t43 0 t36 -1',gold,3)+
    g('rotate(-15 224 169)',e(224,166,20,15,milk)+e(223,168,10,8,'#f4b04f',1.5))+garnish(190,170)+line('M61 204 Q157 241 256 206',milk,6)+fish(158,231,.7)),
  motif('nigiri','Schnurrimi-Nigiri','schlaf','translate(22 11) scale(.90)',
    p('M27 225 Q30 199 67 193 L229 174 Q266 175 284 198 L289 226 Q282 250 246 258 L82 273 Q43 272 31 252Z',milk)+
    line('M46 239 l7 -2 m10 13 l6 -1 m13 -7 l6 1 m140 -6 l6 -3 m16 -3 l5 -3','#c59a77',3),
    p('M109 205 Q130 210 151 208 L160 264 L119 269Z','#527c73')+line('M116 211 l7 51 m9 -47 l6 45 m7 -36 l4 27','#82a997',2)+
    garnish(260,255)+p('M250 259 q9 -14 16 -5 q14 -4 18 8 q-19 8 -34 -3Z',mint)),
  motif('pizza','Fliegende Untertassenpizza','pfote','translate(61 40) scale(.66) rotate(-8 160 150)',
    line('M17 189 l41 -12 M29 207 l27 -8 M32 225 l29 -7','#aa89ab',4)+sparkle(256,106,.9)+sparkle(71,90,.7),
    p('M45 214 Q127 180 271 168 Q287 167 282 181 L221 247 Q144 248 45 214Z',toast)+
    p('M45 208 Q142 168 275 163 L215 238 Q127 241 45 208Z',gold)+p('M52 208 Q142 177 270 169 L217 228 Q201 228 196 243 Q192 253 188 241 L188 232 Q111 233 52 208Z','#ffe19a',2.5)+
    p('M42 206 Q139 165 266 156 Q284 155 282 165 Q279 174 268 173 Q147 180 49 219 Q37 218 42 206Z',toast)+
    e(139,205,13,7,red,2)+e(214,190,12,7,red,2)+e(189,216,10,6,red,2)+garnish(164,192)+garnish(210,210)),
  motif('burger','Byte im Brötchen','sitz','translate(16 20) scale(.91)',
    '',
    p('M49 227 Q155 207 271 224 Q272 249 255 259 Q145 277 62 256 Q50 249 49 227Z',gold)+
    p('M49 225 Q47 212 61 212 Q149 199 260 208 Q275 207 273 222 Q269 239 249 239 L68 245 Q49 245 49 225Z','#985d48')+
    p('M54 211 Q149 196 267 206 L230 216 L208 230 L192 214 L132 218 L103 231 L92 218Z','#f4c65e')+
    p('M46 208 Q60 196 75 202 Q87 187 104 199 Q116 190 132 197 Q149 184 165 198 Q185 185 201 197 Q220 184 236 196 Q266 187 277 202 Q265 214 246 207 Q227 220 211 209 Q194 220 175 212 Q154 223 134 211 Q114 223 93 214 Q64 223 46 208Z',mint)+
    p('M75 76 Q75 37 116 23 Q167 6 208 29 Q236 43 242 66 Q170 91 75 76Z',gold)+
    [[105,55,-20],[128,39,26],[157,53,-20],[171,34,13],[203,46,-20],[187,60,22],[135,64,20]].map(([x,y,r])=>sesame(x,y,r)).join('')),
  motif('taco','Taco-Katze, rückwärts auch fast','pfote','translate(41 33) scale(.78)',
    p('M36 206 Q32 103 145 92 Q250 85 285 193 Q185 238 36 206Z',gold)+line('M54 181 q17 -60 67 -69','#cb884a',4),
    p('M31 191 Q45 170 61 185 Q72 165 91 182 Q106 159 122 180 Q145 164 160 179 Q179 155 197 176 Q216 160 235 173 Q258 158 276 178 L281 205 Q171 240 31 191Z',mint)+
    e(76,189,12,8,red)+e(190,181,13,8,red)+e(246,181,11,7,red)+
    p('M31 188 Q138 213 286 178 Q275 248 191 267 Q70 284 31 188Z','#efbb72')+
    dots([[65,212,3],[79,232,2],[95,224,3],[131,249,3],[172,232,3],[209,245,2],[242,211,3],[260,197,2]],'#b88054')+garnish(269,228)),
  motif('kaffee','Latte Miau-chiato','schlaf','translate(44 13) scale(.70)',
    e(152,251,114,21,'#cbb9da')+e(152,247,85,10,'#ded1e5',1.8)+p('M223 156 Q272 130 279 167 Q281 203 225 210 L223 192 Q263 187 258 168 Q255 158 227 174Z',milk)+steam(83,112)+steam(219,89,.9),
    p('M55 153 Q144 134 235 151 Q237 218 193 242 Q135 260 89 234 Q59 214 55 153Z','#db99ac')+
    p('M57 152 Q141 133 234 150 Q149 171 57 152Z','#9d6952')+line('M76 156 Q119 137 176 148 Q184 156 156 157 Q133 158 126 153','#f5d9a7',3)+
    p('M125 194 Q126 179 142 188 Q157 172 163 187 Q167 200 145 216 Q130 210 125 194Z',milk)+line('M70 175 Q74 202 87 213','#f9c4cb',4)),
  motif('pfannkuchen','Stack Overflow mit Ahornsirup','sitz','translate(66 12) scale(.58)',
    e(160,252,122,22,blue)+e(159,251,99,13,'#d6e8df',1.8)+sparkle(53,146,.8),
    [0,1,2].map((n)=>g(`translate(0 ${-17*n})`,p('M57 226 Q61 210 169 208 Q258 205 267 222 L265 235 Q249 251 152 251 Q68 249 57 236Z',gold)+e(161,224,104,17,'#e6a165'))).join('')+
    p('M83 187 Q130 170 230 181 Q259 183 255 190 Q253 195 238 195 L234 207 Q229 212 226 200 Q203 201 202 211 Q198 221 193 216 L191 203 Q117 206 83 187Z','#ba7652',2.5)+
    p('M137 182 L167 174 L188 181 L159 192Z','#ffeab0')+e(100,182,6,6,plum)+e(112,179,6,6,'#8986b0')+garnish(210,181)),
  motif('eis','Eine Kugel Schnurrstracciatella','sitz','translate(73 5) scale(.54)',
    sparkle(67,98,.9)+sparkle(245,131,.8),
    p('M83 151 L234 150 L171 279 Q166 285 161 279Z',gold)+
    line('M103 168 l79 83 m-65 -62 l54 63 m-37 -91 l63 63 m-36 -61 l49 45 m-49 55 l57 -91 m-71 77 l58 -87 m-72 71 l49 -73 m-64 53 l34 -53','#b87b55',2.5)+
    p('M72 148 Q70 125 90 114 Q94 93 121 95 Q141 82 162 97 Q185 84 205 100 Q234 100 239 125 Q255 139 243 151 Q234 165 222 155 Q212 171 199 159 Q178 174 163 160 Q143 176 128 161 Q107 170 98 157 Q79 164 72 148Z',pink)+
    dots([[95,134,3],[116,121,3],[147,143,3],[173,122,2],[199,144,4],[222,127,3]],dark)+e(191,88,12,12,red)+line('M193 78 Q195 62 209 60',leaf,3)),
  motif('bento','Pausenbrot mit Pfoten','schlaf','translate(25 36) scale(.64) rotate(-4 160 150)',
    p('M30 158 L226 118 Q240 116 247 125 L290 198 Q293 207 283 214 L92 265 Q75 268 67 257 L27 180 Q22 164 30 158Z',red)+
    p('M35 163 L231 124 L281 199 L83 252Z',milk)+
    p('M188 135 L235 211 L282 199 L234 126Z',pink)+
    g('rotate(-13 235 164)',rect(214,143,35,20,7,gold)+line('M219 150 h24 m-22 6 h20','#d5965b',2))+
    g('rotate(-13 252 184)',rect(235,173,31,17,7,gold))+garnish(206,141),
    p('M29 173 L83 248 L283 197 L289 206 Q289 213 281 216 L88 270 Q77 273 70 263 L27 185Z','#c36d65')+line('M97 257 l49 -13','#f2ae9a',3)+fish(180,231,.47)),
  motif('spaghetti','Spaghetti-Code al dente','code','translate(36 5) scale(.75)',
    g('rotate(15 250 154)',line('M249 205 V83',ink,8)+line('M249 205 V83',blue,4)+p('M235 82 L235 53 L240 52 L241 72 L246 73 L246 49 L251 49 L252 72 L257 73 L258 52 L263 52 L262 82 Q248 97 235 82Z',blue))+steam(72,167,.8),
    e(154,230,122,33,'#d9bddd')+e(154,225,103,22,milk)+
    p('M69 223 Q72 204 95 204 Q103 188 124 193 Q139 180 161 189 Q187 182 199 195 Q224 195 239 217 Q188 244 69 223Z',gold)+
    line('M76 221 q15 -21 37 -13 t44 0 t44 -3 q20 -1 31 11 M90 224 q12 -14 36 -8 t45 -4 t46 4 M103 204 q16 -12 36 -4 t41 -3',toast,3)+
    p('M118 196 Q123 185 135 190 Q151 176 168 187 Q184 182 193 194 Q181 206 165 201 Q143 211 118 196Z',red)+garnish(157,186)+
    line('M233 82 Q244 92 256 81 Q265 74 264 84 Q264 94 248 94 Q237 97 244 112 Q258 139 244 153',gold,4)),
  motif('waffel','Waffel im Prüfungsstress','pfote','translate(32 14) scale(.79)',
    sparkle(45,138,.8),
    g('rotate(-14 180 217)',p('M129 169 Q153 144 178 171 Q196 141 223 158 Q251 183 218 222 L175 256 Q118 222 112 197 Q107 179 129 169Z',gold)+
    line('M128 175 l64 65 m-76 -45 l56 54 m-36 -82 l74 58 m-39 -56 l50 42 m-29 -47 l39 35 M119 202 l35 -35 m-24 53 l54 -55 m-40 67 l71 -72 m-58 81 l72 -72 m-57 81 l62 -60',toast,2.6))+
    e(223,184,13,12,red)+garnish(225,173)+e(242,205,7,7,plum)+e(225,213,6,6,plum)),
  motif('toaster','Morgens erst mal booten','pfote','translate(47 -3) scale(.69)',
    line('M61 124 l-11 -16 m21 11 l-4 -17 M224 102 l8 -13 m1 22 l13 -8',toast,3)+sparkle(245,78,.6),
    rect(43,154,222,100,23,'#9bc4cc')+p('M45 173 Q46 152 65 150 L241 150 Q260 152 264 168 Q150 183 45 173Z',blue)+
    line('M67 161 Q143 168 237 159',ink,6)+rect(64,250,25,12,4,dark)+rect(219,249,25,12,4,dark)+
    p('M244 193 L270 188 L273 195 L249 202Z',ink)+rect(266,184,19,13,5,pink)+e(225,223,13,13,milk)+line('M225 223 l6 -7',ink,3)+
    rect(76,195,76,30,9,milk)+p('M97 213 l6 -8 l7 9 l6 -7 l6 7', 'none',2.8)),
  motif('bubbletea','Eine Portion Boba-Logik','sitz','translate(26 14) scale(.85)',
    sparkle(265,104,.8),
    g('rotate(8 220 190)',p('M172 144 L260 143 L248 260 Q219 272 189 260Z','#dec1cb')+
    p('M178 176 Q200 183 217 176 Q239 169 256 178 L247 257 Q216 268 190 257Z','#c58e83',2)+
    p('M218 147 L222 70 L237 69 L230 150Z',mint)+line('M223 87 l10 6 m-11 12 l10 6 m-11 13 l9 5','#649c89',3)+
    e(216,145,46,8,milk)+line('M222 145 L223 137',mint,7)+
    [[201,246],[217,253],[235,247],[210,231],[228,232],[236,215],[201,213]].map(([x,y])=>e(x,y,6,6,dark,1.7)+e(x-1,y-2,1.6,1.6,'#dcbbd1',0)).join('')+
    line('M185 183 l5 37',milk,3))),
  motif('guss','Der Zuckerguss kompiliert','sitz','translate(15 3) scale(.90)',
    chef+sparkle(262,111,.9),
    p('M40 217 Q47 202 71 201 Q77 178 103 186 Q126 164 145 183 Q172 165 189 184 Q213 176 230 197 Q256 196 268 214 L259 247 Q158 272 53 253Z',toast)+
    p('M39 216 Q48 200 72 200 Q77 177 101 184 Q125 164 145 182 Q168 164 192 182 Q218 176 232 196 Q252 194 269 212 Q273 224 260 228 Q253 225 247 237 Q242 245 237 234 L234 225 Q216 222 207 232 Q197 246 191 231 Q183 217 170 233 Q159 247 148 234 Q135 222 124 237 Q114 252 104 239 Q94 224 82 238 Q71 250 62 237 Q44 238 39 216Z',pink)+
    line('M67 214 l9 -4 m32 -16 l8 4 m40 -8 l-5 6 m31 5 l9 -4 m35 8 l-7 4',milk,4)+dots([[90,211,3],[128,214,2.6],[169,210,3],[209,191,2.7]],'#86bda7')),
  motif('pfanne','Pancake im freien Fall','pfote','translate(7 16) scale(.81)',
    g('rotate(-27 250 70)',e(250,71,35,11,toast)+e(250,65,36,10,gold)+line('M230 65 q18 -10 37 -4',milk,2.5))+
    line('M234 95 q-13 20 -9 38 m19 -27 q-4 10 -3 19','#af91ad',3)+sparkle(208,71,.7),
    g('rotate(-12 213 207)',p('M126 214 L182 203 L192 215 L131 229 Q117 230 126 214Z',toast)+
    p('M177 189 Q211 165 279 183 Q288 194 268 212 Q232 237 192 220 Q179 213 177 189Z',dark)+
    e(228,189,51,16,'#85819b')+line('M193 188 Q226 174 258 185','#c1b7ca',3))+
    g('translate(0 -3)',chef)),
  motif('brezel','Brezel dich nicht auf','sitz','translate(29 12) scale(.83)',
    '',
    g('rotate(-9 209 198)',line('M182 229 Q154 199 160 176 Q163 153 183 156 Q204 157 213 187 Q221 154 244 157 Q273 163 259 189 Q250 209 212 229 Q174 211 167 192 M179 221 Q206 224 245 201',ink,18)+
    line('M182 229 Q154 199 160 176 Q163 153 183 156 Q204 157 213 187 Q221 154 244 157 Q273 163 259 189 Q250 209 212 229 Q174 211 167 192 M179 221 Q206 224 245 201',toast,12)+
    [[166,175,-34],[184,159,20],[200,173,-10],[243,161,12],[257,181,-24],[239,207,12],[211,223,25],[180,214,-18]].map(([x,y,r])=>g(`rotate(${r} ${x} ${y})`,rect(x-2,y-1,4,3,1,milk))).join(''))+sparkle(272,133,.9)),
];
