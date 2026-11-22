let promptEvent=null,installed=false;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
export function updateInstallButtons(){document.querySelectorAll('[data-action="install"]').forEach(b=>{b.hidden=installed||standalone();});}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;updateInstallButtons();});
window.addEventListener('appinstalled',()=>{installed=true;promptEvent=null;updateInstallButtons();});
export async function installApp({show,notify}){
 if(installed||standalone()){notify('已在應用程式模式中開啟。');return;}
 if(promptEvent){const event=promptEvent;promptEvent=null;try{await event.prompt();const choice=await event.userChoice;if(choice.outcome==='accepted')notify('請依瀏覽器提示完成安裝。');}catch{notify('暫時無法開啟安裝視窗，請使用瀏覽器選單安裝。');}return;}
 show(`<p>安裝後可從桌面或主畫面開啟，並以獨立視窗使用。首次連線載入完成後，記分、練習及規則頁也可離線開啟。</p><ul><li>電腦 Chrome／Edge：使用網址列的安裝圖示，或瀏覽器選單中的「安裝應用程式」。若剛開啟網頁，請稍候再按本地安裝。</li><li>iPhone／iPad：使用瀏覽器分享選單，選「加入主畫面」。</li><li>Mac Safari：使用「檔案 → 加入 Dock」。</li></ul><p class="note">如果內嵌瀏覽器未提供安裝，請在 Chrome、Edge 或 Safari 開啟本頁。安裝不會把比賽資料上傳到 GitHub；不同瀏覽器或裝置的記錄仍各自保存，轉移前請先匯出 JSON。</p>`);
}
if('serviceWorker' in navigator){
 const register=()=>navigator.serviceWorker.register(new URL('./sw.js',import.meta.url),{scope:'./',updateViaCache:'none'}).catch(()=>{});
 if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
}
