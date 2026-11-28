import {cloneData,newId} from './compatibility.js?v=20261128.77';
export const VERSION=1;
export const outcomes=['miss','safety','foul','scratch','break-foul','continue','win'];
export function createGame(players,target=100,breaker=0){
 if(!Array.isArray(players)||players.length!==2||players.some(p=>typeof p!=='string'||!p.trim()||p.trim().length>40))throw Error('Enter two names (1–40 characters).');
 if(players[0].trim().toLowerCase()===players[1].trim().toLowerCase())throw Error('Use different names for the two players.');
 if(!Number.isInteger(target)||target<1||target>10000)throw Error('Target must be a whole number from 1 to 10,000.');
 if(![0,1].includes(breaker))throw Error('Choose a breaker.');
 return {id:newId(),players:players.map(p=>p.trim()),target,breaker,startedAt:new Date().toISOString(),events:[],status:'active',winner:null,clock:{elapsedMs:[0,0],runningSince:Date.now(),startedAt:Date.now()}};
}
export function selectOpeningPlayer(game,player){
 if(![0,1].includes(player))throw Error('Choose a breaker.');
 if(game.status!=='active'||game.events.some(e=>e.type==='turn'))return cloneData(game);
 const g=cloneData(game);g.breaker=player;
 if(g.clock){const banked=g.clock.elapsedMs[0]+g.clock.elapsedMs[1];g.clock.elapsedMs=[0,0];g.clock.elapsedMs[player]=banked;}
 return g;
}
export function stateOf(game){
 let target=game.events.find(e=>e.type==='target')?.previousTarget??game.target;
 const s={scores:[0,0],handicaps:[0,0],fouls:[0,0],active:game.breaker,opening:true,visits:[0,0],runs:[0,0],high:[0,0],balls:[0,0],penalties:[0,0],standard:[0,0],breaking:[0,0],three:[0,0],winner:null,rows:[],visitOpen:false,warned:[false,false]};
 for(const e of game.events){
  if(e.type==='target'){target=e.target;if(Math.max(...s.scores)>=target)s.winner=s.scores[0]>s.scores[1]?0:1;continue;}
  if(e.type==='handicap'){s.scores[e.player]+=e.points-s.handicaps[e.player];s.handicaps[e.player]=e.points;if(Math.max(...s.scores)>=target)s.winner=s.scores[0]>s.scores[1]?0:1;continue;}
  if(e.type==='finish'){s.winner=e.winner;continue;}
  if(e.type==='stalemate'){s.active=e.breaker;s.opening=true;s.runs=[0,0];s.fouls=[0,0];s.warned=[false,false];s.visitOpen=false;continue;}
  const p=s.active;
  if(!s.visitOpen){s.visits[p]++;s.visitOpen=true;}
  const before=s.scores[p]; let penalty=0,third=false;
  if(e.balls>0){s.fouls[p]=0;s.warned[p]=false;s.balls[p]+=e.balls;s.runs[p]+=e.balls;s.high[p]=Math.max(s.high[p],s.runs[p]);}
  s.scores[p]+=e.balls;
  if(e.outcome==='foul'||e.outcome==='scratch'){
   penalty=1;s.standard[p]++;s.fouls[p]++;
   if(s.fouls[p]>=3&&(e.warned||s.warned[p])){penalty+=15;third=true;s.three[p]++;s.fouls[p]=0;}else if(s.fouls[p]>=3){s.fouls[p]=2;}
  }else if(e.outcome==='break-foul'){penalty=2;s.breaking[p]++;}
  else{s.fouls[p]=0;s.warned[p]=false;}
  if(e.warningGiven&&s.fouls[p]===2)s.warned[p]=true;
  if(third)s.warned[p]=false;
  s.scores[p]-=penalty;s.penalties[p]+=penalty;
  s.rows.push({...e,player:p,visit:s.visits[p],penalty,third,total:s.scores[p],net:s.scores[p]-before});
  if(s.scores[p]>=target){s.winner=p;}
  if(third){s.active=e.thirdChoice==='continue'?1-p:p;s.opening=e.thirdChoice!=='continue';s.runs[p]=0;s.visitOpen=false;}
  else if(e.outcome==='break-foul'&&e.rebreak){s.active=p;s.opening=true;s.runs[p]=0;s.visitOpen=false;}
  else if(e.outcome==='continue'||e.outcome==='win'){s.opening=false;}
  else{s.active=1-p;s.opening=false;s.runs[p]=0;s.visitOpen=false;}
 }
 return s;
}
export function addTurn(game,{balls=0,outcome='miss',warned=false,rebreak=false,note='',shots=null,warningGiven=false,rackEnd=null,thirdChoice='rerack'},now=Date.now()){
 if(game.status!=='active')throw Error('This game is finished.');
 const s=stateOf(game);
 if(s.winner!==null)throw Error('Target already reached.');
 if(!Number.isInteger(balls)||balls<0||balls>10000)throw Error('Enter a whole number of legal balls from 0 to 10,000.');
 if(rackEnd!==null&&(!Number.isInteger(rackEnd)||rackEnd<1||rackEnd>15||balls<1))throw Error('Invalid rack endpoint.');
 if(shots!==null&&(!Number.isInteger(shots)||shots<1||shots>100000))throw Error('Invalid shot count.');
 if(game.clock&&game.clock.runningSince===null)throw Error('Resume the match clock first.');
 if(!['rerack','continue'].includes(thirdChoice))throw Error('Invalid three-foul choice.');
 if(!outcomes.includes(outcome))throw Error('Choose a valid result.');
 if(outcome==='break-foul'&&(!s.opening||balls!==0))throw Error('A breaking foul is only possible on an opening break, with zero scoring balls.');
 if((outcome==='continue'||outcome==='win')&&balls===0)throw Error('Add at least one legally scored ball to continue.');
 if(outcome==='win'&&s.scores[s.active]+balls<game.target)throw Error('The target has not been reached.');
 if(outcome==='break-foul'&&warned)throw Error('Breaking fouls do not count toward three consecutive fouls.');
 if(s.scores[s.active]+balls>=game.target&&balls>0){outcome='win';warned=false;rebreak=false;}
 // Balls are legal scores BEFORE the final miss/safety/foul, never balls pocketed on a foul shot.
 const g=settleClock(game,now);
 const previousTime=s.rows.reduce((n,r)=>n+(r.player===s.active?(r.elapsedMs||0):0),0);
 const elapsedMs=g.clock?Math.max(0,g.clock.elapsedMs[s.active]-previousTime):null;
 g.events.push({type:'turn',balls,outcome,warned:!!warned,rebreak:!!rebreak,note:String(note).slice(0,250),shots,rackEnd,thirdChoice,warningGiven:!!warningGiven,elapsedMs,at:new Date(now).toISOString()});
 const next=stateOf(g);if(next.winner!==null){g.status='finished';g.finalized=true;g.winner=next.winner;g.endedAt=new Date(now).toISOString();g.reason='target';}
 if(g.clock)g.clock.runningSince=g.status==='active'?now:null;
 return g;
}
export function finishGame(game,winner,reason='concession',now=Date.now()){
 if(game.status!=='active'||(![0,1].includes(winner)&&!(winner===null&&reason==='interrupted')))throw Error('Choose a winner for an active game.');
 const g=settleClock(game,now);if(g.clock)g.clock.runningSince=null;g.events.push({type:'finish',winner,reason,at:new Date(now).toISOString()});g.status='finished';g.finalized=true;g.winner=winner;g.reason=reason;g.endedAt=new Date(now).toISOString();return g;
}
export function changeTarget(game,target,now=Date.now()){
 if(game.status!=='active'||game.finalized)throw Error('比賽已結束，不能修改目標分數。');
 if(!Number.isInteger(target)||target<1||target>10000)throw Error('目標分數須為 1–10,000 的整數。');
 const scores=stateOf(game).scores;
 if(scores[0]===scores[1]&&scores[0]>=target)throw Error('雙方同分，請將目標設為高於目前比分，繼續比賽決定勝負。');
 if(target===game.target)return cloneData(game);
 const g=settleClock(game,now);g.events.push({type:'target',previousTarget:game.target,target,at:new Date(now).toISOString()});g.target=target;
 if(Math.max(...scores)>=target){g.status='finished';g.finalized=true;g.winner=scores[0]>scores[1]?0:1;g.reason='target';g.endedAt=new Date(now).toISOString();if(g.clock)g.clock.runningSince=null;}
 return g;
}
export function setHandicap(game,player,points,now=Date.now()){
 if(game.status!=='active'||game.finalized)throw Error('比賽未開始或已結束，不能設定讓分。');
 if(![0,1].includes(player)||!Number.isInteger(points)||points< -10000||points>10000)throw Error('讓分須為 -10,000 至 10,000 的整數。');
 const s=stateOf(game),scores=[...s.scores];scores[player]+=points-s.handicaps[player];
 if(scores[0]===scores[1]&&scores[0]>=game.target)throw Error('讓分後雙方同分且達標，請調整讓分或目標。');
 if(points===s.handicaps[player])return cloneData(game);
 const g=settleClock(game,now);g.events.push({type:'handicap',player,points,at:new Date(now).toISOString()});
 if(Math.max(...scores)>=g.target){g.status='finished';g.finalized=true;g.winner=scores[0]>scores[1]?0:1;g.reason='target';g.endedAt=new Date(now).toISOString();if(g.clock)g.clock.runningSince=null;}
 return g;
}
export function renamePlayer(game,player,name){
 if(game.status==='finished'||game.finalized)throw Error('比賽已結束，不能修改姓名。');
 if(![0,1].includes(player))throw Error('請選擇選手。');
 const names=[...game.players];names[player]=String(name).trim();createGame(names,game.target,game.breaker);
 return {...cloneData(game),players:names};
}
export function undo(game){if(game.status==='finished'||game.finalized)throw Error('Finished games are read-only.');const g=cloneData(game);const removed=g.events.pop();if(removed?.type==='target')g.target=removed.previousTarget;delete g.rackClearedAt;g.status='active';g.winner=null;delete g.endedAt;delete g.reason;if(g.clock){g.clock=settleClock(game).clock;g.clock.runningSince=null;}return g;}
export function validateHistory(data){
 if(!data||data.schemaVersion!==VERSION||!Array.isArray(data.games)||data.games.length>10000)throw Error('Unsupported JSON. Use a Straight Pool export (schemaVersion 1).');
 const ids=new Set();
 for(const g of data.games){
  createGame(g.players,g.target,g.breaker);
  if(typeof g.id!=='string'||g.id.length>100||ids.has(g.id)||!Array.isArray(g.events)||g.events.length>100000||!['active','finished'].includes(g.status)||!Number.isFinite(Date.parse(g.startedAt)))throw Error('Invalid game record.');
  if(g.clock&&(!Array.isArray(g.clock.elapsedMs)||g.clock.elapsedMs.length!==2||g.clock.elapsedMs.some(t=>!Number.isFinite(t)||t<0)||(g.clock.runningSince!==null&&(!Number.isFinite(g.clock.runningSince)||g.clock.runningSince<0))))throw Error('Invalid clock.');
  if(g.events.some(e=>(e.elapsedMs!=null&&(!Number.isFinite(e.elapsedMs)||e.elapsedMs<0))||(e.shots!=null&&(!Number.isInteger(e.shots)||e.shots<1||e.shots>100000))))throw Error('Invalid timing or shot count.');
  ids.add(g.id);let replay={...g,target:g.events.find(e=>e.type==='target')?.previousTarget??g.target,clock:undefined,finalized:false,status:'active',winner:null,events:[]};
  for(const e of g.events){
   if(!e||!['turn','finish','stalemate','target','handicap'].includes(e.type))throw Error('Invalid game event.');
   if(e.type==='turn')replay=addTurn(replay,e);
   else if(e.type==='handicap')replay=setHandicap(replay,e.player,e.points);
   else if(e.type==='target'){if(e.previousTarget!==replay.target)throw Error('Invalid target history.');replay=changeTarget(replay,e.target);}
   else if(e.type==='finish')replay=finishGame(replay,e.winner,e.reason);
   else{if(replay.status!=='active'||![0,1].includes(e.breaker))throw Error('Invalid stalemate.');replay.events.push(e);}
  }
  if(g.target!==replay.target||g.status!==replay.status||g.winner!==replay.winner)throw Error('Game result does not match its scoring record.');
  if(g.status==='finished')g.finalized=true;
 }
 return data.games;
}
// Persist only elapsed totals and one wall-clock anchor; rendering never mutates time.
export function clockTotals(game,now=Date.now()){
 if(!game.clock)return null;
 const totals=[...game.clock.elapsedMs];
 if(game.status==='active'&&game.clock.runningSince!==null){
  totals[stateOf(game).active]+=Math.max(0,now-game.clock.runningSince);
 }
 return totals;
}
export function settleClock(game,now=Date.now()){
 const g=cloneData(game);
 if(g.clock){g.clock.elapsedMs=clockTotals(game,now);g.clock.runningSince=game.status==='active'&&game.clock.runningSince!==null?now:null;}
 return g;
}
export function pauseClock(game,now=Date.now()){
 const g=settleClock(game,now);if(g.clock)g.clock.runningSince=null;return g;
}
export function resumeClock(game,now=Date.now()){
 const g=cloneData(game);if(g.status!=='active')return g;
 if(!g.clock)g.clock={elapsedMs:[0,0],runningSince:null,startedAt:now,partial:game.events.length>0};
 if(g.clock.runningSince===null)g.clock.runningSince=now;
 return g;
}
export function rackState(game,{forInput=false}={}){
 let owners=Array(16).fill(null),count=0,number=1,complete=false,rows=[];
 const reset=()=>{owners=Array(16).fill(null);count=0;number++;complete=false;rows=[];};
 for(const r of stateOf(game).rows){
  if(complete)reset();
  if((r.third&&r.thirdChoice!=='continue')||(r.outcome==='break-foul'&&r.rebreak)){reset();continue;}
  const limit=r.rackEnd===15||(!r.rackEnd&&r.balls===15&&count===0)?15:14;
  for(let i=0;i<r.balls;i++){
   if(count>=limit)reset();
   owners[++count]=r.player;
  }
  rows.push(r);complete=count>=14;
 }
 if(complete&&(forInput||game.rackClearedAt===game.events.length))reset();
 return {owners,count,number,complete,rows};
}
export function visitRecords(game,player){
 const groups=[];
 for(const row of stateOf(game).rows.filter(r=>r.player===player)){
  let v=groups.at(-1);
  if(!v||v.visit!==row.visit){v={visit:row.visit,rows:[],points:0,misses:0,shots:0,shotsKnown:true,elapsedMs:0,timeKnown:true};groups.push(v);}
  v.rows.push(row);v.points+=row.net;v.misses+=row.outcome==='miss'?1:0;
  if(row.shots==null)v.shotsKnown=false;else v.shots+=row.shots;
  if(row.elapsedMs==null)v.timeKnown=false;else v.elapsedMs+=row.elapsedMs;
 }
 return groups;
}
// Exclude the initial match rack (including repeated opening breaks). Later rack attacks stay pending until completed.
export function rackOpeningStats(game){
 const stats=[0,1].map(()=>({openings:0,openingEvaluated:0,openingSuccess:0}));
 const rows=stateOf(game).rows;let index=0,count=0,fresh=true,reset=false,attack=null,initialRack=true;
 const end=safety=>{if(!attack)return;const a=stats[attack.player];a.openingEvaluated++;if(!safety&&attack.balls>=2)a.openingSuccess++;attack=null;};
 const begin=p=>{if(reset){count=0;fresh=true;reset=false;}if(fresh){if(!initialRack){attack={player:p,balls:0};stats[p].openings++;}fresh=false;}};
 for(const event of game.events){
  if(event.type==='stalemate'){attack=null;reset=true;initialRack=false;continue;}
  if(event.type!=='turn')continue;
  const row=rows[index++];begin(row.player);
  const limit=row.rackEnd===15||(!row.rackEnd&&row.balls===15&&count===0)?15:14;
  for(let i=0;i<row.balls;i++){
   begin(row.player);count++;if(attack?.player===row.player)attack.balls++;
   if(count>=limit){end(i===row.balls-1&&row.outcome==='safety');reset=true;initialRack=false;}
  }
  if(row.outcome!=='continue'||row.total>=game.target)end(row.outcome==='safety');
  if(row.third&&row.thirdChoice!=='continue'){reset=true;initialRack=false;}
  if(row.outcome==='break-foul'&&row.rebreak)reset=true;
 }
 return stats;
}
// Derive statistics from the event log; existing version-1 JSON needs no migration.
export function tacticalStats(game){
 const result=[0,1].map(()=>({misses:0,safeties:0,completedVisits:0,zeroVisits:0,
  safetyEvaluated:0,safetyScoredAgainst:0,safetyBallsAgainst:0,safetyHeld:0,safetyOpponentFouls:0,openings:0,openingEvaluated:0,openingSuccess:0}));
 const openings=rackOpeningStats(game);result.forEach((a,p)=>Object.assign(a,openings[p]));
 const scoringRows=stateOf(game).rows;
 let segment=0,rowIndex=0;const rows=[];
 for(const e of game.events){
  if(e.type==='stalemate')segment++;
  if(e.type==='turn')rows.push({...scoringRows[rowIndex++],segment});
 }
 const visits=[];
 for(const r of rows){
  let v=visits.at(-1);
  if(!v||v.player!==r.player||v.visit!==r.visit||v.segment!==r.segment){v={player:r.player,visit:r.visit,segment:r.segment,balls:0,last:r};visits.push(v);}
  v.balls+=r.balls;v.last=r;
 }
 const completed=v=>v.last.outcome!=='continue'||v.last.total>=game.target;
 for(let i=0;i<visits.length;i++){
  const v=visits[i],a=result[v.player];
  if(completed(v)){
   a.completedVisits++;
   if(v.balls===0)a.zeroVisits++;
   if(v.last.outcome==='miss')a.misses++;
   if(v.last.outcome==='safety'){
    a.safeties++;
    const next=visits[i+1];
    // No result until the opponent's WHOLE immediately following visit ends.
    if(next&&next.player!==v.player&&next.segment===v.segment&&completed(next)){
     a.safetyEvaluated++;
     a.safetyBallsAgainst+=next.balls;
     if(next.balls>0)a.safetyScoredAgainst++;else a.safetyHeld++;
     if(['foul','scratch','break-foul'].includes(next.last.outcome))a.safetyOpponentFouls++;
    }
   }
  }
 }
 return result;
}
export function playerStats(games){
 const map=new Map();
 for(const g of games.filter(g=>g.status==='finished'&&g.reason!=='interrupted')){
  const s=stateOf(g),tactics=tacticalStats(g);
  g.players.forEach((name,p)=>{
   const key=name.trim().toLocaleLowerCase();
   const a=map.get(key)||{name,games:0,wins:0,points:0,balls:0,visits:0,high:0,fouls:0,penalties:0,
    misses:0,safeties:0,completedVisits:0,zeroVisits:0,safetyEvaluated:0,
    safetyScoredAgainst:0,safetyBallsAgainst:0,safetyHeld:0,safetyOpponentFouls:0,openings:0,openingEvaluated:0,openingSuccess:0,
    timedGames:0,timeMs:0,timedVisits:0,visitTimeMs:0,timedShots:0,shotTimeMs:0,recordedShots:0,shotPoints:0,shotMisses:0};
   a.games++;a.wins+=g.winner===p?1:0;a.points+=s.scores[p];a.balls+=s.balls[p];
   a.visits+=s.visits[p];a.high=Math.max(a.high,s.high[p]);
   a.fouls+=s.standard[p]+s.breaking[p];a.penalties+=s.penalties[p];
   for(const [metric,value] of Object.entries(tactics[p]))a[metric]+=value;
   if(g.clock&&!g.clock.partial){a.timedGames++;a.timeMs+=g.clock.elapsedMs[p];}
   for(const r of s.rows.filter(r=>r.player===p&&r.shots!=null)){a.recordedShots+=r.shots;a.shotPoints+=r.net;a.shotMisses+=r.outcome==='miss'?1:0;}
   for(const v of visitRecords(g,p)){
    const last=v.rows.at(-1);
    if(v.timeKnown&&(last.outcome!=='continue'||last.total>=g.target)){a.timedVisits++;a.visitTimeMs+=v.elapsedMs;}
    if(v.timeKnown&&v.shotsKnown){a.timedShots+=v.shots;a.shotTimeMs+=v.elapsedMs;}
   }
   map.set(key,a);
  });
 }
 return [...map.values()].sort((a,b)=>b.wins-a.wins||b.balls-a.balls);
}
