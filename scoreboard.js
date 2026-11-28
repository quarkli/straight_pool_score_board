import {stateOf,clockTotals,visitRecords,rackState,tacticalStats} from './engine.js?v=20261128.61';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function duration(ms){if(ms==null)return '未記錄';const sec=Math.floor(Math.max(0,ms)/1000);return `${Math.floor(sec/3600).toString().padStart(2,'0')}:${Math.floor(sec%3600/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`;}
const colors=['#fff','#e9b825','#2467be','#c73e38','#6947a3','#e97925','#277e5c','#973e46','#182123','#e9b825','#2467be','#c73e38','#6947a3','#e97925','#277e5c','#973e46'];
export function ball(n){
 const stripe=n>8?`<path d="M3.3114 8H28.6886A15 15 0 0 1 28.6886 24H3.3114A15 15 0 0 1 3.3114 8Z" fill="${colors[n]}"/>`:`<circle cx="16" cy="16" r="15" fill="${colors[n]}"/>`;
 const face=n===0?'<circle cx="18" cy="14" r="1.8" fill="#bc5348"/>':`<circle cx="16" cy="16" r="7" fill="#fffbed"/><text x="16" y="20" text-anchor="middle" font-size="11" font-weight="800" fill="#243124">${n}</text>`;
 return `<svg class="pool-ball-svg ${n>8?'striped':''} ${n===0?'cue-ball':''}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="15" fill="${n>8?'#f4f0df':colors[n]}"/>${stripe}<circle cx="16" cy="16" r="15" fill="none" stroke="#13241d" stroke-opacity=".22"/><ellipse cx="11" cy="8" rx="6" ry="3.5" fill="#fff" opacity=".28"/>${face}</svg>`;
}
function dotSvg(){return '<svg class="record-dot" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8.5" fill="#fff"/><circle cx="10" cy="10" r="8" fill="none" stroke="#fff" stroke-opacity=".35"/></svg>';}
function markSvg(kind,plural=false){
 const prime=plural?'<path d="M25 3l-2.5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>':'';
 if(kind==='safety')return `<svg class="mark-icon mark-safety" viewBox="0 0 28 24" aria-hidden="true" focusable="false"><path d="M4 20L13 4l9 16z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>${prime}</svg>`;
 if(kind==='third')return '<svg class="mark-icon mark-foul mark-third" viewBox="0 0 38 24" aria-hidden="true" focusable="false"><path d="M3 5l12 14M15 5L3 19" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M22 6c2-3 9-2 9 2 0 2-2 3-5 3 4 0 6 2 6 4 0 5-8 6-11 2" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 return `<svg class="mark-icon mark-foul" viewBox="0 0 28 24" aria-hidden="true" focusable="false"><path d="M4 5l15 14M19 5L4 19" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>${prime}</svg>`;
}
function zeroSvg(){return '<svg class="mark-icon mark-zero" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';}
const reasonNames={miss:'失誤不進',safety:'安全球',foul:'犯規',scratch:'洗袋', 'break-foul':'開球犯規',continue:'繼續',win:'獲勝'};
function history(g,p){const visits=visitRecords(g,p);return `<div class="shot-history" role="region" tabindex="0" aria-label="${esc(g.players[p])} 的出場紀錄">${visits.length?visits.map(v=>`<section class="visit-group"><span class="visit-title">#${v.visit}</span><div class="shot-tokens">${v.rows.map(r=>{const label=`${r.balls}${r.penalty?'-'+r.penalty:r.outcome==='safety'?'S':''}`;return `<span class="shot-token ${r.penalty?'penalized':''}" aria-label="${r.balls} 分，${esc(reasonNames[r.outcome])}${r.penalty?'，扣 '+r.penalty+' 分':''}" title="${esc(reasonNames[r.outcome])} · ${r.shots??'未記錄'} 次出手 · ${duration(r.elapsedMs)}">${label}</span>`;}).join('')}</div><span class="visit-time">${v.timeKnown?duration(v.elapsedMs):'—'}</span></section>`).join(''):'<div class="history-empty">等待第一筆記錄<span>每次得分，都留在這裡。</span></div>'}</div>`;}
function pickerCell(game,player,n,side,{unstarted,done,paused,rack,selection}){
 const column=side?3:1;
 const marks=[];let end=0,zeroHandover=false;
 for(const r of rack.rows){end+=r.balls;
  if(end>0&&end===n&&r.player===player&&r.balls===0&&['miss','safety','foul','scratch','break-foul'].includes(r.outcome))zeroHandover=true;
  const symbol=r.third?'x3':r.outcome==='safety'?'△':['foul','scratch','break-foul'].includes(r.outcome)?'×':'';
  if(end>0&&symbol&&r.player===player&&end===n){if(r.third){marks.splice(0,marks.length,...marks.filter(m=>m==='△'),'x3');}else marks.push(symbol);}
 }
 const groups=[];for(const symbol of marks){const last=groups.at(-1);if(last?.symbol===symbol)last.count++;else groups.push({symbol,count:1});}
 const markLabel=groups.map(m=>(m.symbol==='△'?'安全球':m.symbol==='x3'?'連續三犯':'犯規')+(m.count>1?m.count+'次':'')).join('、');
 const safetyCount=marks.filter(m=>m==='△').length,foulCount=marks.filter(m=>m==='×').length;
 const foulMark=marks.includes('x3')?markSvg('third'):foulCount?markSvg('foul',foulCount>1):'';
 const safetyMark=safetyCount?markSvg('safety',safetyCount>1):'';
 const annotation=marks.length||zeroHandover?`<span class="turn-mark" aria-label="${markLabel||'零分換手'}">${foulMark}${zeroHandover&&rack.owners[n]!==player?zeroSvg():''}${safetyMark}</span>`:'';

 if(!unstarted){
  const owner=n>0?rack.owners[n]:null;
  const preview=selection?.player===player&&n>rack.count&&n<=selection.end;
  return owner===player||preview||annotation?`<span class="score-record${owner===player||preview?'':' mark-only'}" style="grid-column:${column}" data-record-player="${player}" data-record-score="${n}" role="img" aria-label="${esc(game.players[player])} ${owner===player||preview?'已記錄第 '+n+' 顆進球':'第 '+n+' 球位置，零分換手'}${marks.length?'，'+markLabel:''}">${owner===player||preview?dotSvg():''}${annotation}</span>`:'';
 }
 if(n>0&&n>game.target-stateOf(game).scores[player])return '';
 const selected=selection?.player===player&&((n===0&&selection.balls===0)||(n>0&&n<=selection.balls));
 return `<button class="score-option ${selected?'chosen':''}" data-pick="${n}" data-player="${player}" style="grid-column:${column}" aria-label="${esc(game.players[player])} 得 ${n} 分" aria-pressed="${!!selected}" ${paused||done?'disabled':''}><svg class="option-dot" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8"/></svg></button>`;
}
function recordPanel(g,p,rack,expanded){
 const points=rack.rows.filter(r=>r.player===p).reduce((total,r)=>total+r.net,0);
 return `<section class="player-record-panel" data-player-tone="${p}"><details class="record-details" data-record-panel="${p}" ${expanded?'open':''}><summary class="record-heading"><h2>${esc(g.players[p])} 的紀錄</h2><span class="record-toggle-label">展開／收折</span><span class="rack-total-label">本場排球合計</span><strong class="rack-total" aria-label="${esc(g.players[p])} 本場排球合計 ${points} 分">${points}<small>分</small></strong></summary>${history(g,p)}</details></section>`;
}
export function scoreboardPage(g,{swapped=false,selection=null,recordExpanded=[false,false]}={}){
 const ready=g.status==='ready';
 const unstarted=!g.events.some(e=>e.type==='turn');
 const rack=rackState(g),inputRack=rackState(g,{forInput:true});
 const s=stateOf(g),scoreLimit=Math.min(15,inputRack.count+Math.min(g.target,Math.max(0,g.target-s.scores[s.active]))),order=swapped?[1,0]:[0,1],done=g.status==='finished',clock=clockTotals(g),paused=!g.clock||g.clock.runningSince===null;

 return `<div class="score-shell"><div class="match-toolbar"><div class="match-tools"><small class="app-version" title="目前載入版本">v20261128.61</small><button class="tool-btn" data-action="fullscreen" aria-label="切換全螢幕">全螢幕</button><button class="tool-btn" data-action="install">本地安裝</button></div><button class="tool-btn target-tag" data-action="${ready?'start':'target'}" aria-label="${ready?'開始比賽':'修改目標分數'}" ${done?'disabled':''}>${ready?'開始比賽':`目標 <b>${g.target}</b> 分${done?'':' ✎'}`}</button><span class="live-wall-clock" id="wall-clock" aria-label="目前時間"></span></div><div class="match-players">${order.map((p,side)=>`<article data-player-tone="${p}" class="match-player ${!unstarted&&s.active===p&&!done?'on-table':''} ${side?'right-player':''}" style="grid-column:${side?3:1}"><div class="match-player-title"><h1><button class="player-name-button" data-edit-player="${p}" aria-label="編輯選手 ${esc(g.players[p])} 姓名" ${done?'disabled':''}>${esc(g.players[p])}</button></h1>${!unstarted&&g.breaker===p?'<span class="breaker-label">（先攻）</span>':''}<span class="turn-badge">${ready?'待開始':done?(g.winner===p?'獲勝':'已結束'):unstarted?'待開球':s.active===p?'出桿中':'等待'}</span></div><div class="match-player-line"><button class="match-score score-handicap-button" data-handicap-player="${p}" aria-label="${esc(g.players[p])} 總分 ${s.scores[p]}，設定讓分" ${ready||done?'disabled':''}>${s.scores[p]}</button><div class="player-clock"><span>選手用時</span><b data-player-clock="${p}">${duration(unstarted&&clock?0:clock?.[p])}</b></div><div class="foul-indicator ${s.fouls[p]>=2?'at-risk':''}"><span>連續犯規</span><b>${s.fouls[p]} <small>次</small></b></div></div></article>`).join('')}<div class="match-middle"><button class="swap-button" data-action="swap" aria-label="交換左右顯示位置" title="只交換畫面位置，不改變出桿順序">⇄</button><span>交換左右</span></div></div><div class="match-status"><div><span class="status-pip ${paused?'paused':''}"></span>${ready?'點選姓名編輯 · 按開始比賽設定目標':done?`比賽結束 · ${esc(g.players[g.winner]??'比賽中斷')} ${g.winner===null?'':'獲勝'} · 唯讀` :paused?'休息中 · 計時已暫停':unstarted?'左右皆可記分 · 先記分者為開球選手':s.opening?'開球局 · 請記錄開球結果':`${esc(g.players[s.active])} 的第 ${s.visits[s.active]+(s.visitOpen?0:1)} 次上場 · 第 ${rack.number} 場排球`}</div><div class="status-timer">比賽有效時間 <b id="match-clock">${clock?duration(clock[0]+clock[1]):'未記錄'}</b></div></div><div class="match-arena">${recordPanel(g,order[0],rack,recordExpanded[order[0]])}<section class="ball-picker" aria-label="進球數選擇"><div class="picker-headers"><div class="picker-header"><span class="${!done&&!unstarted&&s.active===order[0]?'active-scoring-side':''}" ${!done&&!unstarted&&s.active===order[0]?'aria-current="true"':''}>${unstarted?'':g.breaker===order[0]?'先攻':'後攻'}</span><span>進球</span><span class="${!done&&!unstarted&&s.active===order[1]?'active-scoring-side':''}" ${!done&&!unstarted&&s.active===order[1]?'aria-current="true"':''}>${unstarted?'':g.breaker===order[1]?'先攻':'後攻'}</span></div></div><div class="ball-rows" style="--ball-row-count:16">${Array.from({length:16},(_,n)=>`<div class="ball-row ${n===0?'zero-row':''}" style="grid-column:${n<8?1:2};grid-row:${n%8+1}">${order.map((p,side)=>pickerCell(g,p,n,side,{unstarted,done,paused,rack,selection})).join('')}${unstarted?`<span class="ball-center" style="grid-column:2">${n<=g.target?ball(n):''}</span>`:`<button class="ball-center ball-score-button" style="grid-column:2" data-central-end="${n}" ${n>scoreLimit?'hidden':''} aria-label="${n===0?'記錄零分':'記至第 '+n+' 顆進球'}" ${done||paused||(n>0&&n<=inputRack.count)?'disabled':''}>${ball(n)}</button>`}</div>`).join('')}</div></section>${recordPanel(g,order[1],rack,recordExpanded[order[1]])}</div><div class="match-bottom"><div class="bottom-actions"><button class="btn ${paused?'primary':''}" data-action="clock" ${ready||done?'disabled':''}>${paused?'▶ 繼續比賽':'Ⅱ 休息'}</button><button class="btn" data-action="undo" ${!done&&g.events.length?'':'disabled'}>修正</button><button class="btn ${done?'primary':''}" data-action="finish" ${ready?'disabled':''}>結束比賽</button></div><span class="bottom-hint">點選數字後，選擇本次出手結果${s.fouls[s.active]>=2?' · 已連犯兩次，請口頭警告':''}</span><div class="bottom-actions"><button class="btn" data-action="score-help">記分說明</button><button class="btn" data-action="match-stats" ${ready?'disabled':''}>統計分析</button></div></div></div>`;
}
export function scoringDialog(g,n){
 const s=stateOf(g),p=s.active,win=s.scores[p]+n>=g.target;
 return `<div class="dialog-head"><div><div class="eyebrow">${esc(g.players[p])} · ${s.opening?'開球':'本次得分'}</div><h2>記錄 ${n} 分</h2></div><button class="btn" data-close>取消</button></div><div class="selected-balls">${n===0?ball(0):Array.from({length:n},(_,i)=>ball(i+1)).join('')}</div><p class="dialog-question">${win?'已達目標分數，確認後宣告獲勝。':'這次出手如何結束？'}</p><div class="reason-options">${win?'<button class="reason-button winning" data-reason="win"><strong>達標獲勝</strong><span>保存紀錄並結束比賽</span></button>':`<button class="reason-button" data-reason="safety"><strong>安全球</strong><span>主動防守，換對手出桿</span></button><button class="reason-button" data-reason="miss"><strong>失誤不進</strong><span>進攻未進球，換手</span></button>${s.opening&&n===0?'<button class="reason-button foul-reason" data-reason="break-foul"><strong>開球犯規 −2</strong><span>未達開球碰岸要求，自動扣分</span></button>':''}<button class="reason-button foul-reason" data-reason="foul"><strong>${s.opening&&n===0?'一般犯規 −1':'犯規'}${s.fouls[p]>=2&&n===0?' · 第三犯':''}</strong><span>${s.opening&&n===0?'開球碰岸要求已符合，另有一般犯規':'洗袋、未碰球、無碰岸等'}</span></button>${n>0?'<button class="reason-button" data-reason="continue"><strong>繼續本局</strong><span>先記本段得分，仍由本選手出桿</span></button>':''}`}</div><details class="shot-details"><summary>出手次數與備註</summary><label>本次出手次數（預估，可修改）<input id="shot-count" type="number" min="1" max="100000" value="${Math.max(1,n+(win?0:1))}"></label><p class="note">預估值：每顆進球一桿，加上最後換手的一桿；若為組合球或分段記錄，請修正。選「繼續本局」時預設為 ${Math.max(1,n)} 次。</p><label>備註<input id="shot-note" maxlength="250" placeholder="選填"></label></details>${s.fouls[p]>=2&&n===0?`<label class="checkline"><input id="third-warning" type="checkbox" ${s.warned[p]?'checked':''}>本桿前已口頭告知兩犯（第三犯自動扣 1＋15 分）</label>`:''}<div id="dialog-error" class="error" role="alert"></div>`;
}

export function inningSummary(game){
 const s=stateOf(game),row=s.rows.at(-1);if(!row)return '';
 if([14,15].includes(row.rackEnd)){
  const rack=rackState(game);
  return `<div class="inning-summary"><div class="eyebrow">第 ${rack.number} 場排球 · 本局摘要</div><div class="inning-score">${rack.count}<small>顆合法進球</small></div><div class="summary-grid">${game.players.map((name,p)=>{
   const rows=rack.rows.filter(r=>r.player===p),scored=rack.owners.filter(owner=>owner===p).length;
   return `<span>${esc(name)}<b>${scored} 分</b><small>失誤 ${rows.filter(r=>r.outcome==='miss').length} ／ 出手 ${rows.every(r=>r.shots!=null)?rows.reduce((n,r)=>n+r.shots,0):'—'}</small><br><small>用時 ${rows.every(r=>r.elapsedMs!=null)?duration(rows.reduce((n,r)=>n+r.elapsedMs,0)):'未記錄'}</small></span>`;
  }).join('')}</div><p>${game.status==='finished'?`${esc(game.players[game.winner])} 達標獲勝`:'重新排球後，由 '+esc(game.players[s.active])+' 繼續'}</p><p class="note">5 秒後自動關閉，${game.status==='finished'?'返回記分板':'進入下一局球堆'}。</p></div>`;
 }
 const visit=visitRecords(game,row.player).at(-1),balls=visit.rows.reduce((n,r)=>n+r.balls,0);
 if(![14,15].includes(row.balls)&&!(row.balls>0&&[14,15].includes(balls)))return '';
 return `<div class="inning-summary"><h2>${esc(game.players[row.player])} · 第 ${row.visit} 次出場</h2><p>合法進球 ${balls} · 本局淨得分 ${visit.points}</p><p class="note">5 秒後自動關閉，返回記分板。</p></div>`;
}

export function matchStats(game){
 const s=stateOf(game),times=clockTotals(game),tactics=tacticalStats(game);
 const success=(n,d)=>d?`${(n/d*100).toFixed(1)}%（${n}／${d}）`:'—';
 const players=game.players.map((name,p)=>{
  const rows=s.rows.filter(r=>r.player===p),shotsKnown=rows.length>0&&rows.every(r=>r.shots!=null),shots=rows.reduce((n,r)=>n+(r.shots||0),0),misses=rows.filter(r=>r.outcome==='miss').length;
  const timed=rows.every(r=>r.elapsedMs!=null),elapsed=rows.reduce((n,r)=>n+(r.elapsedMs||0),0);
  return {name,values:[s.scores[p],s.balls[p],s.visits[p],s.high[p],s.visits[p]?(s.balls[p]/s.visits[p]).toFixed(2):'—',misses,rows.filter(r=>r.outcome==='safety').length,s.standard[p]+s.breaking[p],s.penalties[p],shotsKnown?shots:'未記錄',times?duration(times[p]):'未記錄',shotsKnown&&shots?(rows.reduce((n,r)=>n+r.net,0)/shots).toFixed(2):'未記錄',shotsKnown&&timed&&shots?duration(elapsed/shots):'未記錄',shotsKnown&&shots?(misses/shots*100).toFixed(1)+'%':'未記錄',success(tactics[p].safetyHeld,tactics[p].safetyEvaluated),success(tactics[p].openingSuccess,tactics[p].openingEvaluated),s.handicaps[p]]};
 });
 const labels=['淨得分','合法進球','出場數','最高連進','平均每次出場進球','失誤不進','安全球','犯規次數','扣分合計','出手次數（預估）','選手用時','平均出手得分','平均出手用時','失誤率','防守成功率','開局成功率','讓分（不含進球）'];
 return `<section class="match-stats" aria-label="本場雙方統計"><p>${game.status==='finished'?'比賽結束 · 唯讀紀錄':'比賽進行中 · 截至目前記分'} · 目標 ${game.target} 分<br>比賽有效用時 ${times?duration(times[0]+times[1]):'未記錄'}</p><table><thead><tr><th>統計項目</th>${players.map((p,i)=>`<th data-player-tone="${i}" style="background:var(--player-tint)">${esc(p.name)}${game.winner===i?' · 勝':''}</th>`).join('')}</tr></thead><tbody>${labels.map((label,i)=>`<tr><th scope="row">${label}</th>${players.map(p=>`<td>${p.values[i]}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="note">防守成功＝安全球換手後，對手緊接的一次完整出場沒有合法進球；扣分後淨分為零不算。比賽模式排除首次開球（含該開球的犯規重開），之後開局以每個球堆首次出場為單位，非安全球結束且合法進球至少 2 顆算成功，分段合併；安全球開局計為未成功。成功率＝成功次數 ÷ 可評估次數，括號為成功／可評估，尚未完成者暫不計入。只計本場，不合併其他對局。出場數包含零分；每次出場平均使用合法進球。出手數通常為估算，相關每桿統計供參考。平均出手用時以已記分段的用時計算，選手用時包含目前尚未提交記分的時間；休息不計時。</p></section>`;
}
