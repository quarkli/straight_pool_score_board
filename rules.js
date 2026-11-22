export const source='https://www.wpapool.com/wp-content/uploads/2026/01/2026.01.02-WPA-Rules.pdf';
export const rules=[
 ['目標、叫球與得分','先達約定分數者獲勝，分數可為負。每桿須明確指定目標球與袋口（明顯球可不另說）；不限最先碰哪顆子球，組合球合法。叫進球合法入袋時，同桿額外入袋的子球亦各得 1 分。沒叫進、犯規或安全球所進的球均不計分，須重置。','§7.4–7.7；§1.7'],
 ['開局與開球失誤','比球勝者選擇誰先開球。15 顆密排，頂球在腳點。母球置於頭線後；若未叫進球，碰球後母球及至少兩顆子球須各碰岸。未達要求扣 2 分，對手可接收現況或要求原開球者重開。同桿兼有一般犯規，只按開球失誤扣 2 分，不重複扣分。','§7.1–7.3、7.10'],
 ['換手不等於重新排球','一局（inning）是某位球員一次上場；同一局可連續跨越多個球堆。失誤、安全球或一般犯規後換手，球通常留在原處。合法進至只剩 1 顆時才排回 14 顆，頂球位置留空，原球員繼續；特殊情況見下方圖解。','§2.8、7.2、7.4、7.8'],
 ['一般犯規與母球洗袋','一般犯規扣 1 分並換手，包括未碰子球、碰球後無進球亦無球碰岸、子球飛出台、碰動球、連擊、推桿、球未靜止、無腳著地、非法擺母球、頭線後擊球違規、打錯順序、慢打或使用禁用排球模板。母球通常留原位；母球洗袋或飛出台時，對手改持母球於頭線後。','§7.9；§3'],
 ['連續三次犯規','只累計一般犯規；合法一桿（含合法安全球或未進球）會清除該球員連犯，開球失誤不計入也不清除。第三犯扣 1 分外再扣 15 分（該次共扣 16 分），連犯歸零、重排 15 顆，由犯規者按開球規定重開。須在處於兩犯時先告知球員；未適時警告，追加罰則不生效。本程式會要求確認警告。上述為 WPA 規定；本記分板另依日本 NBA 規則提供對手選擇「重新排球」（犯規者開球）或「繼續擊打」（對手接手現況）。','§3.13、7.11'],
 ['頭線後自由球與全子球在頭線後','頭線後指頭岸至頭線之間，不含線本身。若所有可擊子球都在頭線後，可請裁判將最靠近頭線的一顆移到腳點；等距可任選其一。在頭線上的子球可以直接打。打仍在頭線後的球，母球須先越過頭線，才可回頭接觸；母球不得擺在線上。','§1.6、3.10–3.11'],
 ['重置子球與安全球','安全球須先宣告，該桿後換手，入袋子球重置。犯規、未叫進或飛出台的子球也須重置。通常沿長線由腳點向腳岸排放，盡可能靠近腳點，不移動其他球；下方全被擋住才往腳點上方排。重置球不可緊貼母球。','§1.5、7.5–7.6'],
 ['僵局、讓賽與裁判裁定','僵局時重新比球決定開球，已得分保留。認輸即判負；嚴重失當由裁判依情節裁罰。球靠近排球區時應先標記，以便意外移動後復位。圖解是裁判輔助：以球的外緣是否侵入或重疊三角框判斷，不只是球心。正式賽事以官方全文及裁判裁定為準。','§7.8、7.11–7.12；§1.12–1.13']
];
const c=(x,y,fill,label='')=>`<circle cx="${x}" cy="${y}" r="8" fill="${fill}" stroke="#092c25" stroke-width="1.2"/>${label?`<text x="${x}" y="${y+3}" text-anchor="middle" font-size="8" fill="#18392b">${label}</text>`:''}`;
export function tableDiagram({cue=[175,115],object=[410,185],full=false,kitchen=false,old=false,objects=null}={}){
 let rack='';for(let row=0;row<5;row++)for(let n=0;n<=row;n++){if(!full&&row===0)continue;rack+=c(420+row*14,140+(n-row/2)*16,'#d6b578');}
 return `<svg class="table-svg" viewBox="0 0 600 290" role="img" aria-label="球桌${old?'原始':'調整後'}擺位示意：左為頭岸，右為腳岸。白球是母球，金球是子球。"><rect x="14" y="14" width="572" height="252" rx="22" fill="#624738"/><rect x="30" y="30" width="540" height="220" rx="12" fill="#145443"/><path d="M165 30V250" stroke="#a3b9aa" stroke-dasharray="5 5" opacity=".7"/>${kitchen?'<rect x="39" y="39" width="117" height="202" rx="6" fill="#d5dfa3" opacity=".2"/>':''}<path d="M412 140L487 97L487 183Z" fill="none" stroke="#b8cebb" stroke-dasharray="4 4" opacity=".65"/>${[30,300,570].flatMap(x=>[30,250].map(y=>`<circle cx="${x}" cy="${y}" r="12" fill="#092b24"/>`)).join('')}${[165,300,420].map(x=>`<circle cx="${x}" cy="140" r="3" fill="#afc6b4"/>`).join('')}${old?'':rack}${objects?objects.map(([x,y])=>c(x,y,'#d6b578','')).join(''):object?c(...object,'#d6b578','15'):''}${cue?c(...cue,'#f5f4ea'):''}<text x="165" y="278" text-anchor="middle" fill="#647b6d" font-size="12">頭點／頭線</text><text x="300" y="278" text-anchor="middle" fill="#647b6d" font-size="12">中點</text><text x="420" y="278" text-anchor="middle" fill="#647b6d" font-size="12">腳點</text><text x="75" y="56" fill="#b0c9b4" font-size="12">頭線後</text></svg>`;
}
export const cases=[
 {id:'normal',title:'兩球皆不妨礙排球',before:{cue:[280,85],object:[410,210]},after:{cue:[280,85],object:[410,210]},text:'排回 14 顆，頂位空著。母球與第 15 球均留原處，原球員繼續。'},
 {id:'both',title:'母球與第 15 球都在排球區',before:{cue:[465,126],object:[468,158]},after:{cue:[100,125],object:null,full:true,kitchen:true},text:'15 顆全部重排，母球改為頭線後自由球，由原球員繼續。'},
 {id:'object',title:'只有第 15 球在排球區',before:{cue:[280,85],object:[460,140]},after:{cue:[280,85],object:[165,140]},text:'排回 14 顆；第 15 球移至頭點，母球留原處。'},
 {id:'object-block',title:'第 15 球在排球區，母球擋住頭點',before:{cue:[165,140],object:[460,140]},after:{cue:[165,140],object:[300,140]},text:'排回 14 顆；第 15 球改移中點，母球留原處。'},
 {id:'cue-front',title:'母球在排球區，子球在頭線前／線上',before:{cue:[465,140],object:[280,195]},after:{cue:[100,125],object:[280,195],kitchen:true},text:'排回 14 顆，第 15 球不動，母球為頭線後自由球。子球在線上亦適用。'},
 {id:'cue-back',title:'母球在排球區，子球在頭線後',before:{cue:[465,140],object:[100,195]},after:{cue:[165,140],object:[100,195]},text:'排回 14 顆；第 15 球不動，母球置於頭點，並非頭線後自由球。'},
 {id:'cue-block',title:'母球在排球區，子球擋住頭點',before:{cue:[465,140],object:[160,140]},after:{cue:[300,140],object:[160,140]},text:'排回 14 顆；第 15 球不動，母球改置中點。'},
 {id:'all',title:'第 14、15 球同桿合法入袋',before:{cue:[280,85],object:null},after:{cue:[280,85],object:null,full:true},text:'15 顆全部重排（包含腳點頂球），母球留原處。'},
 {id:'all-cue',title:'15 球全進，母球停在排球區',before:{cue:[465,140],object:null},after:{cue:[100,125],object:null,full:true,kitchen:true},text:'15 顆全部重排，母球改為頭線後自由球。'},
 {id:'scratch',title:'母球洗袋／飛出台',before:{cue:null,object:[330,190]},after:{cue:[100,125],object:[330,190],kitchen:true,old:true},text:'扣 1 分並換手；對手持母球於頭線後，子球留原處。該犯規桿入袋的子球須重置，不因洗袋而自動重排 14 顆。'},
 {id:'kitchen',title:'洗袋後，全部子球都在頭線後',before:{cue:null,objects:[[100,190],[147,95],[78,135]]},after:{cue:[90,85],objects:[[100,190],[420,140],[78,135]],kitchen:true,old:true},text:'可要求將最靠近頭線的子球重置至腳點，母球仍為頭線後自由球。等距可選其一；若有球在線上，可直接打，不適用「全部在線後」。'},
 {id:'third',title:'已警告後的第三次連續一般犯規',before:{cue:[280,85],object:[410,210]},after:{cue:[100,125],object:null,full:true,kitchen:true},text:'該次扣 16 分（一般犯規 1 分＋追加 15 分），連犯清零，15 顆重排，由犯規者重新開球。'}
];
export function rulesPage(selected='normal'){
 const r=cases.find(c=>c.id===selected)||cases[0];
 return `<div class="page-head"><div><div class="eyebrow">THE RULEBOOK</div><h1>規則與擺球圖解</h1><p>看懂每一種局面，放心接下一桿。</p></div><a class="btn" href="${source}" target="_blank" rel="noopener">WPA 官方規則 ↗</a></div><div class="hero-note">依據 WPA《Rules of Play》，生效日 2025-09-15，14.1 章節與通則。中文為重點整理，非官方譯本。<br>換手與重排球是兩件不同的事：重排通常在第 14 顆合法進球後發生，同一球員繼續。</div><section class="card"><div class="section-head"><h2>遇到這個局面，怎麼擺？</h2><span class="badge">§7.8 · §1.6</span></div><label>選擇情境<select id="scenario">${cases.map(c=>`<option value="${c.id}" ${r.id===c.id?'selected':''}>${c.title}</option>`).join('')}</select></label><div class="section diagram-pair"><div><h3>當前位置</h3>${tableDiagram({...r.before,old:true})}</div><div><h3>正確擺位</h3>${tableDiagram(r.after)}</div></div><div class="legend"><span><i class="dot cue"></i>母球</span><span><i class="dot object"></i>子球</span><span>虛線三角形：排球區</span><span>比例為示意</span></div><div class="placement-result"><strong>${r.title}</strong><p>${r.text}</p></div><div class="rule-cases">${cases.map(c=>`<button class="btn ${c.id===r.id?'selected':''}" data-case="${c.id}">${c.title}</button>`).join('')}</div></section><section class="section"><h2>比賽規則速查</h2><div class="rule-grid">${rules.map(([title,text,ref])=>`<details open><summary>${title}</summary><p>${text}</p><span class="note">${ref}</span></details>`).join('')}</div></section>`;
}
