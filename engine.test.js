import test from 'node:test';import assert from 'node:assert/strict';
import {changeTarget,createGame,stateOf,addTurn,finishGame,undo,validateHistory,playerStats,tacticalStats,clockTotals,pauseClock,resumeClock,visitRecords} from './engine.js';
const start=(t=100)=>createGame(['甲','乙'],t);const turn=(g,balls,outcome='miss',options={})=>addTurn(g,{balls,outcome,...options});
test('legal scoring, negative score and alternating visits',()=>{let g=turn(start(),8);g=turn(g,0,'scratch');const s=stateOf(g);assert.deepEqual(s.scores,[8,-1]);assert.deepEqual(s.visits,[1,1]);assert.equal(s.active,0);});
test('a run spans continuation entries and racks without extra inning',()=>{let g=turn(start(),14,'continue');g=turn(g,14,'continue');g=turn(g,3);const s=stateOf(g);assert.equal(s.high[0],31);assert.equal(s.visits[0],1);assert.equal(s.scores[0],31);});
test('third warned standard foul costs 16 and offender must rebreak',()=>{let g=start();for(let i=0;i<3;i++){g=turn(g,0,'foul',{warned:i===2});if(i<2)g=turn(g,0);}let s=stateOf(g);assert.equal(s.scores[0],-18);assert.equal(s.active,0);assert.equal(s.opening,true);assert.equal(s.fouls[0],0);assert.equal(s.three[0],1);g=turn(g,0,'break-foul',{rebreak:true});assert.equal(stateOf(g).scores[0],-20);});
test('unwarned third foul has no extra 15 point penalty',()=>{let g=start();for(let i=0;i<3;i++){g=turn(g,0,'foul');if(i<2)g=turn(g,0);}assert.equal(stateOf(g).scores[0],-3);assert.equal(stateOf(g).three[0],0);});
test('legal miss or safety resets own foul sequence',()=>{let g=turn(start(),0,'foul');g=turn(g,0);g=turn(g,0,'safety');assert.equal(stateOf(g).fouls[0],0);});
test('legal balls before final foul reset streak before applying foul',()=>{let g=turn(start(),0,'foul');g=turn(g,0);g=turn(g,5,'foul');assert.equal(stateOf(g).fouls[0],1);assert.equal(stateOf(g).scores[0],3);});
test('opening foul is two points and can force same player to rebreak',()=>{let g=turn(start(),0,'break-foul',{rebreak:true});assert.equal(stateOf(g).active,0);assert.equal(stateOf(g).fouls[0],0);g=turn(g,0,'break-foul');assert.equal(stateOf(g).scores[0],-4);assert.equal(stateOf(g).active,1);});
test('cannot apply break penalty during regular play',()=>assert.throws(()=>turn(turn(start(),0),0,'break-foul')));
test('completed games are finalized and cannot be undone',()=>{const g=turn(start(10),10,'continue');assert.equal(g.status,'finished');assert.equal(g.finalized,true);assert.equal(g.winner,0);assert.throws(()=>turn(g,1));assert.throws(()=>undo(g),/read-only/);});
test('negative scoring does not prematurely win',()=>{let g=turn(start(5),0,'foul');g=turn(g,0);g=turn(g,5);assert.equal(g.status,'active');assert.equal(stateOf(g).scores[0],4);});
test('concession and valid round trip JSON export',()=>{let g=finishGame(turn(start(),6),1);assert.equal(g.winner,1);assert.deepEqual(validateHistory({schemaVersion:1,games:[g]}),[g]);});
test('reject tampered winner, invalid numeric values, duplicate IDs',()=>{const g=turn(start(5),5);assert.throws(()=>validateHistory({schemaVersion:1,games:[{...g,winner:1}]}));assert.throws(()=>turn(start(),NaN));assert.throws(()=>turn(start(),-1));assert.throws(()=>createGame(['a','A']));assert.throws(()=>validateHistory({schemaVersion:1,games:[g,g]}));});
test('statistics exclude unfinished games and count completed visits',()=>{const g=turn(start(10),10);const p=playerStats([g,start()]);assert.equal(p[0].wins,1);assert.equal(p[0].games,1);assert.equal(p[0].balls,10);assert.equal(p[0].high,10);assert.equal(p[1].visits,0);});

test('reaching target ends match before any later reported foul',()=>{const g=addTurn(createGame(['甲','乙'],5),{balls:5,outcome:'foul'});assert.equal(g.status,'finished');assert.equal(stateOf(g).scores[0],5);assert.equal(stateOf(g).standard[0],0);});

