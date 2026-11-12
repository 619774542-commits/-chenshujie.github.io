/* Animate the actual cover pixels along their original knitting and yarn paths. */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],NS='http://www.w3.org/2000/svg';
const script=[...document.scripts].find(s=>s.src.includes('/opening.js'));if(!script)return;
const root=new URL('.',script.src),asset=p=>new URL(p,root).href;
const clamp=n=>Math.min(1,Math.max(0,n)),ease=n=>1-Math.pow(1-clamp(n),3),range=(t,a,b)=>clamp((t-a)/(b-a));
const allowed=()=>!document.body.classList.contains('motion-off')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
const create=(tag,attrs={},parent)=>{const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);parent?.append(el);return el};
const source=(parent,src,w,h,mask)=>create('image',{href:asset(src),width:w,height:h,preserveAspectRatio:'none',...(mask?{mask:`url(#${mask})`}:{})},parent);
const svgPath=(parent,d,width)=>create('path',{d,fill:'none',stroke:'white','stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',pathLength:1000,'stroke-dasharray':1000,'stroke-dashoffset':1000},parent);
const cover=$('[data-opening-cover]'),records=[];let raf=0,start=0,running=false,coverReady=false,timelineRaf=0;
const DURATION=6200;
// Bounding boxes keep a completed letter from revealing a neighbouring ornament.
const glyphs=[
 [210,450,[611,172,89,98],'M 689 255 C 661 248 623 240 628 220 C 632 205 651 209 654 215 C 651 190 675 180 686 193 C 701 208 687 235 689 255',23],
 [440,780,[694,234,110,105],'M 710 268 C 711 312 716 337 739 316 L 755 275 C 763 317 782 327 794 305 L 795 246',37],
 [740,990,[794,211,115,103],'M 806 278 C 840 285 888 244 863 229 C 838 212 817 250 831 276 C 849 308 883 293 903 276',35],
 [960,1210,[885,150,105,162],'M 914 254 C 957 216 958 175 934 180 C 907 186 905 258 924 285 C 939 302 960 285 974 273',35],
 [1180,1390,[967,201,76,101],'M 1014 227 C 988 211 968 243 978 270 C 988 297 1017 284 1035 268',34],
 [1360,1580,[1027,197,81,101],'M 1056 231 C 1034 224 1029 258 1045 274 C 1070 296 1104 245 1080 223 C 1054 201 1038 222 1056 231',34],
 [1530,1840,[1095,198,135,94],'M 1110 269 L 1128 223 C 1142 210 1142 234 1135 267 L 1161 224 C 1179 209 1184 234 1175 269 L 1200 223 C 1219 210 1207 249 1210 264 Q 1221 281 1230 268',33],
 [1800,2020,[1218,202,100,98],'M 1243 259 C 1280 254 1292 235 1268 223 C 1244 211 1225 260 1251 281 C 1272 298 1302 280 1311 270',33],
 [1990,2220,[1310,151,128,159],'M 1336 289 C 1320 279 1355 193 1374 177 C 1387 170 1367 219 1356 250 C 1340 293 1355 301 1394 277 M 1326 199 L 1395 210',29],
 [2180,2410,[1386,226,107,84],'M 1417 252 C 1396 239 1386 262 1400 279 C 1421 301 1450 262 1434 248 C 1413 228 1403 252 1416 265 C 1430 283 1467 284 1484 265',32],
 [2440,2710,[808,329,121,83],'M 828 389 L 829 354 Q 845 336 848 359 L 847 387 L 871 354 Q 888 339 884 363 L 879 389 L 905 355 Q 926 339 918 366 L 916 389',32],
 [2650,2910,[928,317,126,147],'M 950 349 C 936 377 943 405 967 378 L 993 347 C 981 410 970 467 949 448 C 929 429 988 395 1037 369',33],
 [2860,3100,[1055,306,115,110],'M 1088 392 L 1100 339 C 1105 318 1087 320 1086 333 C 1085 346 1117 357 1135 353 C 1152 348 1146 372 1137 392 L 1160 365',32],
 [3040,3240,[1150,330,83,84],'M 1177 351 C 1159 342 1154 377 1174 390 C 1195 405 1228 368 1209 352 C 1189 335 1172 352 1186 366 C 1200 377 1217 373 1228 364',32],
 [3210,3420,[1222,325,86,91],'M 1248 346 C 1229 345 1224 375 1245 390 C 1267 407 1300 369 1283 349 C 1265 329 1242 345 1258 360 C 1272 375 1291 370 1305 362',32],
 [3370,3630,[1295,321,117,97],'M 1310 386 L 1321 348 Q 1338 332 1334 359 L 1329 388 L 1353 350 Q 1370 335 1365 359 L 1360 390 L 1386 351 Q 1404 335 1395 373 L 1398 400',32],
 [3590,3900,[1391,302,207,137],'M 1400 400 C 1459 450 1503 405 1550 369 C 1589 345 1551 319 1534 340 C 1526 349 1514 366 1516 372 C 1514 350 1515 322 1504 322 C 1481 321 1493 358 1516 378',28]
];
function addMask(defs,id){return create('mask',{id,maskUnits:'userSpaceOnUse',x:0,y:0,width:1672,height:941},defs)}
function clipBox(defs,id,b){const c=create('clipPath',{id},defs);if(typeof b==='string')create('path',{d:b},c);else create('rect',{x:b[0],y:b[1],width:b[2],height:b[3]},c)}
let ink=[],actors=[],lines=[],decor=[],coverSvg,layers,finishTimeout=0;
function buildCover(){
 if(!cover)return;coverSvg=$('svg',cover);const defs=$('defs',coverSvg);const pigment=create('filter',{id:'opening-pigment','color-interpolation-filters':'sRGB'},defs);create('feColorMatrix',{type:'matrix',values:'1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  8 -8 0 0 -0.35'},pigment);layers=$('[data-opening-layers]',coverSvg);
 glyphs.forEach(([a,b,box,d,width],i)=>{const id='opening-letter-'+i;clipBox(defs,id+'-box',i===11?'M928 317 H1055 V393 L1010 430 L1007 464 H928Z':box);const m=addMask(defs,id);const p=svgPath(m,d,width);const full=create('rect',{x:box[0],y:box[1],width:box[2],height:box[3],fill:'white',opacity:0},m);const g=create('g',{'clip-path':`url(#${id}-box)`},layers);source(g,'assets/room.avif',1672,941,id).setAttribute('filter','url(#opening-pigment)');ink.push({p,full,a,b});});
 const completeMask=addMask(defs,'opening-title-complete');create('rect',{x:611,y:150,width:84,height:125,fill:'white'},completeMask);create('rect',{x:695,y:150,width:896,height:190,fill:'white'},completeMask);create('path',{d:'M805 305 H1595 V439 H1110 V418 H1025 L1007 470 H930 V418 H805Z',fill:'white'},completeMask);const completeTitle=source(layers,'assets/room.avif',1672,941,'opening-title-complete');completeTitle.setAttribute('filter','url(#opening-pigment)');completeTitle.dataset.titleComplete='';completeTitle.setAttribute('opacity','0');
 const traces=[
  [3910,4610,'M 307 441 C 316 397 366 367 391 387 C 419 416 367 433 366 402 C 364 367 418 339 456 326 C 544 284 615 349 686 406 C 755 465 859 429 942 414',60],
  [4500,5230,'M 1002 451 C 1012 476 1021 484 991 493 C 960 503 974 529 995 509 C 1023 487 1033 488 1068 466 C 1093 443 1044 425 1047 457 C 1041 484 1087 491 1095 466 C 1083 441 1073 450 1067 463 C 1034 481 1024 488 1026 533 L 1027 594 C 1022 642 1063 645 1116 650 C 1176 659 1083 682 1095 718 C 1109 754 1156 725 1192 710 C 1237 697 1243 744 1212 742 C 1188 739 1207 706 1236 707 C 1308 704 1340 764 1405 779 C 1450 793 1482 766 1497 776',56]
 ];
 traces.forEach(([a,b,d,width],i)=>{const m=addMask(defs,'opening-line-'+i),p=svgPath(m,d,width);source(layers,'assets/room.avif',1672,941,'opening-line-'+i).setAttribute('filter','url(#opening-pigment)');lines.push({p,a,b});});
 const decorations=[
  [3910,4240,[282,382,45,38]],[3740,4120,[615,265,55,55]],[3740,4120,[732,352,57,57]],[3840,4220,[685,445,47,53]],[3840,4220,[734,449,51,51]],[3740,4120,[1488,196,95,67]],[3840,4260,[1497,405,85,55]],[3920,4320,[1321,441,166,91]]
 ];
 decorations.forEach(([a,b,box],i)=>{clipBox(defs,'opening-decoration-'+i,box);const g=create('g',{'clip-path':`url(#opening-decoration-${i})`,opacity:0},layers);source(g,'assets/room.avif',1672,941).setAttribute('filter','url(#opening-pigment)');decor.push({g,a,b});});
 // The six existing figures retain their original silhouettes and their own props.
 const parts=[
  [4620,5080,1372,709,'M1298 540 L1438 540 L1440 721 L1292 723Z'],
  [4810,5270,1556,722,'M1442 552 L1672 552 L1672 739 L1442 736Z'],
  [5000,5460,1323,837,'M1239 733 L1399 733 L1398 811 L1353 841 L1240 842Z'],
  [5170,5630,1405,910,'M1354 806 L1452 798 L1487 825 L1503 914 L1306 921 L1309 845Z'],
  [5350,5810,1551,931,'M1495 827 L1590 834 L1610 941 L1475 941 L1480 868Z'],
  [5480,5940,1632,867,'M1585 795 L1672 795 L1672 882 L1594 877Z'],
  [5520,6000,1548,817,'M1488 741 L1609 730 L1649 781 L1641 830 L1605 843 L1486 826Z']
 ];
 parts.forEach(([a,b,x,y,d],i)=>{const m=addMask(defs,'opening-actor-'+i);create('path',{d,fill:'white',filter:'url(#opening-feather)'},m);const g=create('g',{class:'opening-actor',opacity:0},layers);source(g,'assets/room.avif',1672,941,'opening-actor-'+i);actors.push({g,a,b,x,y});});
 coverReady=true;
}
function renderCover(t){
 if(!coverReady)return;$('[data-title-complete]',cover).setAttribute('opacity',t>=3900?'1':'0');cover.dataset.elapsed=Math.round(t);cover.dataset.phase=t<3910?'writing':t<4620?'unwinding':t<6000?'figures':'complete';
 ink.forEach(({p,full,a,b})=>{const u=range(t,a,b);p.setAttribute('stroke-dashoffset',1000*(1-u));p.setAttribute('opacity',u>0?'1':'0');full.setAttribute('opacity',u>=1?'1':'0');});
 lines.forEach(({p,a,b})=>{const u=range(t,a,b);p.setAttribute('stroke-dashoffset',1000*(1-u));p.setAttribute('opacity',u>0?'1':'0');});
 decor.forEach(({g,a,b})=>g.setAttribute('opacity',ease(range(t,a,b))));
 actors.forEach(({g,a,b,x,y})=>{const u=range(t,a,b),v=ease(u);const dy=(1-v)*16-Math.sin(u*Math.PI)*3,sc=.94+.06*v;g.setAttribute('opacity',range(t,a,a+180));g.setAttribute('transform',`translate(${x} ${y+dy}) scale(${sc}) translate(${-x} ${-y})`);});
}
function seen(){try{sessionStorage.setItem('portfolio-opening-v4-seen','1')}catch{}}
function finish(){running=false;cancelAnimationFrame(raf);clearTimeout(finishTimeout);if(cover){renderCover(DURATION);cover.classList.remove('is-playing');cover.classList.add('is-complete');cover.dataset.state='complete';cover.closest('.page-art').classList.remove('opening-is-playing');}document.documentElement.classList.remove('opening-pending');seen();}
function tick(now){if(!running)return;const t=now-start;renderCover(t);if(t>=DURATION)finish();else raf=requestAnimationFrame(tick);}
async function play(){
 if(!cover||!allowed()){finish();return;}
 const loaded=await Promise.all(['assets/room.avif','assets/opening-v4/cover-plate.avif'].map(src=>{const im=new Image();im.src=asset(src);return im.decode().then(()=>true,()=>false)}));
 if(!loaded.every(Boolean)||!allowed()||scrollY>80){finish();return;}
 cancelAnimationFrame(raf);clearTimeout(finishTimeout);cover.classList.remove('is-complete');cover.classList.add('is-playing');cover.closest('.page-art').classList.add('opening-is-playing');cover.dataset.state='playing';document.documentElement.classList.remove('opening-pending');renderCover(0);running=true;start=performance.now();finishTimeout=setTimeout(finish,DURATION+1500);raf=requestAnimationFrame(tick);
}
function replay(){if(!cover)return;scrollTo({top:0,behavior:'instant'});play();}
if(cover){
 buildCover();const button=document.createElement('button');button.type='button';button.className='tool';button.id='opening-replay';button.textContent='重播开场';button.disabled=!allowed();button.addEventListener('click',replay);$('.reader-tools')?.append(button);
 $('[data-opening-skip]')?.addEventListener('click',finish);
 let prior=false;try{prior=!!sessionStorage.getItem('portfolio-opening-v4-seen')}catch{}
 if(allowed()&&(!prior||new URLSearchParams(location.search).get('opening')==='replay')&&!location.hash&&scrollY<80)play();else finish();
}
const threadSpecs={
 education:{src:'assets/pages/p02.avif',plate:'assets/opening-v4/education-plate.avif',d:'M111 -18 C95 17 87 59 102 94 C113 122 143 137 154 154 L157 605 C156 653 113 671 127 708 C133 730 156 741 156 764 L158 1126',nodes:[[155,150,.12,43],[155,282,.25,43],[155,495,.44,43],[150,742,.65,44],[155,934,.83,43]]},
 work:{src:'assets/pages/p03.avif',plate:'assets/opening-v4/work-plate.avif',d:'M474 -15 C432 43 350 65 350 129 C348 167 385 184 409 200 C397 241 405 280 447 302 C503 334 628 298 681 327 C703 339 706 362 706 394 L715 865',nodes:[[409,201,.23,53],[698,345,.49,54],[710,540,.67,50],[713,743,.85,51]]}
};
function buildThread(host,index){
 const kind=host.dataset.originalThread,spec=threadSpecs[kind];if(!spec)return;
 const prefix='native-'+kind+'-'+index,svg=create('svg',{class:'opening-art',viewBox:'0 0 2000 1126',preserveAspectRatio:'none'},host),defs=create('defs',{},svg);
 const filter=create('filter',{id:prefix+'-feather',x:'-20%',y:'-20%',width:'140%',height:'140%'},defs);create('feGaussianBlur',{stdDeviation:3},filter);
 const plateMask=create('mask',{id:prefix+'-plate',maskUnits:'userSpaceOnUse',x:0,y:0,width:2000,height:1126},defs);
 create('path',{d:spec.d,fill:'none',stroke:'white','stroke-width':40,'stroke-linecap':'round',filter:`url(#${prefix}-feather)`},plateMask);
 spec.nodes.forEach(([x,y,,r])=>create('circle',{cx:x,cy:y,r,fill:'white',filter:`url(#${prefix}-feather)`},plateMask));
 source(svg,spec.plate,2000,1126,prefix+'-plate');
 const reveal=create('mask',{id:prefix+'-reveal',maskUnits:'userSpaceOnUse',x:0,y:0,width:2000,height:1126},defs),p=svgPath(reveal,spec.d,40);
 const circles=spec.nodes.map(([x,y,at,r])=>({el:create('circle',{cx:x,cy:y,r,fill:'white',opacity:0},reveal),at}));
 source(svg,spec.src,2000,1126,prefix+'-reveal');
 records.push({host,figure:host.closest('.art-page'),p,circles,progress:0,target:0,ready:false});
 const record=records.at(-1);const im=new Image();im.src=asset(spec.plate);im.decode().then(()=>{record.ready=true;if(allowed())host.classList.add('is-thread-playing');scheduleTimeline()},()=>{record.ready=false});
}
function updateTimelines(){
 timelineRaf=0;let moving=false;records.forEach(r=>{if(!r.ready)return;const rect=r.figure.getBoundingClientRect();if(r.host.dataset.handoffReady==='1')r.received=true;const waiting=r.host.dataset.handoffReady==='0'&&!r.received;if(waiting&&allowed()){r.target=0;r.progress=0;r.host.classList.add('is-thread-playing');}const goal=allowed()?(waiting?0:clamp((innerHeight*.88-rect.top)/Math.max(1,rect.height*.95))):1;r.target=Math.max(r.target,goal);r.progress+=Math.min(1,.2)*(r.target-r.progress);if(r.target-r.progress<.001)r.progress=r.target;else moving=true;r.p.setAttribute('stroke-dashoffset',1000*(1-r.progress));r.circles.forEach(({el,at})=>{const t=clamp((r.progress-at+.035)/.07);el.setAttribute('opacity',ease(t));});r.host.dataset.progress=r.progress.toFixed(3);if(r.progress>=.999||!allowed())r.host.classList.remove('is-thread-playing');});if(moving)timelineRaf=requestAnimationFrame(updateTimelines);
}
function scheduleTimeline(){if(!timelineRaf)timelineRaf=requestAnimationFrame(updateTimelines);}
$$('[data-original-thread]').forEach(buildThread);
addEventListener('scroll',()=>{if(running&&scrollY>80)finish();scheduleTimeline()},{passive:true});addEventListener('resize',scheduleTimeline);addEventListener('portfolio:thread-ready',scheduleTimeline);
addEventListener('portfolio:motion',()=>{if(!allowed())finish();const replayButton=$('#opening-replay');if(replayButton)replayButton.disabled=!allowed();scheduleTimeline()});
addEventListener('pageshow',ev=>{if(ev.persisted)finish();scheduleTimeline()});
addEventListener('visibilitychange',()=>{if(document.hidden&&running)finish()});
window.portfolioOpening={replay,finish,seek(ms){if(!coverReady)return;cancelAnimationFrame(raf);clearTimeout(finishTimeout);running=false;cover.classList.add('is-playing');cover.classList.remove('is-complete');cover.dataset.state='preview';renderCover(Math.min(DURATION,Math.max(0,ms)));},get state(){return cover?.dataset.state||'absent'}};
})();
