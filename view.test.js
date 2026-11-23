import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,addTurn,finishGame,pauseClock,playerStats,selectOpeningPlayer,stateOf,rackState,undo,resumeClock} from './engine.js';
import {matchStats,scoreboardPage,scoringDialog,duration,inningSummary} from './scoreboard.js';
import {filterHistory,matchHistoryPage,localDate} from './history.js';
test('board has 16 aligned ball rows and two independent scrollable history regions',()=>{
 const g=createGame(['甲','乙']);const html=scoreboardPage(g);
 assert.equal((html.match(/class="ball-row /g)||[]).length,16);
 assert.equal((html.match(/data-pick=/g)||[]).length,32);
 assert.equal((html.match(/class="shot-history"/g)||[]).length,2);
 assert.match(html,/id="wall-clock"/);assert.match(html,/id="match-clock"/);
});
test('swap changes display order, never player identity, turn or score',()=>{
 const g=addTurn(createGame(['甲','乙']),{balls:5,outcome:'miss',shots:6});const original=JSON.stringify(g);
 const html=scoreboardPage(g,{swapped:true});assert.ok(html.indexOf('>乙</button></h1>')<html.indexOf('>甲</button></h1>'));
 assert.equal(JSON.stringify(g),original);assert.doesNotMatch(html,/visit-summary/);assert.match(html,/>5<\/span>/);
});
test('picking five highlights exactly five options on the selected side',()=>{
 const html=scoreboardPage(createGame(['甲','乙']),{selection:{player:0,balls:5}});
 assert.equal((html.match(/score-option chosen/g)||[]).length,5);
});
test('paused board disables scoring, dialog exposes opening penalty and optional shot count',()=>{
 const g=pauseClock(createGame(['甲','乙']));const html=scoreboardPage(g);
 assert.equal((html.match(/data-pick="\d+"[^>]*disabled/g)||[]).length,32);
 assert.match(scoringDialog(g,0),/data-reason="break-foul"/);
 assert.match(scoringDialog(g,5),/id="shot-count"/);
});
test('history defaults to all records and filters local date plus both player names',()=>{
 const a=createGame(['甲','乙']),b=createGame(['甲','丙']);a.startedAt='2026-11-20T12:00:00Z';b.startedAt='2026-11-22T12:00:00Z';
 assert.equal(filterHistory([a,b]).length,2);assert.equal(filterHistory([a,b])[0].id,b.id);
 assert.deepEqual(filterHistory([a,b],{player:'甲',opponent:'乙'}),[a]);
 assert.deepEqual(filterHistory([a,b],{from:localDate(b.startedAt),to:localDate(b.startedAt)}),[b]);
 assert.deepEqual(filterHistory([a,b],{player:'甲',opponent:'甲'}),[]);
});
test('box score puts actual opening player first even when player two broke',()=>{
 const g=createGame(['甲','乙'],100,1);const html=matchHistoryPage([g]);
 assert.ok(html.indexOf('<strong>乙</strong>')<html.indexOf('<strong>甲</strong>'));
 for(const text of ['有效用時','出場數','平均出手得分','平均出手用時','失誤率'])assert.ok(html.includes(text));
});
test('per-shot scoring and miss rate use recorded shots, not scoring-entry count',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:5,outcome:'miss',shots:6});g=finishGame(g,0);
 const p=playerStats([g]).find(p=>p.name==='甲');assert.equal(p.recordedShots,6);assert.equal(p.shotPoints,5);assert.equal(p.shotMisses,1);
 const html=matchHistoryPage([g]);assert.match(html,/0\.83/);assert.match(html,/16\.7%/);
});
test('duration formats unknown time separately from zero and supports hours',()=>{
 assert.equal(duration(null),'未記錄');assert.equal(duration(0),'00:00:00');assert.equal(duration(3661000),'01:01:01');
});