test('misses, legal safeties and fouls are separate; zero visits include all three',()=>{
 let g=turn(start(),0,'safety');g=turn(g,0,'miss');g=turn(g,0,'foul');
 const [a,b]=tacticalStats(g);
 assert.equal(a.safeties,1);assert.equal(a.misses,0);assert.equal(a.zeroVisits,2);
 assert.equal(a.completedVisits,2);assert.equal(a.safetyHeld,1);assert.equal(b.misses,1);
});
test('safety evaluation merges entire opponent run and ignores net foul penalty',()=>{
 let g=turn(start(),0,'safety');g=turn(g,14,'continue');g=turn(g,1,'foul');
 const a=tacticalStats(g)[0];assert.equal(a.safetyEvaluated,1);assert.equal(a.safetyBallsAgainst,15);
 assert.equal(a.safetyScoredAgainst,1);assert.equal(a.safetyOpponentFouls,1);
});
test('safety into opponent continuation is pending, including mid-visit concession',()=>{
 let g=turn(start(),0,'safety');g=turn(g,7,'continue');
 assert.equal(tacticalStats(g)[0].safetyEvaluated,0);
 g=finishGame(g,0);assert.equal(tacticalStats(g)[0].safetyEvaluated,0);
 assert.equal(tacticalStats(g)[1].completedVisits,0);
});
test('safety with no opponent visit is pending rather than successful',()=>{
 const g=finishGame(turn(start(),0,'safety'),0);
 const a=tacticalStats(g)[0];assert.equal(a.safeties,1);assert.equal(a.safetyEvaluated,0);assert.equal(a.safetyHeld,0);
});
test('one legal ball followed by foul is still scored against even when net zero',()=>{
 let g=turn(start(),0,'safety');g=turn(g,1,'foul');
 assert.equal(stateOf(g).scores[1],0);assert.equal(tacticalStats(g)[0].safetyScoredAgainst,1);
 assert.equal(tacticalStats(g)[0].safetyBallsAgainst,1);
});
test('safety exchange assesses each defender separately',()=>{
 let g=turn(start(),0,'safety');g=turn(g,0,'safety');g=turn(g,0,'scratch');
 const [a,b]=tacticalStats(g);assert.equal(a.safetyHeld,1);assert.equal(b.safetyHeld,1);
 assert.equal(a.safetyOpponentFouls,0);assert.equal(b.safetyOpponentFouls,1);
});
test('winning visit completes safety evaluation without needing a miss',()=>{
 let g=turn(start(10),0,'safety');g=turn(g,10,'continue');
 assert.equal(tacticalStats(g)[0].safetyScoredAgainst,1);assert.equal(tacticalStats(g)[1].misses,0);
});
test('stalemate is a boundary and cannot retroactively assess an earlier safety',()=>{
 let g=turn(start(),0,'safety');g.events.push({type:'stalemate',breaker:1});g=turn(g,8);
 assert.equal(tacticalStats(g)[0].safetyEvaluated,0);
});
test('three foul same-player rebreak does not create false opposing visits',()=>{
 let g=start();for(let i=0;i<3;i++){g=turn(g,0,'foul',{warned:i===2});if(i<2)g=turn(g,0,'safety');}
 const b=tacticalStats(g)[1];assert.equal(b.safeties,2);assert.equal(b.safetyEvaluated,2);assert.equal(b.safetyOpponentFouls,2);
});
test('tactical aggregation uses weighted counts and preserves original JSON',()=>{
 let first=turn(start(),0,'safety');first=turn(first,5);first=finishGame(first,0);
 let second=turn(start(),0,'safety');second=turn(second,0,'safety');second=turn(second,0,'miss');second=finishGame(second,1);
 const raw=JSON.stringify([first,second]);const a=playerStats([first,second,start()]).find(p=>p.name==='甲');
 assert.equal(a.games,2);assert.equal(a.safeties,2);assert.equal(a.safetyEvaluated,2);
 assert.equal(a.safetyScoredAgainst,1);assert.equal(a.safetyBallsAgainst,5);assert.equal(a.misses,1);
 assert.equal(JSON.stringify([first,second]),raw);
 assert.deepEqual(validateHistory({schemaVersion:1,games:[first,second]}),[first,second]);
});

