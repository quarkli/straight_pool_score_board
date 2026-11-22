import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,addTurn,finishGame,pauseClock,playerStats,selectOpeningPlayer,stateOf} from './engine.js';
import {scoreboardPage,scoringDialog,duration,inningSummary} from './scoreboard.js';
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
 const html=scoreboardPage(g,{swapped:true});assert.ok(html.indexOf('<h1>乙</h1>')<html.indexOf('<h1>甲</h1>'));
 assert.equal(JSON.stringify(g),original);assert.match(html,/\(5／1／6\)/);
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
 for(const text of ['有效用時','平均出手得分','平均出手用時','失誤率'])assert.ok(html.includes(text));
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

test('before first recorded turn both sides can score; after handoff inactive buttons are hidden',()=>{
 const fresh=createGame(['甲','乙']);const initial=scoreboardPage(fresh);
 assert.equal((initial.match(/data-pick="\d+"[^>]*disabled/g)||[]).length,0);
 assert.equal((initial.match(/data-pick="\d+"[^>]*hidden/g)||[]).length,0);
 const g=addTurn(fresh,{balls:5,outcome:'miss',shots:6});const after=scoreboardPage(g);
 assert.equal((after.match(/data-pick="\d+"[^>]*hidden/g)||[]).length,16);
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
 const other=addTurn(createGame(['甲','乙']),{balls:15,outcome:'safety',shots:16});assert.match(inningSummary(other),/顆合法進球/);
});

test('score buttons contain white dots without visible numbers',()=>{
 const html=scoreboardPage(createGame(['甲','乙']));
 assert.equal((html.match(/class="option-dot"/g)||[]).length,32);
 assert.ok(!html.includes('<span>分</span></button>'));
});