test('ten reproducible demo matches all finish at target 70 with valid clock and shot statistics',async()=>{
 const {readFile}=await import('node:fs/promises');const {validateHistory,stateOf}=await import('./engine.js');
 const data=JSON.parse(await readFile(new URL('./demo-games.json',import.meta.url),'utf8'));
 const games=validateHistory(data);assert.equal(games.length,10);assert.equal(new Set(games.map(g=>g.id)).size,10);
 for(const g of games){assert.equal(g.demo,true);assert.equal(g.target,70);assert.equal(g.status,'finished');assert.equal(stateOf(g).scores[g.winner],70);assert.ok(Date.parse(g.endedAt)>Date.parse(g.startedAt));assert.ok(g.clock.elapsedMs.every(t=>t>0));assert.ok(g.events.every(e=>e.shots>=1));}
 assert.ok(games.some(g=>stateOf(g).three.some(n=>n>0)));
 assert.ok(games.some(g=>stateOf(g).breaking.some(n=>n>0)));
});

test('both sides can start, then inactive scoring controls are replaced by saved score markers',()=>{
 const fresh=createGame(['甲','乙']);const initial=scoreboardPage(fresh);
 assert.equal((initial.match(/data-pick="\d+"[^>]*disabled/g)||[]).length,0);
 assert.equal((initial.match(/data-pick="\d+"[^>]*hidden/g)||[]).length,0);
 const g=addTurn(fresh,{balls:5,outcome:'miss',shots:6});const after=scoreboardPage(g);
 assert.equal((after.match(/data-pick=/g)||[]).length,0);
 assert.equal((after.match(/data-central-end=/g)||[]).length,16);
 assert.equal((after.match(/class="record-dot"/g)||[]).length,5);
});
test('first scorer becomes breaker with all opening elapsed time and cannot change after start',()=>{
 let g=createGame(['甲','乙']);g.clock.elapsedMs=[4000,0];g.clock.runningSince=1000;
 g=selectOpeningPlayer(g,1);assert.equal(g.breaker,1);assert.deepEqual(g.clock.elapsedMs,[0,4000]);
 g=addTurn(g,{balls:5,outcome:'safety',shots:6},6000);
 assert.equal(stateOf(g).rows[0].player,1);assert.equal(stateOf(g).active,0);
 assert.deepEqual(g.clock.elapsedMs,[0,9000]);assert.equal(selectOpeningPlayer(g,0).breaker,1);
});
test('14/15 scoring entries and cumulative visit thresholds have summaries, ordinary scores do not',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:10,outcome:'continue',shots:10});assert.equal(inningSummary(g),'');
 g=addTurn(g,{balls:4,outcome:'continue',shots:4});assert.match(inningSummary(g),/5 秒後自動關閉/);
 g=addTurn(g,{balls:1,outcome:'miss',shots:2});assert.match(inningSummary(g),/15/);
 const other=addTurn(createGame(['甲','乙']),{balls:15,outcome:'safety',shots:16});assert.match(inningSummary(other),/合法進球/);
});

test('score buttons contain white dots without visible numbers',()=>{
 const html=scoreboardPage(createGame(['甲','乙']));
 assert.equal((html.match(/class="option-dot"/g)||[]).length,32);
 assert.ok(!html.includes('<span>分</span></button>'));
});

test('inactive saved dots survive a zero-point handoff at the end of the same inning',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:7,outcome:'continue',shots:7});
 g=addTurn(g,{balls:0,outcome:'safety',shots:1});
 const html=scoreboardPage(g);
 assert.equal((html.match(/class="record-dot"/g)||[]).length,7);
 assert.equal((html.match(/data-pick=/g)||[]).length,0);
 assert.equal((html.match(/data-central-end=/g)||[]).length,16);
 assert.ok(!html.includes('data-pick="0" data-player="0"'));
});
test('completed games keep both player score dots and expose no scoring buttons',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:5,outcome:'miss',shots:6});
 g=addTurn(g,{balls:3,outcome:'miss',shots:4});g=finishGame(g,0);
 const html=scoreboardPage(g);assert.equal((html.match(/class="record-dot"/g)||[]).length,8);
 assert.equal((html.match(/data-pick=/g)||[]).length,0);
});

