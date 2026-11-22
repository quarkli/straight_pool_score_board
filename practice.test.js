import test from 'node:test';import assert from 'node:assert/strict';
import {practiceRecord,practiceMetrics,practiceRack,practiceUndo,practiceElapsed,practiceAnalysis} from './practice.js';
const session=()=>({id:'practice',status:'active',name:'甲',events:[],elapsedMs:0,runningSince:1000});
test('practice keeps the same player and combines runs across racks',()=>{let s=practiceRecord(session(),14,'continue',14,'',2000);s=practiceRecord(s,3,'miss',4,'長台',3000);const m=practiceMetrics(s);assert.equal(m.high,17);assert.equal(m.points,17);assert.equal(m.misses,1);assert.equal(m.shots,18);assert.equal(m.run,0);assert.equal(s.events[1].note,'長台');assert.equal(practiceRack(s),3);});
test('zero misses and fouls are recorded separately and timing excludes pauses',()=>{let s=practiceRecord(session(),0,'miss',1,'',2000);s={...s,runningSince:null};assert.equal(practiceElapsed(s,9000),1000);assert.throws(()=>practiceRecord(s,1,'miss',2));s={...s,runningSince:9000};s=practiceRecord(s,0,'foul',1,'',10000);const m=practiceMetrics(s);assert.equal(m.balls,0);assert.equal(m.points,-1);assert.equal(m.misses,1);assert.equal(m.fouls,1);assert.equal(s.elapsedMs,2000);assert.equal(s.events[1].elapsedMs,1000);});
test('undo removes scoring and rack state while retaining total elapsed time',()=>{let s=practiceRecord(session(),15,'continue',15,'',2000);assert.equal(practiceRack(s),0);s=practiceUndo(s,2500);assert.equal(s.events.length,0);assert.equal(practiceMetrics(s).points,0);assert.equal(practiceElapsed(s,2500),1500);});

test('live practice analysis includes active scoring, excludes other players and immediately reflects undo',()=>{
 const saved={...practiceRecord(session(),3,'miss',4,'',2000),status:'finished'};
 let current=practiceRecord({...session(),id:'current'},5,'continue',5,'',3000);
 const other={...saved,id:'other',name:'乙'};
 let a=practiceAnalysis([saved,current,other],'甲');assert.equal(a.total,8);assert.equal(a.shots,9);assert.equal(a.misses,1);assert.equal(a.completed,1);assert.equal(a.time,3000);
 current=practiceRecord(current,2,'foul',3,'',4000);a=practiceAnalysis([saved,current,other],'甲');assert.equal(a.total,10);assert.equal(a.metrics[1].points,6);assert.equal(a.metrics[1].high,7);
 current=practiceUndo(current,4500);a=practiceAnalysis([saved,current,other],'甲');assert.equal(a.total,8);assert.equal(a.shots,9);assert.equal(a.time,3000);
});
