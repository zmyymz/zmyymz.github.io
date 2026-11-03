export const TAU = Math.PI * 2;
const vertices = [[-7,-5,2.5],[7,-5,2.5],[7,5,1.5],[2,5,1.5],[2,1,1.5],[-2,1,1.5],[-2,5,.5],[-7,5,1.5]];
const unit=(a,b)=>{const l=Math.hypot(b[0]-a[0],b[1]-a[1]);return [(b[0]-a[0])/l,(b[1]-a[1])/l]};
export const LEVELS=[
 {id:"sprint",name:"01 · 长风回环",vertices:[[-7,-4,2.5],[7,-4,1.5],[7,4,1.5],[-7,4,2.5]]},
 {id:"club",name:"02 · 俱乐部环线",vertices}
];
export function createTrack(vertices=LEVELS[0].vertices) {
 const corners=vertices.map((v,i)=>{
  const incoming=unit(vertices[(i+vertices.length-1)%vertices.length],v), outgoing=unit(v,vertices[(i+1)%vertices.length]), r=v[2];
  const entry=[v[0]-incoming[0]*r,v[1]-incoming[1]*r],exit=[v[0]+outgoing[0]*r,v[1]+outgoing[1]*r];
  const center=[entry[0]+outgoing[0]*r,entry[1]+outgoing[1]*r],sign=Math.sign(incoming[0]*outgoing[1]-incoming[1]*outgoing[0]);
  return {type:'arc',entry,exit,center,r,sign,a:Math.atan2(entry[1]-center[1],entry[0]-center[0]),length:r*Math.PI/2};
 });
 let total=0; const segments=[];
 for(let i=0;i<corners.length;i++){
  const prev=corners[(i+corners.length-1)%corners.length], c=corners[i];
  const line={type:'line',entry:prev.exit,exit:c.entry,length:Math.hypot(c.entry[0]-prev.exit[0],c.entry[1]-prev.exit[1])};
  for(const s of [line,c]) { s.start=total;total+=s.length;segments.push(s); }
 }
 return {segments,length:total,sample(distance){
  const d=((distance%total)+total)%total;
  const s=segments.find(s=>d<s.start+s.length)||segments.at(-1), t=(d-s.start)/s.length;
  if(s.type==='line') {const [tx,tz]=unit(s.entry,s.exit);return {x:s.entry[0]+(s.exit[0]-s.entry[0])*t,z:s.entry[1]+(s.exit[1]-s.entry[1])*t,tx,tz,k:0,segment:s};}
  const a=s.a+s.sign*t*Math.PI/2;
  return {x:s.center[0]+Math.cos(a)*s.r,z:s.center[1]+Math.sin(a)*s.r,tx:-Math.sin(a)*s.sign,tz:Math.cos(a)*s.sign,k:s.sign/s.r,segment:s};
 }};
}
// Preserve the original track export for existing physics consumers.
export const TRACK=createTrack(vertices);
export function nextLevel(id){const index=LEVELS.findIndex(l=>l.id===id);return index<0?null:LEVELS[index+1]??null;}
