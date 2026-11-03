from pathlib import Path
from subprocess import run
from random import Random
out=Path('../public/art')
ink='#453149'; orange='#ffa257'; light='#ffdc9f'; stripe='#cb653e'; cream='#fff4d8'; green='#8bdfb8'
def p(d,c='none',w=4,s=ink):
 return f'<path d="{d}" fill="{c}" stroke="{s}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
def ellipse(x,y,rx,ry,c,rot=0):
 return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" transform="rotate({rot} {x} {y})" fill="{c}"/>'
def grp(parts,attrs=''):
 return f'<g {attrs}>'+''.join(parts)+'</g>'
def marks(paths,c=ink,w=2.1):
 return ''.join(p(d,'none',w,c) for d in paths)
def rngDots(x,y,rx,ry,n,seed):
 r=Random(seed); out=''
 for i in range(n):
  a,b=r.uniform(-1,1),r.uniform(-1,1)
  if a*a+b*b<1:out+=ellipse(x+rx*a,y+ry*b,r.random()*.75+.3,r.random()*.8+.4,'#c77452',r.randint(-45,45))
 return out
def head(face):
 h=[p('M82 88 Q77 65 78 34 Q79 24 86 28 Q104 37 121 53 Q141 45 160 49 Q165 42 167 45 L168 50 Q180 47 194 54 Q208 35 228 24 Q236 21 237 32 Q239 59 233 80 Q247 98 248 116 L253 120 L247 126 L253 130 Q248 137 241 139 Q237 157 214 166 Q184 181 151 181 Q110 182 84 164 Q65 153 62 140 Q54 139 54 136 L62 130 L54 129 Q53 127 62 119 Q62 101 82 88 Z',orange),
 p('M87 41 Q98 46 112 59 Q99 65 87 77 Q85 59 87 41Z','#f6ac94',2.5),
 p('M225 37 Q213 44 202 58 Q217 62 227 72 Q230 53 229 40 Q228 36 225 37Z','#f6ac94',2.5)]
 for d in ['M125 55 Q128 52 139 51 Q140 64 136 77 Q130 74 125 55Z','M146 51 Q152 50 160 52 Q157 65 151 70 Q147 66 146 51Z','M170 53 Q176 52 182 54 Q177 65 171 68 Q169 64 170 53Z','M66 107 Q78 103 94 108 Q85 113 64 115Z','M64 119 Q80 116 90 120 Q83 126 66 126Z','M242 103 Q228 101 217 109 Q230 111 245 110Z','M246 117 Q236 115 224 120 Q230 125 246 124Z']:
  h.append(p(d,stripe,0))
 h.append(p('M67 133 Q83 126 104 131 Q116 134 128 123 Q139 115 149 124 Q155 128 161 123 Q171 116 183 123 Q192 129 207 129 Q229 123 241 133 Q238 151 213 162 Q184 176 154 177 Q102 180 78 154 Q70 147 67 133Z',light,0))
 h.extend([ellipse(102,125,12,5,'#f38c75',-8),ellipse(202,122,12,5,'#f38c75',8)])
 if face=='sleep':
  h.append(marks(['M104 108 Q116 118 128 106','M169 105 Q183 114 194 102'],ink,4))
 else:
  eye=[ellipse(119,107,7.5,10.5,ink),ellipse(117.5,102.5,2.5,3,'white')]
  if face=='wink':eye.append(p('M172 107 Q181 96 191 104','none',4.5))
  else: eye.extend([ellipse(181,104,7.5,10.5,ink),ellipse(179,100,2.5,3,'white')])
  h.append(grp(eye,'class="eyes"'))
 h.extend([p('M144 122 Q150 119 157 121 Q161 122 158 125 L153 130 Q151 132 148 129 L143 125 Q141 123 144 122Z',ink,1),
 p('M151 134 Q158 141 167 131 Q168 146 160 148 Q152 149 151 134Z','#f29b9c',2.6) if face!='sleep' else '',
 marks(['M151 129 Q152 138 143 139 Q139 139 137 135','M152 131 Q158 141 166 132'],ink,3.1),
 marks(['M88 132 Q67 126 44 127','M90 138 Q65 137 50 143','M92 144 Q74 148 65 154','M209 129 Q234 119 256 117','M212 135 Q240 129 262 131','M213 141 Q238 140 254 145'],ink,2),
 rngDots(105,140,14,6,18,52),rngDots(198,136,14,6,18,62),
 marks(['M94 70 L91 74','M97 70 L94 75','M220 64 L222 68','M216 63 L219 68'],'#a65b57',1.6)])
 return grp(h)
tail=grp([p('M211 217 Q238 228 251 214 Q260 204 256 191 Q248 178 253 170 Q258 158 270 164 Q282 171 286 190 Q294 222 269 243 Q247 261 215 253Z',orange),
 p('M253 175 Q253 164 262 164 Q272 163 278 177 Q266 176 256 184Z',light,0),
 p('M260 192 Q269 185 284 184 L286 191 Q274 191 262 199Z',stripe,0),
 p('M260 211 Q272 213 284 208 Q282 217 279 221 Q270 223 257 218Z',stripe,0),
 p('M244 225 Q249 237 246 251 L236 253 Q241 240 237 228Z',stripe,0)],'class="tail"')