test('rack ownership persists across handoffs: left 1-3 then right 4-6',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:3,outcome:'miss',shots:4,rackEnd:3});
 g=addTurn(g,{balls:3,outcome:'safety',shots:4,rackEnd:6});
 assert.deepEqual(stateOf(g).scores,[3,3]);const rack=rackState(g);
 assert.deepEqual(rack.owners.slice(1,7),[0,0,0,1,1,1]);
 const html=scoreboardPage(g);assert.equal((html.match(/class="record-dot"/g)||[]).length,6);
 assert.equal((html.match(/data-pick=/g)||[]).length,0);assert.equal((html.match(/data-central-end=/g)||[]).length,16);
});
test('undo restores prior score, shooter and rack marks instead of removing the full rack',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:3,outcome:'miss',shots:4,rackEnd:3});
 g=addTurn(g,{balls:3,outcome:'safety',shots:4,rackEnd:6});g=undo(g);
 assert.deepEqual(stateOf(g).scores,[3,0]);assert.equal(stateOf(g).active,1);
 assert.equal(rackState(g).count,3);assert.deepEqual(rackState(g).owners.slice(1,4),[0,0,0]);
});
test('rack summary at 14 keeps marks until dismissed then starts empty next rack',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:3,outcome:'miss',shots:4,rackEnd:3});
 g=addTurn(g,{balls:11,outcome:'continue',shots:11,rackEnd:14});
 assert.equal(rackState(g).count,14);assert.match(inningSummary(g),/甲/);assert.match(inningSummary(g),/乙/);
 g.rackClearedAt=g.events.length;
 assert.equal(rackState(g).count,0);assert.equal(rackState(g).number,2);
 g=addTurn(g,{balls:2,outcome:'miss',shots:3,rackEnd:2});
 assert.equal(rackState(g).count,2);assert.deepEqual(rackState(g).owners.slice(1,3),[1,1]);
});
test('all 15 object balls have ownership and zero scoring never removes prior rack marks',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:3,outcome:'miss',shots:4,rackEnd:3});
 g=addTurn(g,{balls:0,outcome:'safety',shots:1});assert.equal(rackState(g).count,3);
 g=addTurn(g,{balls:12,outcome:'continue',shots:12,rackEnd:15});assert.equal(rackState(g).count,15);
 assert.deepEqual(rackState(g).owners.slice(1,4),[0,0,0]);assert.deepEqual(rackState(g).owners.slice(4),Array(12).fill(0));
});

