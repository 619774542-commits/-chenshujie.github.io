/* One material thread from the room to every project. No wheel capture or virtual page routing. */
(() => {
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const script=[...document.scripts].find(s=>s.src.includes('/yarn.js'));
if(!script)return;
const root=new URL('.',script.src), data=JSON.parse($('#journey-data')?.textContent||'{}');
const HANDOFF='portfolio-yarn-handoff-v3', RETURN='portfolio-yarn-return-v3', SEEN='portfolio-yarn-seen-v3';
const ids=['luyi','jd','scifi','eastlake','ai','jinghu'];
const read=(key)=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}};
const write=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value))}catch{}};
const remove=key=>{try{sessionStorage.removeItem(key)}catch{}};
const enabled=()=>!document.body.classList.contains('motion-off');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=t=>1-Math.pow(1-clamp(t,0,1),3);
let stages=[],hovered=null,frame=0,dirty=true,geometryTimer=0,navBusy=false;
let W=innerWidth,H=innerHeight,dpr=Math.min(devicePixelRatio||1,1.5);
const canvas=document.createElement('canvas');canvas.className='yarn-canvas';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
const ctx=canvas.getContext('2d',{alpha:true});
const material=new Image();material.src=new URL('assets/yarn-v3/cord-material.avif',root).href;
material.addEventListener('load',()=>schedule());
const offscreenPath=document.createElementNS('http://www.w3.org/2000/svg','path');
const ball=$('.yarn-link'),ballHost=ball?.closest('.page-art');
let ballBase=null,bx=0,by=0,bvx=0,bvy=0,btx=0,bty=0,ballTurn=0,lastTime=0;
let initialHome=data.kind==='home'&&!read(SEEN)&&!location.hash;
if(data.kind==='home')write(SEEN,true);
const started=performance.now();let introSkipped=false;
function docRect(el){const r=el.getBoundingClientRect();return {x:r.left,y:r.top+scrollY,w:r.width,h:r.height,bottom:r.bottom+scrollY};}
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
function rounded(points,radius=22){
 if(points.length<2)return '';
 let d=`M ${points[0][0]} ${points[0][1]}`;
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],la=Math.hypot(b[0]-a[0],b[1]-a[1]),lb=Math.hypot(c[0]-b[0],c[1]-b[1]);
  if(la<.1||lb<.1)continue;
  const r=Math.min(radius,la*.3,lb*.3),p=[b[0]+(a[0]-b[0])*r/la,b[1]+(a[1]-b[1])*r/la],q=[b[0]+(c[0]-b[0])*r/lb,b[1]+(c[1]-b[1])*r/lb];
  d+=` L ${p[0]} ${p[1]} Q ${b[0]} ${b[1]} ${q[0]} ${q[1]}`;
 }
 const end=points.at(-1);return d+` L ${end[0]} ${end[1]}`;
}
function samples(d){
 offscreenPath.setAttribute('d',d);const length=offscreenPath.getTotalLength(),points=[];
 for(let l=0;l<length;l+=7){const p=offscreenPath.getPointAtLength(l);points.push({x:p.x,y:p.y,l});}
 const end=offscreenPath.getPointAtLength(length);points.push({x:end.x,y:end.y,l:length});return {points,length};
}
function addStage(kind,el,d,extra={}){
 const box=docRect(el),sample=samples(d),prior=stages.at(-1);
 if(prior){const from=prior.points.at(-1),to=sample.points[0],middle=(from.y+to.y)/2;const join=samples(`M ${from.x} ${from.y} C ${from.x} ${middle+26} ${to.x} ${middle-26} ${to.x} ${to.y}`);stages.push({kind:'join',start:Math.min(from.y,to.y),end:Math.max(from.y,to.y)+1,...join,progress:1,width:4});}
 const old=extra.old?.get(el);const stage={kind,el,start:box.y,end:box.bottom,...sample,progress:old??0,width:kind==='cover'||kind==='works'?4.5:3.3,...extra};delete stage.old;stages.push(stage);return stage;
}
function buildGeometry(){
 if (data.kind === 'project') return;
 const old=new Map(stages.filter(s=>s.el).map(s=>[s.el,s.progress]));stages=[];resize();
 const figures=$$('figure.art-page');
 const originalOpening=!!document.querySelector('[data-opening-cover],[data-original-thread]');
 if(ball&&ballHost){const r=docRect(ballHost),size=ball.offsetWidth;ballBase={x:r.x+ball.offsetLeft+size/2,y:r.y+ball.offsetTop+size/2,size};}
 figures.forEach((el,i)=>{
  const r=docRect(el);
  if(originalOpening&&['home','about'].includes(data.kind))return;
  if(data.kind==='home'&&i===0){const b=ballBase||{x:r.x+r.w*.9275,y:r.y+r.h*.845,size:r.w*.085};const start=[b.x+b.size*.34,b.y+b.size*.015];addStage('cover',el,rounded([start,[r.x+r.w*.985,r.y+r.h*.855],[r.x+r.w*.997,r.y+r.h*.91],[r.x+r.w*.997,r.bottom+9]],35),{old});}
  else if((data.kind==='home'&&i===2)||(data.kind==='about'&&i===1)){
   const pts=[[.055,-.012],[.045,.055],[.077,.13],[.077,.4],[.073,.55],[.061,.61],[.077,.66],[.077,1.012]].map(([x,y])=>[r.x+r.w*x,r.y+r.h*y]);
   const holes=[.133,.25,.44,.664,.829].map(y=>({x:r.x+r.w*.077,y:r.y+r.h*y,r:r.w*.017}));addStage('education',el,rounded(pts,22),{old,width:4.1,holes});
  }else {const x=r.x+r.w*.984;addStage('intro',el,rounded([[x,r.y-9],[x-3,r.y+r.h*.3],[x+2,r.y+r.h*.67],[x,r.bottom+9]],20),{old,width:4.2});}
 });
 const room=$('.works-room');
 if(room&&!room.hasAttribute('data-arc-catalog')){
  const r=docRect(room),mobile=W<=760,anchors=new Map(),rows=[];
  for(const card of $$('.project-card',room)){const b=docRect($('.wool-frame',card));let row=rows.find(row=>Math.abs(row.y-b.y)<35);if(!row){row={y:b.y,cards:[]};rows.push(row)}row.cards.push({card,b});}
  rows.sort((a,b)=>a.y-b.y);const order=[];rows.forEach((row,i)=>{row.cards.sort((a,b)=>a.b.x-b.b.x);order.push(...(i%2?row.cards.reverse():row.cards));});
  const start={x:r.x+r.w*(mobile?.075:.435),y:r.y+r.h*(mobile?.095:.295)};
  let d=`M ${start.x} ${start.y}`,prior=start;
  for(let i=0;i<order.length;i++){
   const {card,b}=order[i],point={x:b.x+b.w*.135,y:b.y+b.h*.14};
   anchors.set(card.dataset.yarnProject,[point.x,point.y]);
   if(i===0){d+=` C ${prior.x+28} ${prior.y+5} ${point.x-32} ${point.y-22} ${point.x} ${point.y}`;}
   else if(Math.abs(order[i-1].b.y-b.y)<35){const dx=point.x-prior.x,arch=Math.min(48,Math.abs(dx)*.15);d+=` C ${prior.x+dx*.33} ${prior.y-arch} ${point.x-dx*.33} ${point.y-arch} ${point.x} ${point.y}`;}
   else {const dy=point.y-prior.y,bow=mobile?30:35;d+=` C ${prior.x-bow} ${prior.y+dy*.32} ${point.x-bow} ${point.y-dy*.32} ${point.x} ${point.y}`;}
   prior=point;
  }
  d+=` C ${prior.x-40} ${prior.y+60} ${prior.x-35} ${r.bottom-18} ${prior.x} ${r.bottom+8}`;
  const stage=addStage('works',room,d,{old,anchors,anchorLengths:new Map()});
  for(const [id,p] of anchors){let best=Infinity,at=0;for(const q of stage.points){const distance=Math.hypot(q.x-p[0],q.y-p[1]);if(distance<best){best=distance;at=q.l}}stage.anchorLengths.set(id,at);}
 }
 const end=$('.journey-outro')||$('.journey-contact-end');
 if(end&&!(room?.hasAttribute('data-arc-catalog')&&['home','works'].includes(data.kind))){const r=docRect(end),last=stages.at(-1)?.points.at(-1),start=last?[last.x,last.y]:[r.x+r.w*.025,r.y];const x=r.x+r.w*.5,y=r.y+r.h*.45,R=Math.min(18,r.w*.022);const base=rounded([start,[start[0],y],[x-R*2.1,y],[x-R,y]],20);const knot=` C ${x+R*1.7} ${y-R*2.2} ${x+R*1.9} ${y+R*1.4} ${x} ${y+R*.7} C ${x-R*1.8} ${y} ${x-R*.8} ${y-R*1.6} ${x+R} ${y+R*.5} L ${x+R*2} ${y+R*1.1}`;addStage('end',end,base+knot,{old,width:4.6});}
 dirty=true;schedule();
}
function requestGeometry(){clearTimeout(geometryTimer);geometryTimer=setTimeout(buildGeometry,80);}
function clipHoles(context,holes,sy){if(!holes?.length)return;context.beginPath();context.rect(0,0,W,H);for(const hole of holes){context.moveTo(hole.x+hole.r,hole.y-sy);context.arc(hole.x,hole.y-sy,hole.r,0,Math.PI*2);}context.clip('evenodd');}
function rope(context,points,limit,width,sy=scrollY,opacity=1,holes=null){
 if(limit<.4||points.length<2)return;
 context.save();context.globalAlpha=opacity*.82;clipHoles(context,holes,sy);context.beginPath();let last=points[0];context.moveTo(last.x,last.y-sy);const visiblePoints=[last];
 for(let i=1;i<points.length;i++){
  const p=points[i];if(p.l>limit){const t=(limit-last.l)/(p.l-last.l),q={x:last.x+(p.x-last.x)*t,y:last.y+(p.y-last.y)*t,l:limit};context.lineTo(q.x,q.y-sy);visiblePoints.push(q);break}
  context.lineTo(p.x,p.y-sy);visiblePoints.push(p);last=p;
 }
 context.lineWidth=width+1;context.lineCap='round';context.lineJoin='round';context.strokeStyle='#d1847b';context.shadowColor='#67433322';context.shadowBlur=2;context.shadowOffsetY=1.5;context.stroke();context.shadowColor='transparent';
 if(material.complete&&material.naturalWidth){
  for(let i=1;i<visiblePoints.length;i++){const a=visiblePoints[i-1],b=visiblePoints[i],middleY=(a.y+b.y)/2-sy;if(middleY<-20||middleY>H+20)continue;const len=Math.hypot(b.x-a.x,b.y-a.y);if(len<.1)continue;context.save();context.translate((a.x+b.x)/2,middleY);context.rotate(Math.atan2(b.y-a.y,b.x-a.x));const scale=(width+1.8)/material.naturalHeight,sw=Math.min(material.naturalWidth,(len+1.6)/scale),sx=(a.l/scale)%Math.max(1,material.naturalWidth-sw);context.drawImage(material,sx,0,sw,material.naturalHeight,-len/2-.8,-(width+1.8)/2,len+1.6,width+1.8);context.restore();}
 }else{context.lineWidth=width*.48;context.strokeStyle='#ed9d8f';context.stroke();}
 context.restore();
}
function goal(stage,now){
 if(stage.kind==='cover'){if(!enabled()||!initialHome||introSkipped)return 1;return ease((now-started-200)/2500);}
 const line=scrollY+H*.76;
 if(stage.kind==='works'&&hovered&&stage.anchorLengths.has(hovered))return stage.anchorLengths.get(hovered)/stage.length;
 if(stage.kind==='works'&&stage.end<scrollY+H-60&&stage.start>=scrollY-60)return 1;
 if(stage.kind==='join')return clamp((line-stage.start)/(stage.end-stage.start),0,1);
 return clamp((line-stage.start)/Math.max(1,stage.end-stage.start),0,1);
}
function paint(now){
 frame=0;if(document.hidden)return;let moving=false;
 const dt=lastTime?Math.min(2,(now-lastTime)/16.67):1;lastTime=now;
 if(ball&&ballBase){
  const t=initialHome&&!introSkipped?clamp((now-started)/2800,0,1):1,roll=enabled()?Math.sin(Math.PI*t)*16:0;
  const tx=enabled()?btx+roll:0,ty=enabled()?bty-Math.sin(Math.PI*t)*4:0;
  bvx=(bvx+(tx-bx)*.047*dt)*Math.pow(.76,dt);bvy=(bvy+(ty-by)*.047*dt)*Math.pow(.76,dt);bx+=bvx*dt;by+=bvy*dt;ballTurn+=bvx*.34;
  if(!enabled())bx=by=bvx=bvy=0;
  ball.style.setProperty('--ball-x',bx.toFixed(2)+'px');ball.style.setProperty('--ball-y',by.toFixed(2)+'px');ball.style.setProperty('--ball-turn',ballTurn.toFixed(1)+'deg');
  moving=Math.abs(tx-bx)+Math.abs(ty-by)+Math.abs(bvx)+Math.abs(bvy)>.08||(t<1&&enabled());
 }
 ctx.clearRect(0,0,W,H);
 for(const stage of stages){const target=goal(stage,now);if(!enabled())stage.progress=target;else{stage.progress+=(target-stage.progress)*Math.min(1,.2*dt);if(Math.abs(target-stage.progress)<.0006)stage.progress=target;else moving=true;}
  if(stage.points[0].y>scrollY+H+80&&stage.kind!=='works')continue;
  const opacity=stage.kind==='join'?.85:1;
  rope(ctx,stage.points,stage.length*stage.progress,Math.min(stage.width,Math.max(2.7,W/320)),scrollY,opacity,stage.holes);
 }
 if(ball&&ballBase&&enabled()&&ballBase.y-scrollY<H+80){const from=[ballBase.x+ballBase.size*.34+bx,ballBase.y+ballBase.size*.015+by],to=[ballBase.x+ballBase.size*.34,ballBase.y+ballBase.size*.015];const tether=samples(rounded([from,[from[0]+8,(from[1]+to[1])/2],to],12));rope(ctx,tether.points,tether.length,Math.min(5.6,W/250),scrollY);}
 dirty=false;canvas.dataset.state=enabled()?'active':'still';
 if(moving&&enabled())schedule();
}
function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
if(ballHost){ballHost.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||!enabled()||!ballBase)return;btx=clamp((event.clientX-ballBase.x)*.045,-24,24);bty=clamp((event.clientY-(ballBase.y-scrollY))*.04,-15,15);schedule();});ballHost.addEventListener('pointerleave',()=>{btx=bty=0;schedule();});}
function skipIntro(){introSkipped=true;schedule();}
addEventListener('scroll',()=>{if(scrollY>24)introSkipped=true;schedule();},{passive:true});addEventListener('resize',requestGeometry);addEventListener('orientationchange',requestGeometry);addEventListener('load',requestGeometry);addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});addEventListener('portfolio:motion',()=>{btx=bty=0;skipIntro();schedule();});
$$('.project-card').forEach(card=>{const select=()=>{hovered=card.dataset.yarnProject;prefetchProject(hovered);card.classList.add('is-thread-selected');schedule();};const clear=()=>{if(hovered===card.dataset.yarnProject)hovered=null;card.classList.remove('is-thread-selected');schedule();};card.addEventListener('pointerenter',select);card.addEventListener('focus',select);card.addEventListener('pointerleave',clear);card.addEventListener('blur',clear);});
// Session-only continuity contains project IDs and positions, never personal data.
function validLocal(value){try{const u=new URL(value,root);return u.origin===root.origin&&u.pathname.startsWith(root.pathname)?u:null}catch{return null}}
function kindOf(url){const relative=url.pathname.slice(root.pathname.length);if(/^projects\/(luyi|jd|scifi|eastlake|ai|jinghu)\.html$/.test(relative))return 'project';if(relative==='works.html')return 'works';if(relative==='contact.html')return 'contact';if(relative==='about.html')return 'about';if(['','index.html','开始浏览.html'].includes(decodeURIComponent(relative)))return 'home';return null;}
function heroURL(project){const h=data.heroes?.[project];return h?new URL(h.preview||h.src,root).href:null;}
const prefetched=new Set();
function prefetchProject(id){if(prefetched.has(id)||!ids.includes(id))return;prefetched.add(id);const link=document.createElement('link');link.rel='prefetch';link.href=new URL('projects/'+id+'.html',root).href;if(root.protocol!=='file:')document.head.append(link);const src=data.heroes?.[id]?.pageSrc;if(src){const im=new Image();im.fetchPriority='low';im.src=new URL(src,root).href;}}
function restoreFrame(scroll=false){
 const saved=read(RETURN);if(!saved||!ids.includes(saved.project))return;
 const card=$('#project-'+saved.project);if(!card)return;
 if(!card.closest('[data-arc-catalog]')){card.classList.add('is-returned');setTimeout(()=>card.classList.remove('is-returned'),900);}
 if(scroll&&Number.isFinite(saved.scrollY)){window.scrollTo({top:saved.scrollY,left:0,behavior:'instant'});if(saved.keyboard)card.focus({preventScroll:true});}
}
if(data.kind==='home')$$('a[href]').forEach(a=>{const u=validLocal(a.href);if(!u)return;if(kindOf(u)==='works')a.setAttribute('href','#works');else if(kindOf(u)==='home'&&u.hash==='#resume')a.setAttribute('href','#resume');});
const savedReturn=read(RETURN);
if(data.kind==='project'&&savedReturn){const u=validLocal(savedReturn.url);if(u&&['home','works'].includes(kindOf(u)))$$('[data-journey-return]').forEach(a=>a.href=u.href);}
addEventListener('pageshow',event=>{requestGeometry();if(event.persisted){navBusy=false;document.body.classList.remove('yarn-navigating');document.documentElement.classList.remove('yarn-arriving');restoreFrame(false);}});
function centerRect(){const width=W*(W<760?.84:.64),height=Math.min(H*.64,width*.64);return {x:(W-width)/2,y:(H-height)/2,w:width,h:height};}
function position(el,r){Object.assign(el.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px'});}
function visualLayer(src,rect){
 const veil=document.createElement('div');veil.className='journey-veil';veil.setAttribute('aria-hidden','true');const c=document.createElement('canvas');c.className='journey-transition-thread';c.setAttribute('aria-hidden','true');c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);document.body.append(veil,c);const cctx=c.getContext('2d');cctx.setTransform(dpr,0,0,dpr,0,0);
 let hero=null;if(src){hero=document.createElement('img');hero.className='journey-hero';hero.alt='';hero.src=src;position(hero,rect||centerRect());document.body.append(hero);}
 return {veil,cctx,hero,dispose(){veil.remove();c.remove();hero?.remove()}};
}
function transitPath(project,from,to){
 const cx=W*.5,cy=H*.5,R=Math.min(W,H)*.12;
 const begin=`M ${from.x} ${from.y} C ${from.x} ${cy} ${cx-R*1.4} ${cy+R} ${cx-R} ${cy}`;
 let motif;
 if(project==='scifi')motif=` C ${cx-R} ${cy-R*1.5} ${cx+R} ${cy-R*1.5} ${cx+R} ${cy} C ${cx+R} ${cy+R*1.5} ${cx-R} ${cy+R*1.5} ${cx-R} ${cy}`;
 else if(project==='jd')motif=` Q ${cx-R} ${cy-R} ${cx} ${cy-R} L ${cx+R} ${cy-R} Q ${cx+R*1.2} ${cy-R} ${cx+R*1.2} ${cy} L ${cx+R*1.2} ${cy+R*.65} Q ${cx+R*1.2} ${cy+R} ${cx+R*.45} ${cy+R} L ${cx-R*.25} ${cy+R}`;
 else if(project==='eastlake')motif=` C ${cx-R*.7} ${cy-R} ${cx+R*.25} ${cy+R} ${cx+R*.5} ${cy} S ${cx+R*1.2} ${cy-R} ${cx+R*1.4} ${cy}`;
 else if(project==='ai')motif=` C ${cx-R} ${cy-R} ${cx+R} ${cy-R} ${cx+R} ${cy} C ${cx+R} ${cy+R*.45} ${cx-R*.7} ${cy+R*.45} ${cx-R*.7} ${cy+R} L ${cx+R} ${cy+R}`;
 else if(project==='jinghu')motif=` L ${cx-R} ${cy-R*.7} Q ${cx} ${cy-R*1.5} ${cx+R} ${cy-R*.7} L ${cx+R} ${cy+R*.8} Q ${cx} ${cy+R*.3} ${cx-R*.4} ${cy+R}`;
 else motif=` C ${cx-R} ${cy-R*.9} ${cx+R*.8} ${cy-R*.9} ${cx+R*.8} ${cy} C ${cx+R*.8} ${cy+R*.9} ${cx-R*.25} ${cy+R*.9} ${cx-R*.25} ${cy} L ${cx-R*.25} ${cy-R*1.1}`;
 return samples(begin+motif+` C ${to.x} ${cy} ${to.x} ${to.y-R*.3} ${to.x} ${to.y}`);
}
function lineTween(layer,route,duration,reverse=false){return new Promise(resolve=>{const t0=performance.now();function tick(now){const t=clamp((now-t0)/duration,0,1);layer.cctx.clearRect(0,0,W,H);rope(layer.cctx,route.points,route.length*(reverse?1-ease(t):ease(t)),Math.max(4.2,Math.min(6,W/210)),0,.96);if(t<1&&enabled())requestAnimationFrame(tick);else resolve()}requestAnimationFrame(tick)});}
function animate(el,frames,options){if(!el?.animate)return Promise.resolve();return el.animate(frames,options).finished.catch(()=>{});}
async function depart(anchor,url,project,isReturn,keyboard=false){
 navBusy=true;document.body.classList.add('yarn-navigating');skipIntro();
 const card=anchor.closest('.project-card'),image=card?$('.project-hero',card):null,source=image?.getBoundingClientRect(),center=centerRect();
 if(card){write(RETURN,{project,url:location.href,scrollY,frame:'project-'+project,keyboard,time:Date.now()});}
 let origin=source?{x:source.x,y:source.y,w:source.width,h:source.height}:{x:W*.5,y:H*.5,w:0,h:0};
 const src=project?heroURL(project):null;const layer=visualLayer(src,origin.w?origin:center);
 const record={project,src,returning:isReturn,toPath:url.pathname,time:Date.now(),center};write(HANDOFF,record);
 const from=source?{x:source.left+source.width*.05,y:source.top+source.height*.1}:{x:W*.026,y:H*.45};
 const route=transitPath(project,from,{x:center.x+center.w*.13,y:center.y+center.h*.9});
 try{
  await Promise.all([animate(layer.veil,[{opacity:0},{opacity:1}],{duration:430,fill:'forwards',easing:'ease-in-out'}),animate(layer.hero,[{left:origin.x+'px',top:origin.y+'px',width:origin.w+'px',height:origin.h+'px',opacity:origin.w?1:0},{left:center.x+'px',top:center.y+'px',width:center.w+'px',height:center.h+'px',opacity:1}],{duration:460,fill:'forwards',easing:'cubic-bezier(.2,.65,.3,1)'}),lineTween(layer,route,460,isReturn)]);
  if(!enabled()){remove(HANDOFF);}
  location.assign(url.href);
  setTimeout(()=>{layer.dispose();navBusy=false;document.body.classList.remove('yarn-navigating');},2000);
 }catch{layer.dispose();remove(HANDOFF);location.assign(url.href);}
}
function landingRect(project){
 const card=$('#project-'+project);if(card){const r=$('.project-hero',card).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}
 const first=$('.art-page .page-art'),hero=data.heroes?.[project];if(first&&hero){const r=first.getBoundingClientRect(),b=hero.rect;return {x:r.x+r.width*b[0],y:r.y+r.height*b[1],w:r.width*b[2],h:r.height*b[3]};}
 return centerRect();
}
async function arrive(){
 if(read('portfolio-arc-return-v6')&&['home','works'].includes(data.kind)){remove('portfolio-arc-return-v6');restoreFrame(true);}
 const record=read(HANDOFF);if(!record||Date.now()-record.time>15000||record.toPath!==location.pathname||!enabled()){document.documentElement.classList.remove('yarn-arriving');remove(HANDOFF);restoreFrame(false);return;}
 remove(HANDOFF);
 if(record.returning)restoreFrame(true);
 const center=centerRect(),src=ids.includes(record.project)?heroURL(record.project):null,layer=visualLayer(src,center);layer.veil.style.opacity='1';
 document.documentElement.classList.remove('yarn-arriving');
 const safety=setTimeout(()=>layer.dispose(),1400);
 const target=record.project?landingRect(record.project):center;
 const from={x:center.x+center.w*.13,y:center.y+center.h*.9},to={x:target.x+target.w*.08,y:target.y+target.h*.12};
 const route=transitPath(record.project,from,to);
 const original=$('.art-page .original-page');if(original&&!original.complete)await Promise.race([new Promise(resolve=>{original.addEventListener('load',resolve,{once:true});original.addEventListener('error',resolve,{once:true})}),new Promise(resolve=>setTimeout(resolve,350))]);
 await Promise.all([animate(layer.hero,[{left:center.x+'px',top:center.y+'px',width:center.w+'px',height:center.h+'px',opacity:1},{left:target.x+'px',top:target.y+'px',width:target.w+'px',height:target.h+'px',opacity:0}],{duration:420,fill:'forwards',easing:'cubic-bezier(.2,.65,.3,1)'}),animate(layer.veil,[{opacity:1},{opacity:0}],{duration:420,fill:'forwards',easing:'ease-out'}),lineTween(layer,route,420,true)]);
 clearTimeout(safety);layer.dispose();if(record.returning)restoreFrame(false);schedule();
}
document.addEventListener('click',event=>{
 const anchor=event.target.closest('a[href]');if(!anchor||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||anchor.hasAttribute('download')||anchor.target==='_blank'||anchor.hasAttribute('data-scene')||anchor.hasAttribute('data-node-slide'))return;
 let url=validLocal(anchor.href);if(!url)return;const next=kindOf(url);if(!next)return;
 if(url.pathname===location.pathname){skipIntro();return;}
 let isReturn=data.kind==='project'&&(next==='works'||anchor.hasAttribute('data-journey-return'));
 let project=anchor.dataset.yarnProject||(next==='project'?url.pathname.match(/\/(luyi|jd|scifi|eastlake|ai|jinghu)\.html$/)?.[1]:isReturn?data.project:null);
 if(isReturn){const saved=read(RETURN),back=saved&&validLocal(saved.url);if(back&&['home','works'].includes(kindOf(back)))url=back;}
 const arcCard=anchor.closest('[data-arc-catalog] .project-card');if(arcCard){write(RETURN,{project,url:location.href,scrollY,frame:'project-'+project,keyboard:event.detail===0,simple:true,time:Date.now()});remove(HANDOFF);return;}
 if(isReturn&&read(RETURN)?.simple){event.preventDefault();remove(HANDOFF);write('portfolio-arc-return-v6',true);location.assign(url.href);return;}
 if(!enabled()){if(anchor.closest('.project-card'))write(RETURN,{project,url:location.href,scrollY,frame:'project-'+project,time:Date.now()});if(isReturn){const saved=read(RETURN);if(saved?.project)url.hash='project-'+saved.project;event.preventDefault();location.assign(url.href)}return;}
 event.preventDefault();if(navBusy)return;depart(anchor,url,project,isReturn,event.detail===0);
});
// Restore native back/forward browsing and cancel stale visual state after aborted navigations.
addEventListener('pagehide',()=>{navBusy=false;document.body.classList.remove('yarn-navigating');$$('.journey-veil,.journey-hero,.journey-transition-thread').forEach(n=>n.remove());});
buildGeometry();arrive();
})();