def body(wave=False):
 b=[tail,p('M111 144 Q131 131 163 134 Q204 132 223 163 Q244 195 242 221 Q247 239 240 250 Q232 262 212 260 Q187 268 164 260 Q133 268 113 262 Q91 267 78 257 Q61 246 66 224 Q68 207 83 192 Q85 166 111 144Z',orange),
 p('M106 171 Q125 179 145 174 Q170 169 187 161 Q188 179 182 193 Q171 212 175 238 Q164 252 145 253 Q129 241 125 219 Q123 198 106 171Z',light,0),
 p('M76 208 Q88 206 98 216 Q84 214 70 218Z',stripe,0),
 p('M68 224 Q82 222 91 231 Q77 230 67 234Z',stripe,0),
 p('M223 170 Q211 171 207 179 Q218 178 228 178Z',stripe,0),
 p('M231 184 Q214 183 208 194 Q220 190 235 193Z',stripe,0),
 p('M236 200 Q224 198 215 206 Q229 204 238 207Z',stripe,0),
 rngDots(221,222,14,10,48,74),rngDots(83,237,14,9,45,144),
 p('M111 196 Q105 216 107 231 Q106 238 98 243 Q89 250 96 258 Q101 266 122 264 Q136 264 140 254 Q144 238 143 222',orange,3.6),
 p('M170 218 Q169 232 167 244 Q164 253 170 259 Q176 265 193 262 Q209 261 207 250 Q206 243 201 240 Q206 222 206 203',orange,3.6),
 marks(['M107 261 Q105 255 109 252','M118 263 Q116 255 120 253','M181 260 Q178 254 182 250','M192 260 Q190 253 193 250','M225 250 Q230 251 232 247'],ink,2.3)]
 return ''.join(b)
def scarf():return grp([p('M93 151 Q143 178 206 146 L201 163 Q182 178 148 187 L129 201 Q125 204 122 199 L105 174 Q96 169 93 151Z',green,3.3),
 p('M186 165 Q203 169 214 178 Q211 164 204 156 Q217 153 220 145 Q204 145 192 154Z',green,2.8),
 marks(['M102 161 Q127 178 147 177','M119 189 L125 196 L130 191'],'#548f87',2),p('M133 183 L136 179 L140 182 L137 186Z',cream,0)])
def make(pose):
 if pose=='schlaf':
  elements=grp([p('M45 200 Q44 174 65 154 Q91 128 136 133 Q175 127 200 151 Q234 174 230 204 Q230 229 199 238 Q142 250 85 238 Q51 236 45 216Z',orange),
   p('M59 164 Q71 149 89 143 Q93 160 88 170 Q78 157 76 156 Q74 173 70 177Z',stripe,0),
   grp([head('sleep')],'transform="translate(90 108) scale(.69) rotate(6 160 128)"'),
   p('M69 202 Q56 217 75 226 Q104 237 126 224 Q145 214 154 223 Q165 237 140 245 Q94 262 57 244 Q35 233 39 211 Q42 197 55 192 Q66 186 73 190',orange),
   p('M123 226 Q144 214 153 225 Q161 235 144 242 Q141 230 123 226Z',light,0),
   marks(['M68 233 Q70 239 67 246','M81 237 Q84 244 79 250'],stripe,5),
   p('M191 229 Q196 218 208 219 Q220 220 222 228 Q220 236 207 237 Q195 238 191 229Z',light,2.7),
   '<g fill="#71609b" font-family="sans-serif" font-weight="bold" transform="rotate(-8 220 100)"><text x="204" y="108" font-size="17">z</text><text x="222" y="90" font-size="25">Z</text></g>'])
 else:
  parts=[body(),scarf(),head('wink' if pose in ('hero','sitz','pfote') else 'open')]
  if pose=='code':
   parts += [p('M35 194 L137 194 Q141 194 142 198 L156 243 L183 245 L194 251 L194 257 Q194 260 188 260 L58 260 Q53 260 52 255 L32 201 Q29 195 35 194Z','#9a88c3',3.5),
   p('M52 250 L155 250 L181 253 L53 254Z','#c5badd',0),
   ellipse(90,218,7,6,cream,-12),ellipse(80,212,2.7,3.8,cream,-15),ellipse(86,206,2.6,3.5,cream),ellipse(94,205,2.5,3.4,cream),ellipse(100,210,2.6,3.4,cream,18)]
  if pose=='pfote':
   parts+=[p('M115 197 Q99 200 87 185 L72 161 Q64 155 62 146 Q59 135 64 131 Q69 127 72 134 Q72 124 77 123 Q84 122 84 132 Q87 125 92 128 Q97 131 94 140 Q103 136 105 142 Q107 148 100 155 Q108 164 121 172',orange,3.5),ellipse(81,148,8,6,'#ef9290',12),ellipse(68,139,2.6,4,'#ef9290',-15),ellipse(77,135,2.7,4,'#ef9290'),ellipse(87,137,2.5,3.9,'#ef9290',12),
   marks(['M49 153 Q42 146 44 137','M43 160 Q32 153 33 144'],'#a493b9',3)]
  elements=grp(parts,'class="cat"')
 css='''<style>@keyframes sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(5deg)}}@keyframes breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.008,.986)}}@keyframes blink{0%,41%,45%,100%{transform:scaleY(1)}43%{transform:scaleY(.12)}}.tail{transform-origin:224px 236px;animation:sway 3.3s ease-in-out infinite}.cat{transform-origin:155px 264px;animation:breathe 3.3s ease-in-out infinite}.eyes{transform-origin:150px 106px;animation:blink 5.1s infinite}@media(prefers-reduced-motion:reduce){g{animation:none!important}}</style>''' if pose=='hero' else ''
 view='26 70 255 205' if pose=='schlaf' else '24 13 272 262'
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" width="520" height="500" role="img" aria-label="Getigerte Kurskatze mit mintgrünem Halstuch">{css}{elements}</svg>'
for name in ['hero','sitz','code','schlaf','pfote']:
 f=out/(name+'.svg');f.write_text(make(name))
 if name!='hero':run(['inkscape',str(f),'--export-width=1600','--export-filename='+str(out/(name+'.png'))],check=True)
