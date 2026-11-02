import {splitStaticScenery} from './scene-batching.mjs';
// Opt-in localhost performance replay. Normal play never imports this module.
export function installDiagnostics(game,{THREE,Car,CONFIG,MODES,LEVELS}){
 const params=new URLSearchParams(location.search),seconds=Number(params.get('seconds')||60),rounds=Number(params.get('rounds')||3);
 if(params.get('spatial')==='1'){const select=game.selectLevel;game.selectLevel=function(...args){const result=select.apply(this,args);splitStaticScenery(THREE,this.scenery,32);return result}}
 const manual=params.get('manual')==='1';
 const elevationCompare=!manual&&params.get('elevationCompare')==='1';
 const trackBuild=game.track.build,renderElevation=game.track.renderElevation;let variant='raised';
 if(elevationCompare){game.track.build=function(nodes,elevation){return trackBuild.call(this,nodes,variant==='flat'?null:elevation)};game.track.renderElevation=function(){if(variant!=='no-structures')return renderElevation.call(this)}}
 const results=[],queue=[];let current=null,previousFrame=null,stepIndex=0,inputs=[],started=0,stopped=false;
 const panel=document.createElement('details');panel.open=true;panel.style.cssText='position:fixed;z-index:10000;right:12px;top:12px;width:390px;background:#10251fee;color:white;padding:12px;font:12px monospace;max-height:80vh;overflow:auto';
 panel.innerHTML='<summary>驾驶性能诊断（不保存成绩）</summary><button id="perfStart">开始固定回放</button><button id="perfStop">停止</button><button id="perfExport">导出 JSON</button><pre id="perfStatus"></pre><pre id="perfResults"></pre>';document.body.append(panel);
 const status=panel.querySelector('#perfStatus'),output=panel.querySelector('#perfResults');
 if(manual)panel.querySelector('#perfStart').textContent='记录实际驾驶（含声音）';
 const info={version:params.get('label')||'working',viewport:[innerWidth,innerHeight],dpr:game.renderer.getPixelRatio(),highQuality:game.highQuality,seconds,rounds,submissionIsNotGPU:true,manual,elevationCompare,spatial:params.get('spatial')==='1'};
 function publish(){output.textContent=JSON.stringify({info,results},null,2)}
 const blank=()=>({physics:0,effects:0,hud:0,render:0,camera:0,audio:0});let costs=blank();
 function wrap(object,key,stage){const original=object[key];object[key]=function(...args){const t=performance.now();try{return original.apply(this,args)}finally{if(current)costs[stage]+=performance.now()-t}}}
 wrap(game.audio,'update','audio');
 wrap(game.car,'update','physics');wrap(game,'fxUpdate','effects');wrap(game.ui,'update','hud');wrap(game,'updateCamera','camera');
 const originalUpdate=game.car.update;
 game.car.update=function(dt,input,g){if(current){if(!manual){input=inputs[stepIndex%inputs.length];game.input=input}stepIndex++}return originalUpdate.call(this,dt,input,g)};
 // Dedicated replay never changes progress, medals, records, or workshop storage.
 if(!manual)game.progress=()=>{};game.storeBest=()=>{};game.persistWorkshop=()=>true;
 const percentile=(a,p)=>{const b=a.slice().sort((x,y)=>x-y);return b.length?b[Math.min(b.length-1,Math.floor(b.length*p))]:0};
 function finish(){if(!current)return;let times=current.frames,stages={};for(const name of Object.keys(costs))stages[name]={p50:percentile(current.costs.map(c=>c[name]),.5),p95:percentile(current.costs.map(c=>c[name]),.95)};
 results.push({level:current.level,round:current.round,phase:current.phase,variant:current.variant,buildMs:current.buildMs,frames:times.length,p50:percentile(times,.5),p95:percentile(times,.95),p99:percentile(times,.99),slowRatio:times.filter(x=>x>34).length/Math.max(1,times.length),stages,resources:{...game.renderer.info.memory,programs:game.renderer.info.programs.length},draw:{...game.renderer.info.render},steps:stepIndex,simulationSeconds:stepIndex*CONFIG.step,audioState:game.audio.ctx?.state||'uninitialized',hidden:current.hidden});current=null;publish();}
 const render=game.renderer.render;
 game.renderer.render=function(...args){const begin=performance.now();const result=render.apply(this,args);if(current){costs.render+=performance.now()-begin;const now=performance.now();if(previousFrame!==null){current.frames.push(now-previousFrame);current.costs.push(costs)}previousFrame=now;costs=blank();status.textContent=`${current.level} / ${current.phase} / round ${current.round}\n${Math.floor((now-started)/1000)} / ${seconds}s · ${results.length}/${queue.length+results.length+1}`;if(now-started>=seconds*1000){finish();game.active=false;setTimeout(next,0)}}return result};
 document.addEventListener('visibilitychange',()=>{if(current&&document.hidden)current.hidden=true});
 function next(){if(stopped)return;const job=queue.shift();if(!job){game.resetRace();status.textContent='完成';publish();return}
 variant=job.variant||'raised';
 const t=performance.now();game.selectLevel(job.index);const buildMs=performance.now()-t;
 if(job.phase==='switch'){render.call(game.renderer,game.scene,game.camera);results.push({level:LEVELS[job.index].id,phase:'switch',buildMs,resources:{...game.renderer.info.memory,programs:game.renderer.info.programs.length}});publish();setTimeout(next,50);return}
 Object.assign(CONFIG,MODES.easy);game.setCameraMode(3);game.resetRace();game.countdown=0;
 // Precompute identical input at 120 Hz; controller cost is outside measurements.
 const ghost=new Car(new THREE.Scene());ghost.reset(0);ghost.pose(game.track);inputs=[];const fake={track:game.track,themeName:game.themeName,checkpointS:0,validLap:true,progress(){},audio:{crash(){}},ui:{say(){}}};
 for(let n=0;n<Math.ceil(seconds/CONFIG.step)+120;n++){let k=0;for(let d=0;d<25;d+=2)k=Math.max(k,Math.abs(game.track.sample(ghost.s+d).k));const target=Math.min(20,Math.sqrt(CONFIG.gripMax/Math.max(k,.002))*.78),input={gas:ghost.v<target?1:0,brake:ghost.v>target+.5?1:0,lean:0};inputs.push(input);ghost.update(CONFIG.step,input,fake)}
 const geometries=new Set(),materials=new Set();ghost.mesh.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material)});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
 stepIndex=0;previousFrame=null;costs=blank();game.resetSceneTiming();started=performance.now();current={...job,level:LEVELS[job.index].id,buildMs,frames:[],costs:[],hidden:false};game.active=true;
 }
 panel.querySelector('#perfStart').onclick=()=>{if(current)return;results.length=0;queue.length=0;stopped=false;if(manual){game.start();stepIndex=0;previousFrame=null;costs=blank();game.resetSceneTiming();started=performance.now();current={level:game.level?.id||'workshop',round:1,phase:'manual-with-countdown',variant:'raised',buildMs:0,frames:[],costs:[],hidden:false};publish();return}if(elevationCompare){for(let round=1;round<=rounds;round++)for(const index of [4,5])for(const variant of (round%2?['raised','no-structures','flat']:['flat','no-structures','raised']))queue.push({index,round,variant,phase:'elevation-ab'});publish();next();return}for(let round=1;round<=rounds;round++)for(let index=0;index<LEVELS.length;index++)queue.push({index,round,phase:round===1?'first':'sustained'});for(let i=0;i<20;i++)queue.push({index:i%LEVELS.length,round:0,phase:'switch'});queue.push({index:3,round:1,phase:'post-switch'});publish();next()};
 // Switch stress jobs render one frame before the next rebuild; final job drives 60s.
 panel.querySelector('#perfExport').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({info,results},null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='slot-run-performance-'+info.version+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 panel.querySelector('#perfStop').onclick=()=>{stopped=true;finish();game.resetRace();status.textContent='已停止'};
 if(params.get('autorun')==='1'&&!manual)panel.querySelector('#perfStart').click();publish();
}
