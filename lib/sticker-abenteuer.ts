import type { Motif } from './sticker-types';

const ink = '#453149', mint = '#8ddbbf', teal = '#489997', pink = '#efafc0', gold = '#ffd484', blue = '#a6d7e9', dark = '#73688c', ivory = '#fff2d8', coral = '#ed9176';
const path = (d: string, fill = 'none', w = 3.5, stroke = ink) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const oval = (cx: number, cy: number, rx: number, ry: number, fill: string, w = 3.5) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${ink}" stroke-width="${w}"/>`;
const spark = (x:number,y:number,k=1) => `<g transform="translate(${x} ${y}) scale(${k})">${path('M0 -8 Q1 -1 7 0 Q1 2 0 9 Q-1 2 -7 0 Q-1 -2 0 -8Z',gold,2)}</g>`;
const wave = (x:number,y:number,k=1) => `<g transform="translate(${x} ${y}) scale(${k})">${path('M0 5 Q8 9 14 3 Q20 8 27 3 M36 5 Q42 7 48 3','none',2.8,teal)}</g>`;
const cloud = (x:number,y:number,k=1) => `<g transform="translate(${x} ${y}) scale(${k})">${path('M1 19 Q-2 10 9 9 Q13 -4 25 2 Q29 4 29 9 Q38 3 43 12 Q52 12 52 20 Q32 23 1 19Z',ivory,2.6)}</g>`;
const tree = (x:number,y:number,k=1) => `<g transform="translate(${x} ${y}) scale(${k})">${path('M-3 1L3 1L3 21L-3 22Z','#ad8171',2)}${path('M0 -38L12 -16L7 -16L19 5Q2 11 -18 6L-6 -15L-11 -14Z',mint,2.7)}</g>`;
const item=(id:string,title:string,pose:Motif['pose'],transform:string,back:string,front:string):Motif=>({id:'ab-'+id,title,category:'Abenteuer',pose,transform,back,front});

