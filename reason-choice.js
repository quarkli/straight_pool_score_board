// One choice per dialog; automatic and manual choices share the same feedback.
export function createReasonChoice({onSelect,onFeedback,onPending=()=>{},schedule=setTimeout,cancel=clearTimeout,defaultReason='miss'}){
 let disposed=false,pending=false,autoTimer,feedbackTimer;
 const choose=reason=>{
  if(disposed||pending)return false;
  pending=true;cancel(autoTimer);onPending(true);onFeedback(reason);
  feedbackTimer=schedule(()=>{if(disposed)return;try{if(onSelect(reason)===false){pending=false;onPending(false);onFeedback(null);}}catch(error){pending=false;onPending(false);throw error;}},500);
  return true;
 };
 autoTimer=schedule(()=>choose(defaultReason),7000);
 return {choose,get pending(){return pending;},dispose(){disposed=true;cancel(autoTimer);cancel(feedbackTimer);}};
}
