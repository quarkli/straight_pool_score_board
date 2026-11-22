import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,addTurn,finishGame,pauseClock,playerStats} from './engine.js';
import {scoreboardPage,scoringDialog,duration} from './scoreboard.js';
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
