const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function deleteToolbar(kind){return `<div class="actions section"><label class="checkline"><input type="checkbox" data-delete-all="${kind}">全選目前顯示記錄</label><button class="btn danger" data-delete-selected="${kind}" disabled>刪除所選（0）</button></div>`;}
export function deleteControls(kind,id){return `<label class="checkline"><input type="checkbox" data-delete-check="${kind}" value="${esc(id)}">選取此筆</label><button class="btn danger" data-delete-one="${kind}" data-delete-id="${esc(id)}">刪除</button>`;}
export function bindDeletion(kind,{show,remove,notify}){
 const checks=[...document.querySelectorAll(`[data-delete-check="${kind}"]`)],all=document.querySelector(`[data-delete-all="${kind}"]`),bulk=document.querySelector(`[data-delete-selected="${kind}"]`);
 if(!bulk)return;
 const update=()=>{const n=checks.filter(c=>c.checked).length;bulk.disabled=!n;bulk.textContent=`刪除所選（${n}）`;all.checked=checks.length>0&&n===checks.length;all.indeterminate=n>0&&n<checks.length;all.disabled=!checks.length;};
 checks.forEach(c=>c.onchange=update);all.onchange=()=>{checks.forEach(c=>c.checked=all.checked);update();};
 const confirm=ids=>{
  if(!ids.length)return;
  show(`<h2>確認刪除 ${ids.length} 筆${kind==='games'?'對局':'練習'}記錄？</h2><p class="error"><strong>刪除後數據無法復原。</strong></p><p>此操作也會移除相關逐筆記分，統計將重新計算。建議先匯出 JSON 備份。</p><div class="actions"><button class="btn" id="delete-cancel" autofocus>取消</button><button class="btn danger" id="delete-confirm">確認刪除 ${ids.length} 筆</button></div>`);
  const dialog=document.querySelector('#modal');document.querySelector('#delete-cancel').onclick=()=>dialog.close();document.querySelector('#delete-cancel').focus();
  document.querySelector('#delete-confirm').onclick=async e=>{e.target.disabled=true;try{await remove(ids);dialog.close();notify(`已刪除 ${ids.length} 筆記錄。`);}catch{e.target.disabled=false;notify('刪除未成功，請重試；原有記錄已保留。');}};
 };
 bulk.onclick=()=>confirm(checks.filter(c=>c.checked).map(c=>c.value));
 document.querySelectorAll(`[data-delete-one="${kind}"]`).forEach(b=>b.onclick=()=>confirm([b.dataset.deleteId]));update();
}