const timed=()=>{const g=start();g.clock={elapsedMs:[0,0],runningSince:1000,startedAt:1000};return g;};
test('clock assigns elapsed time to active player, then switches at handoff',()=>{
 let g=addTurn(timed(),{balls:5,outcome:'miss',shots:6},11000);
 assert.deepEqual(g.clock.elapsedMs,[10000,0]);assert.equal(g.events[0].elapsedMs,10000);
 assert.deepEqual(clockTotals(g,16000),[10000,5000]);
 g=addTurn(g,{balls:0,outcome:'safety',shots:1},16000);
 assert.deepEqual(g.clock.elapsedMs,[10000,5000]);assert.equal(g.events[1].elapsedMs,5000);
});
test('break pauses exclude wall-clock rest time and resume same player',()=>{
 let g=pauseClock(timed(),6000);assert.deepEqual(clockTotals(g,106000),[5000,0]);
 assert.throws(()=>addTurn(g,{balls:1,outcome:'miss'}),/Resume/);
 g=resumeClock(g,106000);g=addTurn(g,{balls:1,outcome:'miss',shots:2},111000);
 assert.deepEqual(g.clock.elapsedMs,[10000,0]);assert.equal(g.events[0].elapsedMs,10000);
});
test('continuation records split time but retain one visit',()=>{
 let g=addTurn(timed(),{balls:14,outcome:'continue',shots:14},15000);
 g=addTurn(g,{balls:3,outcome:'safety',shots:4},23000);
 const v=visitRecords(g,0)[0];assert.equal(v.points,17);assert.equal(v.shots,18);
 assert.equal(v.elapsedMs,22000);assert.equal(v.rows[1].elapsedMs,8000);
});
test('finished clock stops and statistics use known timing denominators',()=>{
 let g=addTurn(timed(),{balls:4,outcome:'miss',shots:5},11000);
 g=finishGame(g,0,'concession',16000);
 assert.deepEqual(clockTotals(g,999999),[10000,5000]);
 const p=playerStats([g]).find(p=>p.name==='甲');
 assert.equal(p.timeMs,10000);assert.equal(p.timedVisits,1);assert.equal(p.visitTimeMs,10000);
 assert.equal(p.timedShots,5);assert.equal(p.shotTimeMs,10000);
});
test('legacy records stay unknown; starting timing midgame is marked partial',()=>{
 let g=start();delete g.clock;g=addTurn(g,{balls:3,outcome:'miss'});
 assert.equal(g.events[0].elapsedMs,null);assert.equal(visitRecords(g,0)[0].timeKnown,false);
 g=resumeClock(g,1000);assert.equal(g.clock.partial,true);
 g=finishGame(g,0,'concession',3000);
 const a=playerStats([g]).find(p=>p.name==='甲');assert.equal(a.timedGames,0);assert.equal(a.timedVisits,0);
});
test('timed JSON roundtrip accepts pause snapshots and rejects corrupt clocks',()=>{
 const g=pauseClock(addTurn(timed(),{balls:2,outcome:'miss',shots:3},4000),6000);
 assert.deepEqual(validateHistory({schemaVersion:1,games:[g]}),[g]);
 const bad=structuredClone(g);bad.clock.elapsedMs[0]=-1;assert.throws(()=>validateHistory({schemaVersion:1,games:[bad]}));
});
test('acknowledged two-foul warning automatically triggers third-foul penalty',()=>{
 let g=turn(start(),0,'foul');g=turn(g,0);g=addTurn(g,{balls:0,outcome:'foul',warningGiven:true});
 assert.equal(stateOf(g).warned[0],true);g=turn(g,0);g=turn(g,0,'foul');
 assert.equal(stateOf(g).scores[0],-18);assert.equal(stateOf(g).rows.at(-1).penalty,16);
});
test('invalid shot counts rejected and new summaries distinguish legacy unknowns',()=>{
 assert.throws(()=>addTurn(start(),{balls:5,outcome:'miss',shots:0}));
 const g=addTurn(start(),{balls:5,outcome:'miss',shots:6});
 assert.equal(visitRecords(g,0)[0].shots,6);assert.equal(visitRecords(g,0)[0].misses,1);
});
test('finished JSON round trips preserve read-only results, including legacy records',()=>{
 let g=finishGame(turn(start(),3),0);delete g.finalized;
 const [loaded]=validateHistory(JSON.parse(JSON.stringify({schemaVersion:1,games:[g]})));
 assert.equal(loaded.finalized,true);assert.equal(loaded.status,'finished');assert.throws(()=>undo(loaded),/read-only/);assert.throws(()=>turn(loaded,1));
});
test('target can be raised or reduced during a game without changing score or player',()=>{
 const g=turn(start(),8),raised=changeTarget(g,150);assert.equal(raised.target,150);assert.equal(raised.status,'active');assert.equal(stateOf(raised).active,1);assert.deepEqual(stateOf(raised).scores,[8,0]);
 const lower=changeTarget(raised,20);assert.equal(lower.status,'active');assert.equal(undo(lower).target,150);
 assert.equal(validateHistory(JSON.parse(JSON.stringify({schemaVersion:1,games:[lower]})))[0].target,20);
});
test('lowering target to a reached score immediately finishes and JSON reload remains read-only',()=>{
 const g=changeTarget(turn(start(),8),5);assert.equal(g.winner,0);assert.equal(g.status,'finished');assert.equal(g.clock.runningSince,null);
 const [loaded]=validateHistory(JSON.parse(JSON.stringify({schemaVersion:1,games:[g]})));assert.equal(loaded.finalized,true);assert.equal(stateOf(loaded).winner,0);assert.throws(()=>changeTarget(loaded,200));
});
test('target changes reject invalid values and a tied finish',()=>{
 let g=turn(start(),5);g=turn(g,5);assert.throws(()=>changeTarget(g,5),/同分/);assert.throws(()=>changeTarget(g,0));assert.throws(()=>changeTarget(g,3.5));
});
