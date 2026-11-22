import {practicePage,bindPractice,updatePracticeClock} from './practice.js?v=20261122.15';
import {createGame,stateOf,addTurn,finishGame,undo,validateHistory,playerStats,tacticalStats,pauseClock,resumeClock,clockTotals,selectOpeningPlayer,rackState} from './engine.js?v=20261122.15';
import {rulesPage,tableDiagram} from './rules.js?v=20261122.15';
import {scoreboardPage,scoringDialog,duration,inningSummary} from './scoreboard.js?v=20261122.15';
import {matchHistoryPage} from './history.js?v=20261122.15';
let historyFilters={from:'',to:'',player:'',opponent:''};
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='straight-pool-v1',PREF='straight-pool-players-v1';let games=[],current=null,scenario='normal',fileHandle=null,filterPlayer='',filterOpponent='';
const names={miss:'失誤換手',safety:'安全球',foul:'一般犯規',scratch:'母球洗袋／飛出台','break-foul':'開球失誤',continue:'繼續此局',win:'達標獲勝'};
let storageError='',swapped=false,selection=null,summaryTimeout=null,rackSummaryPending=null;
try{swapped=localStorage.getItem('straight-pool-swap')==='true';}catch{}
try{const raw=localStorage.getItem(KEY);if(raw)games=validateHistory(JSON.parse(raw));current=games.find(g=>g.status==='active')?.id||null;}catch(e){storageError='無法載入儲存資料，請先匯出備份再繼續。原始資料未覆蓋。';}
function notify(text){$('#toast').textContent=text;$('#toast').style.display='block';clearTimeout(notify.t);notify.t=setTimeout(()=>$('#toast').style.display='none',4500);}
function currentGame(){return games.find(g=>g.id===current);}
function payload(){return {schemaVersion:1,app:'straight_pool_score_board',exportedAt:new Date().toISOString(),games};}
async function save(){try{if(storageError)throw Error(storageError);localStorage.setItem(KEY,JSON.stringify(payload()));}catch(e){notify('瀏覽器儲存失敗，請立即匯出 JSON 備份。');return false;}if(fileHandle)try{const w=await fileHandle.createWritable();await w.write(JSON.stringify(payload(),null,2));await w.close();}catch{notify('JSON 檔案未更新，請重新選擇檔案或下載備份。');fileHandle=null;}return true;}
function put(g){const i=games.findIndex(x=>x.id===g.id);if(i<0)games.push(g);else games[i]=g;current=g.id;save();render();}
function exportJSON(list=games){const data=storageError?localStorage.getItem(KEY):JSON.stringify({...payload(),games:list},null,2);const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`straight-pool-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notify('JSON 備份已下載。');}
function head(kicker,title,desc,actions=''){return `<div class="page-head"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${desc}</p></div><div class="actions">${actions}</div></div>`;}
function btn(action,text,kind=''){return `<button class="btn ${kind}" data-action="${action}">${text}</button>`;}
function setup(){let pref=['',''];try{pref=JSON.parse(localStorage.getItem(PREF)||'["",""]');}catch{}return head('YOUR NEXT RUN','每一桿，都算數。','14.1 連續撞球，從這裡開始。',btn('export','匯出 JSON'))+`<section class="card setup"><div class="intro-table">${tableDiagram({full:true,object:null,cue:[110,140]})}</div><h2>開始一場比賽</h2><p class="sub">設定雙方球員與目標分數，姓名會自動記住。</p><form id="setup-form" class="section"><div class="form-grid"><label>球員一<input name="p0" maxlength="40" required autocomplete="off" placeholder="輸入姓名" value="${esc(pref[0])}"></label><label>球員二<input name="p1" maxlength="40" required autocomplete="off" placeholder="輸入姓名" value="${esc(pref[1])}"></label><label>目標分數<input name="target" type="number" min="1" max="10000" step="1" value="100" required></label><div class="opening-note"><strong>開球選手</strong><p>進入記分板後，左右都能開始記分。先記分者自動成為開球選手。</p></div></div><div id="form-error" class="error" role="alert"></div><button class="btn primary big-action" ${storageError?'disabled':''}>開始比賽</button></form><p class="note">自動保存進度，可隨時離開再回來。每局結束後建議下載 JSON 備份。</p></section>`;}
function ledger(g){const s=stateOf(g);return `<div class="scroll-table"><table><thead><tr><th>局次</th><th>球員</th><th>進球</th><th>結果</th><th>扣分</th><th>淨得分</th><th>累計</th></tr></thead><tbody>${s.rows.length?s.rows.map(r=>`<tr><td>${r.visit}</td><td class="name">${esc(g.players[r.player])}</td><td>${r.balls}</td><td>${names[r.outcome]}${r.third?' · 三犯追加':''}${r.rebreak?' · 重開':''}${r.note?`<div class="note">${esc(r.note)}</div>`:''}</td><td class="negative">${r.penalty?`−${r.penalty}`:'—'}</td><td class="${r.net<0?'negative':'positive'}">${r.net>0?'+':''}${r.net}</td><td><strong>${r.total}</strong></td></tr>`).join(''):'<tr><td colspan="7" class="empty">第一桿，準備好了嗎？</td></tr>'}</tbody></table></div>`;}
function scorePage(){const g=currentGame();return g?scoreboardPage(g,{swapped,selection}):setup();}
function chart(g){const s=stateOf(g);if(!s.rows.length)return '<div class="empty">尚無計分資料</div>';const series=[[0],[0]],scores=[0,0];s.rows.forEach(r=>{scores[r.player]=r.total;series.forEach((a,i)=>a.push(scores[i]));});const lo=Math.min(0,...series.flat()),hi=Math.max(1,...series.flat()),x=i=>48+i*650/Math.max(1,s.rows.length),y=v=>235-(v-lo)*195/(hi-lo);return `<div class="chart-legend">${g.players.map((n,i)=>`<span style="color:${i?'#a87732':'#21634a'}">● ${esc(n)}</span>`).join('')}</div><div class="chart-wrap"><svg class="chart" viewBox="0 0 740 280" role="img" aria-label="本場雙方累積分數走勢，依記錄先後排列">${[0,1,2,3,4].map(i=>{const v=lo+(hi-lo)*i/4;return `<line x1="48" x2="700" y1="${y(v)}" y2="${y(v)}" stroke="#e2e8e1"/><text x="38" y="${y(v)+4}" text-anchor="end" font-size="12" fill="#71847b">${Math.round(v)}</text>`;}).join('')}${series.map((a,i)=>`<polyline points="${a.map((v,j)=>`${x(j)},${y(v)}`).join(' ')}" stroke="${i?'#b78a47':'#21634a'}" fill="none" stroke-width="3"/>`).join('')}<text x="370" y="270" text-anchor="middle" fill="#71847b" font-size="12">記錄順序（含局內分段記錄）</text></svg></div>`;}
const rate=(n,d)=>d?`${(n/d*100).toFixed(1)}%`:'—';
function tacticsTable(players){
 return `<div class="scroll-table"><table><thead><tr><th>球員</th><th>失誤換手</th><th>失誤換手率</th><th>零進球局</th><th>安全球次數</th><th>可評估／總安全球</th><th>安全球後被得分率</th><th>安全球後平均失分</th><th>安全球後未失分率</th><th>安全球後對手犯規率</th></tr></thead><tbody>${players.map(p=>`<tr><td class="name">${esc(p.name)}</td><td>${p.misses}</td><td>${rate(p.misses,p.completedVisits)}</td><td>${p.zeroVisits}／${p.completedVisits}</td><td>${p.safeties}</td><td>${p.safetyEvaluated}／${p.safeties}</td><td>${rate(p.safetyScoredAgainst,p.safetyEvaluated)}</td><td>${p.safetyEvaluated?(p.safetyBallsAgainst/p.safetyEvaluated).toFixed(2):'—'}</td><td>${rate(p.safetyHeld,p.safetyEvaluated)}</td><td>${rate(p.safetyOpponentFouls,p.safetyEvaluated)}</td></tr>`).join('')}</tbody></table></div>`;
}
function tacticsSection(players,title='失誤與防守分析'){
 return `<section class="card section"><h2>${title}</h2>${players.length?tacticsTable(players):'<div class="empty">完成比賽後，失誤與安全球數據會自動出現在這裡。</div>'}<details class="section"><summary>統計怎麼算？</summary><p class="note">失誤換手只計選擇「失誤換手」的已結束局；安全球與犯規分開統計。失誤換手率＝失誤換手局數 ÷ 已結束局數，不是逐桿進球失誤率；若合法開球未進球，請選「安全球」記錄防守開球。零進球局包含安全球、犯規與失誤，但不包含尚未結束的局。</p><p class="note">防守效果觀察安全球後，對手緊接著的完整一局，會合併「繼續此局」的分段與跨球堆得分。對手曾合法進球即算「被得分」，不以扣分後的淨分判斷；平均失分指對手合法進球數，不扣對手犯規罰分。對手犯規率指下一局以犯規結束的比例，不代表一定由防守造成。</p><p class="note">所有防守比率與平均值只用「可評估安全球」作分母；對手尚未完成一局、直接認輸或沒有下一局記錄者，不會當成防守成功。被得分不直接等於防守失敗；對手可能打進高難度球。舊紀錄只要有正確選擇結束方式，即可自動回算。</p></details></section>`;
}
function statsPage(){let finished=games.filter(g=>g.status==='finished'&&g.reason!=='interrupted');const allNames=[...new Set(finished.flatMap(g=>g.players))].sort();let chosen=finished.filter(g=>(!filterPlayer||g.players.includes(filterPlayer))&&(!filterOpponent||g.players.includes(filterOpponent))&&(!filterPlayer||!filterOpponent||filterPlayer!==filterOpponent));let stats=playerStats(chosen);if(filterPlayer)stats=stats.filter(a=>a.name.toLowerCase()===filterPlayer.toLowerCase());const turns=chosen.reduce((n,g)=>n+stateOf(g).visits.reduce((a,b)=>a+b,0),0),balls=chosen.reduce((n,g)=>n+stateOf(g).balls.reduce((a,b)=>a+b,0),0),high=Math.max(0,...chosen.flatMap(g=>stateOf(g).high));return head('KNOW YOUR GAME','從紀錄，看見進步。','依已完成比賽分析球員表現。',btn('export','匯出 JSON'))+`<div class="filter-row"><label>球員<select id="filter-player"><option value="">全部球員</option>${allNames.map(n=>`<option ${n===filterPlayer?'selected':''}>${esc(n)}</option>`).join('')}</select></label><label>對戰對象<select id="filter-opponent"><option value="">所有對手</option>${allNames.map(n=>`<option ${n===filterOpponent?'selected':''}>${esc(n)}</option>`).join('')}</select></label></div><div class="metric-grid">${[['完成比賽',chosen.length],['合法進球',balls],['最高連續得分',high],['平均每局進球',turns?(balls/turns).toFixed(2):'—']].map(([t,v])=>`<div class="metric"><span>${t}</span><strong>${v}</strong></div>`).join('')}</div><section class="card"><h2>球員表現</h2>${stats.length?`<div class="scroll-table"><table><thead><tr><th>球員</th><th>場次</th><th>勝場</th><th>勝率</th><th>淨得分</th><th>最高連續</th><th>每局進球</th><th>犯規／局</th><th>扣分</th><th>平均出手得分</th><th>失誤率</th></tr></thead><tbody>${stats.map(p=>`<tr><td class="name">${esc(p.name)}</td><td>${p.games}</td><td>${p.wins}</td><td>${(p.wins/p.games*100).toFixed(0)}%</td><td>${p.points}</td><td>${p.high}</td><td>${p.visits?(p.balls/p.visits).toFixed(2):'—'}</td><td>${p.visits?(p.fouls/p.visits).toFixed(2):'—'}</td><td>${p.penalties}</td><td>${p.recordedShots?(p.shotPoints/p.recordedShots).toFixed(2):'未記錄'}</td><td>${p.recordedShots?rate(p.shotMisses,p.recordedShots):'未記錄'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">還沒有完成的比賽。打一場，數據就會出現在這裡。</div>'}<p class="note">每局進球＝合法進球 ÷ 上場次數（含零分局）；最高連續得分會合併同一局的分段記錄。球員名稱以忽略大小寫方式彙總。出手平均得分＝有出手次數之記錄的淨得分 ÷ 出手數；失誤率＝其中的失誤不進次數 ÷ 出手數，安全球與犯規另計。舊版缺少出手數的記錄不列入出手指標。</p></section>${tacticsSection(stats)}${timeStatsSection(stats)}${chosen.length?`<section class="card section"><h2>比賽分數走勢</h2><label>選擇比賽<select id="chart-game">${chosen.slice().reverse().map(g=>`<option value="${esc(g.id)}">${esc(g.players.join(' vs '))} · ${new Date(g.startedAt).toLocaleDateString('zh-TW')}</option>`).join('')}</select></label><div id="chart-area" class="section">${chart(chosen.at(-1))}</div></section><section class="card section"><h2>每場進步紀錄</h2><div class="scroll-table"><table><thead><tr><th>日期</th><th>對戰</th><th>比分</th><th>勝者</th><th>最高連續</th></tr></thead><tbody>${chosen.slice().reverse().map(g=>{const s=stateOf(g);return `<tr><td>${new Date(g.startedAt).toLocaleDateString('zh-TW')}</td><td class="name">${esc(g.players.join(' ／ '))}</td><td>${s.scores.join(' : ')}</td><td>${esc(g.players[g.winner])}</td><td>${s.high.join(' ／ ')}</td></tr>`;}).join('')}</tbody></table></div></section>`:''}`;}
function timeStatsSection(players){return `<section class="card section"><h2>用時分析</h2>${players.length?`<div class="scroll-table"><table><thead><tr><th>球員</th><th>完整計時場次</th><th>累計比賽用時</th><th>平均每場用時</th><th>平均每局用時</th><th>有計時局數</th><th>平均每次出手</th><th>有計時出手數</th></tr></thead><tbody>${players.map(p=>`<tr><td class="name">${esc(p.name)}</td><td>${p.timedGames}</td><td>${p.timedGames?duration(p.timeMs):'未記錄'}</td><td>${p.timedGames?duration(p.timeMs/p.timedGames):'未記錄'}</td><td>${p.timedVisits?duration(p.visitTimeMs/p.timedVisits):'未記錄'}</td><td>${p.timedVisits}</td><td>${p.timedShots?duration(p.shotTimeMs/p.timedShots):'未記錄'}</td><td>${p.timedShots}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">完成有計時的比賽後，會顯示雙方的用時分析。</div>'}<p class="note">休息不計時。累計與每場平均只採完整計時場次；每局平均只採已結束且用時完整的局。每次出手平均＝有計時記錄的用時 ÷ 記錄的出手次數；出手數可在記分視窗修正。舊版或中途啟用計時的資料不會當成零用時。未按休息而離開網頁，計時仍持續。</p></section>`;}
function historyPage(){return matchHistoryPage(games,historyFilters);}
function render(){const route=location.hash.slice(1)||'score';document.body.classList.toggle('score-screen',route==='score'&&!!currentGame());document.querySelectorAll('nav a').forEach(a=>{a.classList.toggle('active',a.hash===`#${route}`);if(a.hash===`#${route}`)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});$('#app').innerHTML=(storageError?`<div class="alert">${storageError}</div>`:'')+({rules:()=>rulesPage(scenario),stats:statsPage,history:historyPage,practice:practicePage,score:scorePage}[route]||scorePage)();bind();updateClocks();}
function extra(){const select=$('#outcome');if(!select)return;const g=currentGame(),s=stateOf(g),o=select.value;$('#extra-options').innerHTML=o==='break-foul'?'<label class="checkline"><input type="checkbox" name="rebreak">對手要求原球員重新開球（不勾選則對手接收球位）</label>':(o==='foul'||o==='scratch')&&s.fouls[s.active]>=2?'<label class="checkline"><input type="checkbox" name="warned">這一桿前，已明確告知球員處於兩犯（勾選才追加扣 15 分）</label>':'';}
function modal(html,title='比賽設定'){delete $('#modal').dataset.playerTone;$('#modal').innerHTML=`<div class="dialog-head"><h2>${title}</h2><button class="btn" data-close>關閉</button></div>${html}`;$('#modal').showModal();$('[data-close]').onclick=()=>$('#modal').close();}
function bind(){
 bindPractice(render,notify);
 for(const [field,key] of [['history-from','from'],['history-to','to'],['history-player','player'],['history-opponent','opponent']]){document.getElementById(field)?.addEventListener('change',e=>{historyFilters[key]=e.target.value;render();});}

 $('#setup-form')?.addEventListener('submit',e=>{e.preventDefault();try{const f=new FormData(e.target),g=createGame([f.get('p0'),f.get('p1')],Number(f.get('target')),0);localStorage.setItem(PREF,JSON.stringify(g.players));put(g);}catch(e){$('#form-error').textContent=translateError(e.message);}});
 $('#turn-form')?.addEventListener('submit',e=>{e.preventDefault();try{const f=new FormData(e.target),g=addTurn(currentGame(),{balls:Number(f.get('balls')),outcome:f.get('outcome'),warned:f.has('warned'),rebreak:f.has('rebreak'),note:f.get('note')});put(g);notify(g.status==='finished'?`${g.players[g.winner]} 獲勝，紀錄已保存。`:'已保存記錄。');}catch(e){$('#form-error').textContent=translateError(e.message);}});
 document.querySelectorAll('[data-delta]').forEach(b=>b.onclick=()=>{$('#balls').value=Math.max(0,Math.min(10000,Number($('#balls').value||0)+Number(b.dataset.delta)));});
 $('#outcome')?.addEventListener('change',extra);extra();
 document.querySelectorAll('[data-central-end]').forEach(b=>b.onclick=()=>{const g=currentGame(),end=Number(b.dataset.centralEnd),rack=rackState(g,{forInput:true});if(end>0&&end<=rack.count)return;pickScore(stateOf(g).active,end===0?0:end-rack.count,end||null);});
 document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>pickScore(Number(b.dataset.player),Number(b.dataset.pick)));
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
 $('#scenario')?.addEventListener('change',e=>{scenario=e.target.value;render();});document.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>{scenario=b.dataset.case;render();});
 $('#filter-player')?.addEventListener('change',e=>{filterPlayer=e.target.value;render();});$('#filter-opponent')?.addEventListener('change',e=>{filterOpponent=e.target.value;render();});$('#chart-game')?.addEventListener('change',e=>$('#chart-area').innerHTML=chart(games.find(g=>g.id===e.target.value)));
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{current=b.dataset.view;location.hash='score';render();});document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>exportJSON([games.find(g=>g.id===b.dataset.export)]));
}
async function action(a){
 if(a==='load-demo'){await loadDemo();return;}
 if(a==='history-reset'){historyFilters={from:'',to:'',player:'',opponent:''};render();return;}
 if(a==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('此瀏覽器不支援全螢幕；記分板仍會自動配合視窗大小。');}return;}
 if(a==='swap'){swapped=!swapped;localStorage.setItem('straight-pool-swap',String(swapped));render();return;}
 if(a==='clock'){const g=currentGame();if(g?.status==='active'){put(g.clock?.runningSince!=null?pauseClock(g):resumeClock(g));notify(g.clock?.runningSince!=null?'休息中，計時已暫停。':'繼續比賽，開始計時。');}return;}
 if(a==='export')return exportJSON();if(a==='export-game')return exportJSON([currentGame()]);if(a==='import')return $('#import-file').click();
 if(a==='new'){const g=currentGame();if(g?.status==='active'){notify('請先完成目前比賽；可使用「認輸／判定勝負」。');return;}current=null;location.hash='score';render();}
 if(a==='undo'){if(summaryTimeout){clearTimeout(summaryTimeout);summaryTimeout=null;}rackSummaryPending=null;selection=null;const g=currentGame();if(g?.events.length){const revised=undo(g);put(g.clock?.runningSince!=null?resumeClock(revised):revised);notify('已回退上一筆記分、擊球順序與圓點歸屬。');}else notify('尚無可撤銷記錄。');}
 if(a==='finish'){endGameDialog(currentGame(),true);}
 if(a==='link-file'){try{fileHandle=await window.showSaveFilePicker({suggestedName:'straight-pool-history.json',types:[{description:'JSON 比賽備份',accept:{'application/json':['.json']}}]});await save();render();notify('已連結 JSON 檔案。');}catch(e){if(e.name!=='AbortError')notify('無法連結檔案，請使用「匯出全部 JSON」。');}}
}
function endGameDialog(game,early=false){
 if(summaryTimeout){clearTimeout(summaryTimeout);summaryTimeout=null;}rackSummaryPending=null;
 const g=early?pauseClock(game):game;if(early)put(g);
 const scores=stateOf(g).scores,times=clockTotals(g);
 modal(`<p>${early?'選擇提前結束結果，或中斷比賽不判勝負。':`${esc(g.players[g.winner])} 獲勝！`}</p><h3>${esc(g.players[0])} ${scores[0]} : ${scores[1]} ${esc(g.players[1])}</h3><p>比賽用時：${times?duration(times[0]+times[1]):'未記錄'}</p>${early?`<label>比賽結果<select id="end-result"><option value="interrupted">中斷比賽（不判勝負）</option>${g.players.map((n,i)=>`<option value="${i}">${esc(n)} 獲勝</option>`).join('')}</select></label>`:''}<p class="note">保存後可在對局歷史查看或匯出 JSON；不保存會移除此場紀錄。</p><div class="actions"><button class="btn primary" id="end-keep" autofocus>保存記錄</button><button class="btn" id="end-discard">不保存記錄</button></div>`,'比賽結束');
 const complete=keep=>{
  const result=$('#end-result')?.value;
  $('#modal').close();
  if(keep){put(early?finishGame(g,result==='interrupted'?null:Number(result),result==='interrupted'?'interrupted':'concession'):g);notify('比賽記錄已保存。');}
  else{games=games.filter(x=>x.id!==g.id);current=null;save();render();notify('本場已結束，不保存記錄。');}
 };
 $('#end-keep').onclick=()=>complete(true);
 $('#end-discard').onclick=()=>complete(false);
 $('#end-keep').focus();
}
function updateClocks(){
 updatePracticeClock();
 const now=new Date();if($('#wall-clock'))$('#wall-clock').textContent=now.toLocaleTimeString('zh-TW',{hour12:false});
 const g=currentGame();if(!g)return;const totals=clockTotals(g);if($('#match-clock'))$('#match-clock').textContent=totals?duration(totals[0]+totals[1]):'未記錄';
 document.querySelectorAll('[data-player-clock]').forEach(el=>el.textContent=duration(!g.events.some(e=>e.type==='turn')&&totals?0:totals?.[Number(el.dataset.playerClock)]));
}
function pickScore(player,balls,end=null){
 const original=currentGame();if(!original||original.status!=='active')return;
 const unstarted=!original.events.some(e=>e.type==='turn');
 if(!unstarted&&stateOf(original).active!==player)return;
 const g=unstarted?selectOpeningPlayer(original,player):original;
 if(g.clock?.runningSince==null){notify('請先按繼續比賽。');return;}
 const remaining=g.target-stateOf(g).scores[player];
 if(balls>remaining){notify('此選手只需再得 '+remaining+' 分，請選擇達標球號。');return;}
 const rackEnd=end??balls;
 if(balls===remaining||rackEnd===14||rackEnd===15){
  const outcome=stateOf(g).scores[player]+balls>=g.target?'win':'continue';
  const next=addTurn(g,{balls,outcome,shots:Math.max(1,balls),rackEnd});
  selection=null;put(next);
  if(next.status==='finished'){endGameDialog(next);return;}
  modal(inningSummary(next),'本局摘要');
  rackSummaryPending={id:next.id,length:next.events.length};
  summaryTimeout=setTimeout(()=>{summaryTimeout=null;if($('#modal').open)$('#modal').close();finishRackSummary();},5000);
  return;
 }
 selection={player,balls,end:end??(balls||0)};render();
 const dialog=$('#modal');dialog.dataset.playerTone=String(player);dialog.innerHTML=scoringDialog(g,balls);dialog.showModal();
 dialog.querySelector('[data-close]').onclick=()=>{selection=null;dialog.close();render();};
 const shotInput=$('#shot-count');let shotsEdited=false;shotInput.addEventListener('input',()=>shotsEdited=true);
 dialog.querySelectorAll('[data-reason]').forEach(button=>button.onclick=()=>{
  try{
   const outcome=button.dataset.reason;
   const shots=shotsEdited?Number(shotInput.value):Math.max(1,balls+(['continue','win'].includes(outcome)?0:1));
   const base=unstarted?selectOpeningPlayer(currentGame(),player):currentGame();
   const next=addTurn(base,{balls,outcome,shots,note:$('#shot-note').value,warned:$('#third-warning')?.checked||false,rebreak:false,rackEnd:balls>0?(end??balls):null});
   const row=stateOf(next).rows.at(-1);selection=null;dialog.close();put(next);
   if(next.status==='finished'){endGameDialog(next);}
   else if(row.outcome==='break-foul'){
    modal(`<h2>開球犯規，已扣 2 分</h2><p>對手可接收現況，或要求原開球者重新開球。</p><div class="actions"><button class="btn" id="accept-break">接收現況</button><button class="btn primary" id="retry-break">要求重新開球</button></div>`);
    $('#accept-break').onclick=()=>$('#modal').close();$('#retry-break').onclick=()=>{const revised=structuredClone(currentGame());revised.events.at(-1).rebreak=true;$('#modal').close();put(revised);};
   }else if(row.third){
    modal(`<div class="warning-count">−16</div><h2>第三次連續犯規</h2><p class="warning-message">一般犯規扣 1 分，再追加扣 15 分，犯規計數已歸零。<br>請由對手選擇後續處理（日本 NBA 規則）。</p><div class="actions"><button class="btn primary" id="third-rerack">重新排球</button><button class="btn" id="third-continue">繼續擊打</button></div><p class="note">重新排球：重排 15 顆，由犯規者重新開球。<br>繼續擊打：保留現況，由對手接手；洗袋時依規定取得頭線後手中球。</p>`);
    const choose=choice=>{const revised=structuredClone(currentGame());revised.events.at(-1).thirdChoice=choice;delete revised.rackClearedAt;$('#modal').close();put(revised);};
    $('#third-rerack').onclick=()=>choose('rerack');$('#third-continue').onclick=()=>choose('continue');
   }
   else if(stateOf(next).fouls[player]===2&&!stateOf(next).warned[player]){
    modal(`<div class="warning-count">連犯 2 次</div><h2>請口頭提醒 ${esc(next.players[player])}</h2><p class="warning-message">下一次連續一般犯規將自動扣 1＋15 分。<br>必須在其下一桿之前告知球員。</p><button class="btn primary big-action" id="ack-warning">已口頭告知球員</button>`);
    $('#ack-warning').onclick=()=>{const revised=structuredClone(currentGame());revised.events.at(-1).warningGiven=true;$('#modal').close();put(revised);};
   }else if(inningSummary(next)){
    modal(inningSummary(next),'本局摘要');
    rackSummaryPending={id:next.id,length:next.events.length};
    summaryTimeout=setTimeout(()=>{summaryTimeout=null;if($('#modal').open)$('#modal').close();finishRackSummary();},5000);
   }else if(next.status==='finished'){notify(`${next.players[next.winner]} 達標獲勝！`);}
  }catch(e){$('#dialog-error').textContent=translateError(e.message);}
 });
}
function finishRackSummary(){
 const pending=rackSummaryPending;rackSummaryPending=null;if(!pending)return;
 const g=currentGame();if(g?.id===pending.id&&g.events.length===pending.length&&g.status==='active'&&rackState(g).complete){const revised=structuredClone(g);revised.rackClearedAt=revised.events.length;put(revised);}
}
$('#modal').addEventListener('close',()=>{if(!$('#modal').open&&summaryTimeout){clearTimeout(summaryTimeout);summaryTimeout=null;}if(!$('#modal').open&&rackSummaryPending)finishRackSummary();if(!$('#modal').open&&selection){selection=null;render();}});
setInterval(updateClocks,1000);
function translateError(s){return ({'Resume the match clock first.':'請先按繼續比賽，再記錄得分。','Invalid shot count.':'出手次數須為 1–100,000 的整數。','Enter two names (1–40 characters).':'請輸入兩位球員的姓名（1–40 字）。','Use different names for the two players.':'兩位球員請使用不同姓名。','Target must be a whole number from 1 to 10,000.':'目標分數須為 1–10,000 的整數。','Add at least one legally scored ball to continue.':'繼續此局前，請輸入至少一顆合法進球。','The target has not been reached.':'尚未達到目標分數，請選擇其他結束方式。','A breaking foul is only possible on an opening break, with zero scoring balls.':'開球失誤僅適用於開球，合法進球數須為 0。','Enter a whole number of legal balls from 0 to 10,000.':'合法進球數須為 0–10,000 的整數。'})[s]||'資料無效，請檢查輸入或 JSON 格式。';}
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>20*1024*1024)throw Error('檔案過大');const imported=validateHistory(JSON.parse(await file.text()));let added=0,conflict=0;for(const g of imported){const old=games.find(x=>x.id===g.id);if(!old){if(g.status==='active'&&games.some(x=>x.status==='active')){conflict++;continue;}games.push(g);added++;}else if(JSON.stringify(old)!==JSON.stringify(g))conflict++;}await save();current=games.find(g=>g.status==='active')?.id||current;render();notify(`已匯入 ${added} 場。${conflict?`${conflict} 場重複 ID 或進行中比賽衝突，保留現有紀錄。`:''}`);}catch{notify('無法匯入：請選擇本程式匯出的有效 JSON（上限 20 MB）。');}});
window.addEventListener('hashchange',render);window.addEventListener('storage',e=>{if(e.key===KEY){notify('另一個分頁已更新資料，請重新整理後繼續。');document.querySelectorAll('#turn-form button,#setup-form button').forEach(b=>b.disabled=true);}});render();

async function loadDemo(){
 try{
  const response=await fetch(new URL('./demo-games.json?v=20261122.15',import.meta.url));
  if(!response.ok)throw Error('demo fetch');
  const incoming=validateHistory(await response.json());let count=0;
  for(const game of incoming){if(!games.some(g=>g.id===game.id)){games.push(game);count++;}}
  await save();render();notify(count?`已加入 ${count} 場模擬對局（目標 70 分），既有紀錄已保留。`:'10 場模擬對局已存在，未重複加入。');
 }catch{notify('無法載入模擬對局，請重新整理後再試。');}
}
if(new URLSearchParams(location.search).get('demo')==='1')loadDemo();
