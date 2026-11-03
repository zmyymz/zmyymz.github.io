import {TRACK} from './track.mjs';
export const CONFIG={guideAcceleration:8.8,acceleration:6.4,coast:1.5,drag:.085,maxSpeed:6,laps:3,crashDuration:1.3,guideGrace:.22};
export class Race {
 constructor(track=TRACK){this.track=track;this.reset();}
 reset(){Object.assign(this,{state:'ready',distance:0,speed:0,time:0,countdown:3,load:0,overTime:0,crashes:0,crashTime:0,crash:null,lapStart:0,lapTimes:[],invalidLap:false,event:null});}
 start(){this.reset();this.state='countdown';}
 step(dt,throttle){
  this.event=null;
  if(this.state==='ready'||this.state==='finished')return;
  if(this.state==='countdown'){this.countdown-=dt;if(this.countdown<=0){this.state='racing';this.event='go';}return;}
  this.time+=dt;
  if(this.state==='crashed'){
   this.crashTime+=dt;
   if(this.crashTime>=CONFIG.crashDuration){this.distance=this.crash.reset;this.speed=.3;this.load=0;this.overTime=0;this.state='racing';this.event='reset';}return;
  }
  this.speed=Math.max(0,Math.min(CONFIG.maxSpeed,this.speed+((throttle?CONFIG.acceleration:-CONFIG.coast)-CONFIG.drag*this.speed*this.speed)*dt));
  const oldLap=Math.floor(this.distance/this.track.length);this.distance+=this.speed*dt;
  const p=this.track.sample(this.distance);this.load=this.speed*this.speed*Math.abs(p.k)/CONFIG.guideAcceleration;
  // The guide hangs on for a short window past its limit, so a late lift can still save the car.
  // This is a gameplay approximation, not a measured guide/magnet simulation.
  if(this.load>1){
   this.overTime+=dt;
   if(this.overTime>=CONFIG.guideGrace){
    this.crashes++;this.invalidLap=true;this.state='crashed';this.crashTime=0;this.overTime=0;
    const lapBase=Math.floor(this.distance/this.track.length)*this.track.length;
    this.crash={...p,vx:p.tx*this.speed,vz:p.tz*this.speed,speed:this.speed,reset:Math.max(lapBase,lapBase+p.segment.start-.9)};this.event='crash';return;
   }
  }else if(this.overTime>0){
   this.overTime=Math.max(0,this.overTime-dt*4);
   if(this.overTime===0)this.event='saved';
  }
  const lap=Math.floor(this.distance/this.track.length);
  if(lap>oldLap){this.lapTimes.push({time:this.time-this.lapStart,clean:!this.invalidLap});this.lapStart=this.time;this.invalidLap=false;this.event='lap';}
  if(this.distance>=this.track.length*CONFIG.laps){this.distance=this.track.length*CONFIG.laps;this.state='finished';this.speed=0;this.event='finish';}
 }
 get lap(){return Math.min(CONFIG.laps,Math.floor(this.distance/this.track.length)+1);}
 get nextCorner(){
  for(let d=0;d<12;d+=.15){const p=this.track.sample(this.distance+d);if(p.k)return {distance:d,speed:Math.sqrt(CONFIG.guideAcceleration/Math.abs(p.k)),sharp:Math.abs(p.k)>1};}
  return {distance:12,speed:6,sharp:false};
 }
}
export function drivingAssist(race){
 for(let d=0;d<14;d+=.1){
  const p=race.track.sample(race.distance+d);
  if(p.k){
   const safe=Math.sqrt(CONFIG.guideAcceleration/Math.abs(p.k))*.95, c=CONFIG.coast, k=CONFIG.drag;
   const need=Math.log((c+k*race.speed*race.speed)/(c+k*safe*safe))/(2*k);
   if(need>Math.max(0,d-.1))return false;
  }
 }
 return true;
}