test('completed legacy rack does not block selecting the next rack first ball',()=>{
 const g=addTurn(createGame(['甲','乙']),{balls:15,outcome:'continue',shots:15});
 const html=scoreboardPage(g);assert.match(html,/data-central-end="1"[^>]*>(?!disabled)/);
 const button=html.match(/<button[^>]*data-central-end="1"[^>]*>/)[0];assert.ok(!button.includes('disabled'));
});
test('rack ownership remains scattered and safety marks last scored ball only',()=>{
 let g=createGame(['甲','乙']);
 for(const [balls,outcome,rackEnd] of [[3,'miss',3],[4,'miss',7],[1,'safety',8],[1,'miss',9],[1,'miss',10]])g=addTurn(g,{balls,outcome,rackEnd});
 const html=scoreboardPage(g);
 assert.deepEqual(rackState(g).owners.slice(1,11),[0,0,0,1,1,1,1,0,1,0]);
 assert.match(html,/data-record-player="0" data-record-score="8"[^]*?aria-label="安全球"/);
 assert.equal((html.match(/class="turn-mark"/g)||[]).length,1);
 assert.equal((html.match(/data-pick=/g)||[]).length,0);
});
test('zero scoring safety and foul mark the cue-ball position without score dots',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:0,outcome:'safety'});
 g=addTurn(g,{balls:0,outcome:'foul'});
 const html=scoreboardPage(g);
 assert.equal((html.match(/class="record-dot"/g)||[]).length,0);
 assert.equal((html.match(/class="turn-mark"/g)||[]).length,2);
 assert.match(html,/data-record-player="0" data-record-score="0"[^]*?aria-label="安全球">△/);
 assert.match(html,/data-record-player="1" data-record-score="0"[^]*?aria-label="犯規">×/);
});
test('interrupted games preserve scores and timing without a winner or win-rate impact',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:3,outcome:'miss',rackEnd:3});
 g=finishGame(g,null,'interrupted');
 assert.equal(g.winner,null);assert.equal(g.status,'finished');
 assert.deepEqual(stateOf(g).scores,[3,0]);assert.equal(g.clock.runningSince,null);
 assert.match(matchHistoryPage([g],{}),/中斷比賽（不判勝負）/);
 assert.deepEqual(playerStats([g]),[]);
});
test('undo restores completed rack ownership instead of clearing it through a stale rack marker',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:5,outcome:'miss',rackEnd:5});
 g=addTurn(g,{balls:9,outcome:'continue',rackEnd:14});g.rackClearedAt=g.events.length;
 g=addTurn(g,{balls:2,outcome:'miss',rackEnd:2});g=undo(g);
 assert.deepEqual(stateOf(g).scores,[5,9]);assert.equal(rackState(g).count,14);
 assert.equal(rackState(g).owners[5],0);assert.equal(rackState(g).owners[14],1);
 assert.equal(stateOf(g).rows.length,2);assert.equal(g.rackClearedAt,undefined);
});
test('target limit uses active player score and rack count and recomputes after handover',()=>{
 let g=addTurn(createGame(['甲','乙'],10),{balls:3,outcome:'miss',rackEnd:3});
 g=addTurn(g,{balls:3,outcome:'miss',rackEnd:6});
 let html=scoreboardPage(g);assert.match(html,/data-central-end="13"  aria-label/);assert.match(html,/data-central-end="14" hidden/);
 g=addTurn(g,{balls:1,outcome:'miss',rackEnd:7});html=scoreboardPage(g);
 assert.match(html,/data-central-end="14"  aria-label/);assert.match(html,/data-central-end="15" hidden/);
});
test('winning score finishes midrack with stopped clock and correct totals',()=>{
 let g=addTurn(createGame(['甲','乙'],10),{balls:3,outcome:'miss',rackEnd:3});
 g=addTurn(g,{balls:2,outcome:'miss',rackEnd:5});g=addTurn(g,{balls:7,outcome:'win',rackEnd:12});
 assert.equal(g.status,'finished');assert.equal(g.winner,0);assert.equal(g.clock.runningSince,null);assert.deepEqual(stateOf(g).scores,[10,2]);
});
test('three-foul continuation resets count but preserves rack and transfers shooter, including JSON replay',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:3,outcome:'miss',rackEnd:3});
 for(let i=0;i<3;i++){
  g=addTurn(g,{balls:0,outcome:'foul',warned:i===2,thirdChoice:i===2?'continue':'rerack'});
  if(i<2)g=addTurn(g,{balls:0,outcome:'miss'});
 }
 const s=stateOf(g);assert.equal(s.active,0);assert.equal(s.opening,false);assert.equal(s.fouls[1],0);assert.equal(s.scores[1],-18);assert.equal(rackState(g).count,3);assert.equal(rackState(g).owners[1],0);
});
test('appearance labels remain distinct from restored estimated shot statistics',()=>{
 const g=addTurn(createGame(['甲','乙']),{balls:3,outcome:'miss',shots:4});
 const html=matchHistoryPage([g]);assert.match(html,/<th>出場數<\/th>/);assert.match(html,/<th>出手<\/th>/);assert.match(html,/出手次數預設為估算/);
 assert.match(scoringDialog(g,3),/本次出手次數（預估，可修改）/);
 assert.match(scoreboardPage(g),/class="visit-title">#1/);
});
test('history supports per-record and filtered bulk deletion controls',()=>{
 const a=createGame(['甲','乙']),b=createGame(['丙','丁']);
 const html=matchHistoryPage([a,b],{player:'甲'});
 assert.match(html,/data-delete-all="games"/);assert.match(html,/data-delete-selected="games" disabled/);
 assert.equal((html.match(/data-delete-check="games"/g)||[]).length,1);
 assert.match(html,new RegExp('data-delete-id="'+a.id+'"'));assert.doesNotMatch(html,new RegExp('data-delete-id="'+b.id+'"'));
});
test('completed scoreboard reuses finish button and disables score changes',()=>{
 const g=finishGame(createGame(['甲','乙']),0),html=scoreboardPage(g);
 assert.match(html,/比賽結束 · 甲 獲勝 · 唯讀/);
 assert.match(html,/data-action="undo" disabled/);
 assert.match(html,/data-action="finish"[^>]*>結束比賽/);
 assert.doesNotMatch(html,/>再來一場<|>結束<\/button>/);
});
test('scoreboard opens current-match statistics and uses only this game for both players',()=>{
 let g=addTurn(createGame(['本場甲','本場乙']),{balls:3,outcome:'miss',shots:4});
 g=addTurn(g,{balls:2,outcome:'safety',shots:3});
 const html=matchStats(g);assert.match(html,/本場甲/);assert.match(html,/本場乙/);assert.match(html,/淨得分<\/th><td>3<\/td><td>2<\/td>/);assert.match(html,/出場數<\/th><td>1<\/td><td>1<\/td>/);assert.match(html,/安全球<\/th><td>0<\/td><td>1<\/td>/);
 assert.match(scoreboardPage(g),/data-action="match-stats"[^>]*>統計分析/);
 assert.doesNotMatch(scoreboardPage(g),/href="#stats">統計分析/);
 assert.match(matchStats(finishGame(g,0)),/比賽結束 · 唯讀紀錄/);
});

test('zero-point handovers and negative foul scores do not expand a ten-point picker',()=>{
 let g=createGame(['甲','乙'],10);
 const visibleEnds=game=>[...scoreboardPage(game).matchAll(/data-central-end="(\d+)" (?!hidden)/g)].map(m=>Number(m[1]));
 g=addTurn(g,{balls:0,outcome:'miss'});
 assert.deepEqual(visibleEnds(g),Array.from({length:11},(_,i)=>i));
 for(let i=0;i<4;i++){
  g=addTurn(g,{balls:0,outcome:'foul'});
  assert.deepEqual(visibleEnds(g),Array.from({length:11},(_,i)=>i));
  g=addTurn(g,{balls:0,outcome:'safety'});
  assert.deepEqual(visibleEnds(g),Array.from({length:11},(_,i)=>i));
 }
 assert.ok(stateOf(g).scores.some(score=>score<0));
 g=JSON.parse(JSON.stringify(g));
 assert.deepEqual(visibleEnds(g),Array.from({length:11},(_,i)=>i));
});
test('foul display cap still allows recovery of negative points using cumulative rack positions',()=>{
 let g=addTurn(createGame(['甲','乙'],10),{balls:0,outcome:'miss'});
 g=addTurn(g,{balls:0,outcome:'foul'});
 g=addTurn(g,{balls:0,outcome:'miss'});
 g=addTurn(g,{balls:10,outcome:'continue',rackEnd:10});
 assert.equal(stateOf(g).scores[1],9);
 assert.match(scoreboardPage(g),/data-central-end="11"  aria-label/);
 g=addTurn(g,{balls:1,outcome:'win',rackEnd:11});
 assert.equal(g.status,'finished');assert.equal(stateOf(g).scores[1],10);
});

test('compact appearance entries use points, points-minus-penalty and points-S without old summaries',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:6,outcome:'miss'});
 g=addTurn(g,{balls:5,outcome:'foul'});
 g=addTurn(g,{balls:7,outcome:'safety'});
 const html=scoreboardPage(g);
 assert.match(html,/>6<\/span>/);assert.match(html,/>5-1<\/span>/);assert.match(html,/>7S<\/span>/);
 assert.doesNotMatch(html,/visit-summary|得分／失誤／出手|<em>失誤不進/);
 const opening=scoreboardPage(addTurn(createGame(['甲','乙']),{balls:0,outcome:'break-foul'}));
 assert.match(opening,/>0-2<\/span>/);
});
test('match and history show defensive and rack-opening success rates with counts',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:2,outcome:'safety'});g=addTurn(g,{balls:0,outcome:'miss'});
 for(const html of [matchStats(g),matchHistoryPage([g],{})]){assert.match(html,/防守成功率/);assert.match(html,/開局成功率/);assert.match(html,/100\.0%（1／1）/);assert.match(html,/0\.0%（0／1）/);}
});

