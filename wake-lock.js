// Fullscreen screen-wake-lock lifecycle; no timers or synthetic user activity.
export function createFullscreenWakeLock({doc=document,nav=navigator,win=window,onChange=()=>{}}={}){
 let lock=null,pending=null,epoch=0,status='off';
 const wanted=()=>!!doc.fullscreenElement&&doc.visibilityState==='visible';
 const set=value=>{if(status!==value){status=value;onChange(value);}};
 async function sync(){
  if(!wanted()){epoch++;const old=lock;lock=null;set('off');if(old)try{await old.release();}catch{}return;}
  if(lock&&!lock.released){set('active');return;}
  if(pending)return pending;
  if(!nav.wakeLock?.request){set('unsupported');return;}
  const serial=epoch;set('requesting');
  pending=(async()=>{
   try{
    const next=await nav.wakeLock.request('screen');
    if(!wanted()||serial!==epoch){await next.release();return;}
    lock=next;next.addEventListener('release',()=>{if(lock===next){lock=null;set(wanted()?'released':'off');}});set('active');
   }catch{if(wanted()&&serial===epoch)set('blocked');}
   finally{pending=null;if(wanted()&&serial!==epoch)void sync();}
  })();
  return pending;
 }
 const stop=()=>{epoch++;const old=lock;lock=null;set('off');if(old)void old.release().catch(()=>{});};
 doc.addEventListener('fullscreenchange',sync);doc.addEventListener('visibilitychange',sync);win.addEventListener('pagehide',stop);win.addEventListener('pageshow',sync);
 return {sync,get status(){return status;}};
}
