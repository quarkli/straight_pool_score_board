// Reproducible fixture builder. No external data or personal game records.
import {writeFileSync} from 'node:fs';
import {createGame,addTurn,stateOf,pauseClock,resumeClock,validateHistory} from './engine.js';
let seed=20261122;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const choice=a=>a[Math.floor(random()*a.length)];
const pairs=[['林子安','陳柏翰'],['張雅婷','王志明'],['林子安','張雅婷'],['陳柏翰','王志明'],['林子安','王志明'],['張雅婷','陳柏翰'],['陳柏翰','林子安'],['王志明','張雅婷'],['張雅婷','林子安'],['王志明','陳柏翰']];
const games=pairs.map((names,index)=>{
 let g=createGame(names,70,index%2);let now=Date.UTC(2026,10,12+index,3+index%5,15);
 g.id=`demo-70-${index+1}`;g.demo=true;g.startedAt=new Date(now).toISOString();g.clock={elapsedMs:[0,0],runningSince:now,startedAt:now};
 const append=(balls,outcome,extra={})=>{const shots=Math.max(1,balls+(['continue','win'].includes(outcome)?0:1));now+=Math.round((15+random()*30)*1000)*shots;g=addTurn(g,{balls,outcome,shots,...extra},now);};
 if(index===2||index===6){append(0,'break-foul',{rebreak:true});}
 append(0,'safety');
 if(index===4){
  append(0,'foul');append(0,'safety');append(0,'foul',{warningGiven:true});append(0,'safety');append(0,'foul');append(0,'safety');
 }
 for(let i=0;i<1000&&g.status==='active';i++){
  const s=stateOf(g),p=s.active,r=random();
  let balls=choice([0,0,1,2,3,5,7,10,14,15]),outcome=r<.13?'foul':r<.34?'safety':r<.84?'miss':'continue';
  if(outcome==='continue'&&balls===0)outcome='miss';
  if(outcome==='foul')balls=0;
  balls=Math.min(balls,70-s.scores[p]);
  if(s.opening&&outcome==='foul')outcome='safety';
  append(balls,outcome,{warned:s.fouls[p]>=2});
  if(i===7||i===17){if(g.status==='active'){now+=4000;g=pauseClock(g,now);now+=180000;g=resumeClock(g,now);}}
 }
 if(g.status!=='finished')throw Error('Simulation did not finish');
 return g;
});
const data={schemaVersion:1,app:'straight_pool_score_board',exportedAt:'2026-11-22T03:00:00.000Z',games};
validateHistory(data);writeFileSync('demo-games.json',JSON.stringify(data,null,2)+'\n');
console.log(games.map(g=>`${g.id}: ${g.players.join(' vs ')} ${stateOf(g).scores.join(':')} ${g.events.length} entries`).join('\n'));