test('breaker label appears only after first confirmed score and follows identity when swapped',()=>{
 const initial=createGame(['甲','乙']);assert.doesNotMatch(scoreboardPage(initial),/breaker-label/);
 let g=addTurn(selectOpeningPlayer(initial,1),{balls:0,outcome:'safety'});
 for(const swapped of [false,true]){const html=scoreboardPage(g,{swapped});assert.equal((html.match(/class="breaker-label"/g)||[]).length,1);assert.match(html,/>乙<\/button><\/h1><span class="breaker-label">（先攻）<\/span>/);}
 g=addTurn(g,{balls:3,outcome:'miss'});assert.match(scoreboardPage(g),/>乙<\/button><\/h1><span class="breaker-label">（先攻）/);
});

test('scoring header underlines the active display side and follows swap and handover',()=>{
 const initial=createGame(['甲','乙']);assert.doesNotMatch(scoreboardPage(initial),/class="active-scoring-side"/);
 let g=addTurn(initial,{balls:2,outcome:'miss'});
 assert.match(scoreboardPage(g),/class="active-scoring-side" aria-current="true">右側記分/);
 assert.match(scoreboardPage(g,{swapped:true}),/class="active-scoring-side" aria-current="true">左側記分/);
 g=addTurn(g,{balls:0,outcome:'safety'});assert.match(scoreboardPage(g),/class="active-scoring-side" aria-current="true">左側記分/);
 assert.doesNotMatch(scoreboardPage(finishGame(g,0)),/class="active-scoring-side"/);
});

