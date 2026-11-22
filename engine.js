export const VERSION=1;
export const outcomes=['miss','safety','foul','scratch','break-foul','continue','win'];
export function createGame(players,target=100,breaker=0){
 if(!Array.isArray(players)||players.length!==2||players.some(p=>typeof p!=='string'||!p.trim()||p.trim().length>40))throw Error('Enter two names (1–40 characters).');
 if(players[0].trim().toLowerCase()===players[1].trim().toLowerCase())throw Error('Use different names for the two players.');
 if(!Number.isInteger(target)||target<1||target>10000)throw Error('Target must be a whole number from 1 to 10,000.');
 if(![0,1].includes(breaker))throw Error('Choose a breaker.');
 return {id:crypto.randomUUID(),players:players.map(p=>p.trim()),target,breaker,startedAt:new Date().toISOString(),events:[],status:'active',winner:null};
}
export function stateOf(game){
 const s={scores:[0,0],fouls:[0,0],active:game.breaker,opening:true,visits:[0,0],runs:[0,0],high:[0,0],balls:[0,0],penalties:[0,0],standard:[0,0],breaking:[0,0],three:[0,0],winner:null,rows:[],visitOpen:false};
 for(const e of game.events){
  if(e.type==='finish'){s.winner=e.winner;continue;}
  if(e.type==='stalemate'){s.active=e.breaker;s.opening=true;s.runs=[0,0];s.fouls=[0,0];s.visitOpen=false;continue;}
  const p=s.active;
  if(!s.visitOpen){s.visits[p]++;s.visitOpen=true;}
  const before=s.scores[p]; let penalty=0,third=false;
  if(e.balls>0){s.fouls[p]=0;s.balls[p]+=e.balls;s.runs[p]+=e.balls;s.high[p]=Math.max(s.high[p],s.runs[p]);}
  s.scores[p]+=e.balls;
  if(e.outcome==='foul'||e.outcome==='scratch'){
   penalty=1;s.standard[p]++;s.fouls[p]++;
   if(s.fouls[p]>=3&&e.warned){penalty+=15;third=true;s.three[p]++;s.fouls[p]=0;}else if(s.fouls[p]>=3){s.fouls[p]=2;}
  }else if(e.outcome==='break-foul'){penalty=2;s.breaking[p]++;}
  else{s.fouls[p]=0;}
  s.scores[p]-=penalty;s.penalties[p]+=penalty;
  s.rows.push({...e,player:p,visit:s.visits[p],penalty,third,total:s.scores[p],net:s.scores[p]-before});
  if(s.scores[p]>=game.target){s.winner=p;}
  if(third){s.active=p;s.opening=true;s.runs[p]=0;s.visitOpen=false;}
  else if(e.outcome==='break-foul'&&e.rebreak){s.active=p;s.opening=true;s.runs[p]=0;s.visitOpen=false;}
  else if(e.outcome==='continue'||e.outcome==='win'){s.opening=false;}
  else{s.active=1-p;s.opening=false;s.runs[p]=0;s.visitOpen=false;}
 }
 return s;
}
export function addTurn(game,{balls=0,outcome='miss',warned=false,rebreak=false,note=''}){
 if(game.status!=='active')throw Error('This game is finished.');
 const s=stateOf(game);
 if(s.winner!==null)throw Error('Target already reached.');
 if(!Number.isInteger(balls)||balls<0||balls>10000)throw Error('Enter a whole number of legal balls from 0 to 10,000.');
 if(!outcomes.includes(outcome))throw Error('Choose a valid result.');
 if(outcome==='break-foul'&&(!s.opening||balls!==0))throw Error('A breaking foul is only possible on an opening break, with zero scoring balls.');
 if((outcome==='continue'||outcome==='win')&&balls===0)throw Error('Add at least one legally scored ball to continue.');
 if(outcome==='win'&&s.scores[s.active]+balls<game.target)throw Error('The target has not been reached.');
 if(outcome==='break-foul'&&warned)throw Error('Breaking fouls do not count toward three consecutive fouls.');
 // Balls are legal scores BEFORE the final miss/safety/foul, never balls pocketed on a foul shot.
 const g=structuredClone(game);g.events.push({type:'turn',balls,outcome,warned:!!warned,rebreak:!!rebreak,note:String(note).slice(0,250),at:new Date().toISOString()});
 const next=stateOf(g);if(next.winner!==null){g.status='finished';g.winner=next.winner;g.endedAt=new Date().toISOString();g.reason='target';}
 return g;
}
export function finishGame(game,winner,reason='concession'){
 if(game.status!=='active'||![0,1].includes(winner))throw Error('Choose a winner for an active game.');
 const g=structuredClone(game);g.events.push({type:'finish',winner,reason,at:new Date().toISOString()});g.status='finished';g.winner=winner;g.reason=reason;g.endedAt=new Date().toISOString();return g;
}
export function undo(game){const g=structuredClone(game);g.events.pop();g.status='active';g.winner=null;delete g.endedAt;delete g.reason;return g;}
export function validateHistory(data){
 if(!data||data.schemaVersion!==VERSION||!Array.isArray(data.games)||data.games.length>10000)throw Error('Unsupported JSON. Use a Straight Pool export (schemaVersion 1).');
 const ids=new Set();
 for(const g of data.games){
  createGame(g.players,g.target,g.breaker);
  if(typeof g.id!=='string'||g.id.length>100||ids.has(g.id)||!Array.isArray(g.events)||g.events.length>100000||!['active','finished'].includes(g.status)||!Number.isFinite(Date.parse(g.startedAt)))throw Error('Invalid game record.');
  ids.add(g.id);let replay={...g,status:'active',winner:null,events:[]};
  for(const e of g.events){
   if(!e||!['turn','finish','stalemate'].includes(e.type))throw Error('Invalid game event.');
   if(e.type==='turn')replay=addTurn(replay,e);
   else if(e.type==='finish')replay=finishGame(replay,e.winner,e.reason);
   else{if(replay.status!=='active'||![0,1].includes(e.breaker))throw Error('Invalid stalemate.');replay.events.push(e);}
  }
  if(g.status!==replay.status||g.winner!==replay.winner)throw Error('Game result does not match its scoring record.');
 }
 return data.games;
}
export function playerStats(games){
 const map=new Map();
 for(const g of games.filter(g=>g.status==='finished')){const s=stateOf(g);g.players.forEach((name,p)=>{const key=name.trim().toLocaleLowerCase();const a=map.get(key)||{name,games:0,wins:0,points:0,balls:0,visits:0,high:0,fouls:0,penalties:0};a.games++;a.wins+=g.winner===p?1:0;a.points+=s.scores[p];a.balls+=s.balls[p];a.visits+=s.visits[p];a.high=Math.max(a.high,s.high[p]);a.fouls+=s.standard[p]+s.breaking[p];a.penalties+=s.penalties[p];map.set(key,a);});}
 return [...map.values()].sort((a,b)=>b.wins-a.wins||b.balls-a.balls);
}