export const abenteuer:Motif[]=[
  item('gipfel','Gipfel mit Schnurrgarantie','pfote','translate(62 19) scale(.66)',
    path('M19 241L82 149L109 169L165 76L198 128L220 101L303 238Q242 256 152 251Z','#b9bad5')+
    path('M123 145L165 76L197 128L176 115L170 130L157 116L145 139L141 131Z',ivory,2.5)+
    path('M204 126L220 101L245 143L229 134L224 138L216 123Z',ivory,2.5)+cloud(20,101,.68)+
    path('M243 184L242 49','none',4)+path('M243 50Q258 44 271 52L284 48L278 71Q267 77 257 69L243 72Z',coral),
    path('M26 249Q52 231 76 233L101 213L111 215L137 191L154 192L160 180L173 182L179 197L201 201L227 223L247 225L287 250Q194 271 26 249Z','#94c8a7')+
    path('M58 247L79 242M133 211L145 200L158 201M168 229L178 225L184 229M222 242L235 242','none',2.6,teal)),
  item('gondel','Gondel statt Gruppenarbeit','sitz','translate(82 81) scale(.51)',
    path('M20 60L287 21','none',4)+oval(145,40,8,8,gold)+oval(167,37,8,8,gold)+
    path('M140 47L153 70L159 70L171 43','none',4)+path('M156 70L156 96','none',6)+
    path('M72 127Q73 105 99 101L219 101Q244 103 249 129L256 211L66 211Z',blue)+
    path('M81 125Q83 115 100 113L218 113Q234 115 238 129L242 188L79 188Z',ivory,2.5)+cloud(14,99,.63)+cloud(242,57,.77),
    path('M65 190L255 190L257 225Q255 244 234 247L87 247Q68 245 66 228Z',coral)+
    path('M70 207Q141 213 252 204','none',3,ivory)+path('M92 237L220 237','none',2.5)+
    path('M95 248L102 255L221 255L228 247',dark)+oval(158,224,8,6,ivory,2)),
  item('paddel','Paddel statt Pendeln','pfote','translate(64 46) scale(.65)',
    wave(15,238,.8)+wave(222,218,1.25)+cloud(37,89,.66),
    path('M20 200Q80 220 169 214Q254 209 299 179Q291 204 253 229Q183 260 99 246Q49 238 20 200Z',gold)+
    path('M36 213Q130 249 230 222Q265 212 285 199','none',3,coral)+
    path('M83 109L220 226','none',8)+path('M71 99Q60 82 51 88Q42 96 57 110L85 129L91 119Z',teal)+
    path('M201 220L212 210Q229 217 243 232Q251 243 243 250Q237 255 226 247Z',mint)+wave(50,258)+wave(204,265,.8)),
  item('segel','Segel setzen, WLAN weg','sitz','translate(75 99) scale(.49)',
    path('M179 205L176 31','none',5)+path('M178 32Q193 27 210 35L181 46Z',coral)+
    path('M184 54Q228 95 262 167Q236 154 185 168Z',ivory)+path('M189 79Q213 106 239 149','none',2.6,'#d4938e')+
    path('M168 61Q124 111 88 174Q120 164 168 169Z',pink)+path('M98 166Q128 147 163 148','none',2.5,ivory)+cloud(28,73,.77),
    path('M30 199Q114 210 169 206Q246 203 286 186L260 220Q215 247 89 243Q58 232 30 199Z',blue)+
    path('M53 215Q151 231 258 208','none',3,ivory)+oval(85,226,5,5,dark,2)+oval(109,230,5,5,dark,2)+wave(42,252)+wave(213,253,1.2)),
  item('ballon','Aufstieg ohne Beförderung','pfote','translate(100 145) scale(.40)',
    path('M71 86Q66 36 113 21Q161 1 205 23Q244 39 244 78Q246 113 203 147L184 159L130 159Q94 138 78 108Z',pink)+
    path('M120 20Q82 76 122 134L138 157L151 158Q124 103 133 52L142 15Z',gold,2.7)+
    path('M172 15Q197 81 170 158L184 158Q231 100 220 59Q210 28 195 20Z',mint,2.7)+
    path('M129 157Q155 166 186 156L181 169L135 170Z',dark,3)+
    path('M138 168L108 223M179 167L207 223','none',3)+cloud(17,164,.81)+cloud(231,138,.73),
    path('M103 220Q153 231 211 218L205 253Q156 272 113 252Z','#cca27a')+
    path('M105 221Q157 232 210 220L209 230Q155 242 108 232Z',gold,2.5)+
    path('M123 237L133 256M142 238L153 260M164 237L174 259M185 235L195 251M119 248L196 242','none',2,'#946955')),
  item('zelten','Zelt.exe aufgebaut','schlaf','translate(86 111) scale(.49)',
    tree(54,187,1.12)+tree(268,190,.94)+path('M39 230L131 72Q138 63 148 71L171 73L285 223Q269 240 163 242Z',mint)+
    path('M74 223L139 80L218 231Z',dark)+path('M39 230Q85 219 112 183L139 80Q89 119 39 230Z','#b6efd0')+
    path('M142 77L171 73L284 222L231 224L208 193Z','#81bdaa')+spark(225,65,.7)+spark(77,50,1)+
    path('M206 43Q179 48 183 28Q172 34 176 49Q182 66 202 56Q207 52 206 43Z',gold,2.8),
    path('M43 232L31 242M284 225L294 235M103 241Q147 252 203 242','none',2.8)+
    path('M224 225L245 249M245 221L223 249','none',5,'#9d735f')+
    path('M223 231Q213 218 228 200Q230 208 233 209Q241 197 239 188Q257 204 249 221Q246 231 236 233Z',coral,2.8)+path('M231 225Q229 217 238 207Q239 214 242 218Q244 224 239 228Z',gold,1.5)),
  item('mond','Mondlandung mit Miau','pfote','translate(75 62) scale(.58)',
    path('M70 222Q43 209 52 186Q57 177 67 174Q53 151 65 139L83 140','none',7,dark)+
    path('M74 124Q64 41 144 35Q230 23 243 103Q248 155 219 182L98 194Q76 169 74 124Z',blue,4)+
    path('M87 111Q84 83 105 65M113 60L121 55','none',5,ivory)+
    spark(253,52,1.1)+spark(272,130,.7)+spark(41,98,.66)+
    oval(59,46,14,12,gold,3)+path('M40 56Q47 61 69 47Q83 37 77 35','none',3.5),
    path('M91 185Q154 214 220 177L223 192Q157 230 88 200Z',ivory)+
    path('M37 254Q70 220 112 226Q163 212 216 226Q259 226 285 251Q240 269 167 268Q78 269 37 254Z','#c5bfd4')+
    oval(87,246,10,4,'#a59bb7',2)+oval(192,251,13,4,'#a59bb7',2)+oval(241,239,6,3,'#a59bb7',1.8)),
  item('snowboard','Piste mit Pfotenantrieb','pfote','translate(61 31) rotate(-13 100 140) scale(.72)',
    path('M58 222Q26 215 32 200Q37 194 49 202Q23 173 35 170Q43 165 57 185Q46 155 55 153Q64 150 73 180L94 215Z',blue,2.6)+
    cloud(223,60,.65)+tree(262,185,.66)+tree(283,193,.46),
    path('M31 227Q43 235 66 233Q164 238 264 200Q274 197 279 186Q300 189 285 208Q271 220 243 229Q133 267 53 249Q32 244 31 227Z',mint)+
    path('M47 239Q106 254 174 237M199 229L221 222','none',3,ivory)+path('M61 257L111 260M35 250L45 252','none',2.8,blue)+spark(234,105,.82)),
  item('eis','Eisprinzessin auf vier Pfoten','pfote','translate(45 18) rotate(8 128 127) scale(.77)',
    spark(45,127,.83)+spark(238,53,1.05)+spark(269,89,.66)+
    path('M22 236Q81 214 140 226Q214 217 290 235Q225 259 157 260Q77 266 22 236Z','#d8edf2',2.4),
    path('M108 217Q115 226 127 222L135 229Q125 238 94 231L94 222Z',ivory)+
    path('M157 221Q171 232 185 224L199 231Q187 241 151 234L147 226Z',ivory)+
    path('M97 230L97 237M123 233L123 240M154 234L154 241M184 235L184 242M84 232Q84 239 100 240L134 240M143 239Q145 244 164 245L199 243','none',3.5,dark)+
    path('M52 248Q76 255 103 251M207 247Q237 246 250 240','none',2.7,teal)),
  item('surf','Welle statt Vorlesung','pfote','translate(56 31) rotate(-7 140 145) scale(.70)',
    path('M23 220Q57 217 79 187Q95 158 126 167Q99 167 101 181Q104 193 122 188Q103 209 83 218Q58 231 23 228Z',blue)+
    path('M213 213Q246 195 246 164Q246 133 224 131Q245 112 265 127Q295 152 285 183Q278 208 253 216Z',mint)+
    path('M224 131Q236 118 249 121Q260 122 268 131Q257 125 253 137Q240 127 233 137Z',ivory,2.2),
    path('M24 232Q56 213 150 214Q236 214 295 193Q280 221 227 233Q95 259 24 232Z',gold)+
    path('M52 233Q166 232 265 210','none',4,coral)+wave(37,247)+wave(204,247,1.15)),
  item('tauchgang','Unter Wasser offline','sitz','translate(64 47) scale(.65)',
    oval(151,132,82,77,'#d6f1ed')+oval(151,132,74,69,'#b3e0e3',2.5)+
    path('M75 126Q69 96 90 78M93 73L99 68','none',5,ivory)+
    path('M218 131L235 129L241 54Q242 46 252 47L265 49L263 59L251 58L247 134Q246 144 232 146L218 146Z',coral)+
    oval(65,78,7,7,blue,2)+oval(52,57,4,4,blue,2)+oval(260,99,7,7,blue,2),
    path('M115 125Q126 117 148 119L177 116Q190 115 196 122L191 140Q178 146 165 139L156 136L148 144Q132 151 120 143Z',teal)+
    path('M122 128Q135 123 149 124L143 138Q128 145 123 138ZM163 123L185 122L184 135Q173 139 166 134Z','#c0f0ed',2)+
    path('M95 220Q110 215 126 224L135 233Q122 241 88 239Z',gold)+path('M159 225Q175 216 188 222L211 237Q185 245 161 237Z',gold)+
    wave(28,250,.8)+wave(213,250)),
  item('seilbahn','Gleitzeit wortwörtlich','pfote','translate(75 76) rotate(11 90 90) scale(.61)',
    path('M17 115L298 28','none',5)+oval(123,82,9,9,gold)+oval(151,73,9,9,gold)+
    path('M117 86L129 104L150 98L158 77Z',mint)+path('M140 103L158 145M133 104L103 168','none',4)+
    cloud(212,68,.8)+tree(37,218,.67)+tree(61,228,.48),
    path('M126 187Q160 210 198 199L200 208Q160 222 120 195Z',coral)+
    path('M143 200L150 213L160 210L154 200Z',gold,2.4)+
    path('M77 169L54 176M83 178L65 185M87 188L74 193','none',3,teal)),
  item('papierflug','Abgabe im Anflug','sitz','translate(63 56) rotate(-9 140 130) scale(.61)',
    cloud(16,100,.82)+cloud(233,64,.81)+
    path('M24 205L292 139L181 255L133 221L73 238Z',ivory)+path('M24 205L292 139L135 210L73 238Z',blue,2.6),
    path('M79 211L292 139L180 255L141 225Z','#e2dff1')+
    path('M140 225L291 140L158 231L148 246Z','#adaccb',2.5)+
    path('M37 243Q10 259 28 267Q44 270 47 257Q48 247 33 253M57 250L66 244','none',2.8,teal)),
  item('paragleiter','Freifach Freiflug','pfote','translate(87 136) scale(.44)',
    path('M23 109Q39 43 114 32Q206 17 284 75L291 89Q217 67 143 70Q71 77 23 109Z',pink)+
    path('M37 94Q61 50 102 38Q83 50 76 78ZM108 72Q119 44 144 30L162 30Q143 43 136 70ZM176 69Q180 42 192 34L211 39Q202 48 204 70ZM236 75Q239 62 237 49L250 55L263 82Z',gold,2.2)+
    path('M27 107L120 190L80 81M139 71L123 189M187 72L181 185L289 88M238 76L181 185','none',1.9)+
    cloud(14,151,.79)+cloud(250,166,.61),
    path('M108 227Q140 244 191 224Q186 242 177 249Q139 258 116 244Z',teal)+
    path('M120 211Q132 222 143 225L176 206','none',4,coral)),
  item('schatz','Schatzfund am Klausurstrand','pfote','translate(80 36) scale(.65)',
    path('M23 246Q30 220 66 214Q92 208 116 219Q168 199 207 211Q263 205 296 239Q220 265 139 263Q63 262 23 246Z','#ecd393')+
    path('M56 222Q75 150 54 100L64 98Q89 154 67 222Z','#b18867')+
    path('M59 102Q27 94 14 113Q28 72 61 92Q43 65 25 63Q62 57 66 85Q74 53 99 50Q86 65 78 89Q109 74 122 89Q92 88 70 103Q97 101 109 125Q86 109 59 102Z',mint,2.6)+spark(251,149,.86),
    path('M167 204Q169 178 182 176L231 172Q246 174 249 196L241 208Z',coral)+
    path('M168 202L248 195L246 226L174 236Z','#bd825e')+path('M178 201L183 180L191 180L187 201L192 233L183 235ZM229 197L222 175L230 174L238 196L239 227L232 229Z',gold,2.1)+
    path('M202 201L215 200L214 211L203 213Z',gold,2)+spark(261,186,.57)+wave(34,259,.65)),
  item('rad','Tour de Miau','sitz','translate(64 49) scale(.58)',
    oval(77,218,38,38,dark)+oval(77,218,30,30,'#ecddee',2)+oval(235,217,38,38,dark)+oval(235,217,30,30,'#ecddee',2)+
    path('M77 190L77 244M51 205L103 231M51 231L102 206M235 189L235 244M210 202L259 232M209 232L261 202','none',1.8,'#af9bb6')+
    path('M77 218L118 167L156 217L77 218M118 167L200 160L156 217M199 144L235 217','none',8,ink)+
    path('M77 218L118 167L156 217L77 218M118 167L200 160L156 217M199 144L235 217','none',4,mint),
    path('M190 143L205 141L211 124L222 123','none',6)+path('M216 123L231 122','none',6,coral)+
    oval(156,217,8,8,gold,2.5)+path('M155 217L171 227L182 227M37 209L21 208M36 218L14 219','none',3)+
    path('M98 104Q98 72 130 64Q160 55 181 85L185 94L115 103Z',coral)+
    path('M112 88Q118 75 125 72M130 84Q136 71 145 69M150 84Q155 76 161 75','none',3.3,ivory))
];