test('ready board replaces setup with editable names and start button while all play controls are disabled',()=>{
 const g={...pauseClock(createGame(['A','B'])),status:'ready'},html=scoreboardPage(g);
 assert.match(html,/data-action="start"/);assert.doesNotMatch(html,/setup-form/);assert.equal((html.match(/data-edit-player=/g)||[]).length,2);
 assert.equal((html.match(/data-pick="\d+"[^>]*disabled/g)||[]).length,32);
 assert.match(html,/data-action="clock" disabled/);assert.match(html,/data-handicap-player="0"[^>]*disabled/);
});

test('zero-point handover annotates the current ball on the shooters side without claiming ownership',()=>{
 let g=addTurn(createGame(['甲','乙']),{balls:3,outcome:'miss',rackEnd:3});
 g=addTurn(g,{balls:0,outcome:'safety'});
 let html=scoreboardPage(g),cell=html.match(/<span class="score-record mark-only"[^>]*data-record-player="1" data-record-score="3"[^]*?<\/span><\/span>/)[0];
 assert.match(cell,/>△<\/span>/);assert.doesNotMatch(cell,/record-dot/);assert.equal((html.match(/class="record-dot"/g)||[]).length,3);
 g=addTurn(g,{balls:0,outcome:'foul'});html=scoreboardPage(g);assert.equal((html.match(/class="record-dot"/g)||[]).length,3);
 assert.match(html,/data-record-player="0" data-record-score="3"[^]*?aria-label="犯規">×/);
 const reversed=scoreboardPage(g,{swapped:true});assert.match(reversed,/class="score-record mark-only" style="grid-column:1" data-record-player="1" data-record-score="3"/);
 g=undo(g);html=scoreboardPage(g);assert.doesNotMatch(html,/aria-label="犯規">×/);assert.match(html,/aria-label="安全球">△/);
});
