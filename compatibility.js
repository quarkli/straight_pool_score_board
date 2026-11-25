// Match and practice records are JSON data: use a scoped fallback, not a global
// structuredClone substitute that would misrepresent support for Maps or transfers.
export function cloneData(data,clone=globalThis.structuredClone){return typeof clone==='function'?clone(data):JSON.parse(JSON.stringify(data));}
export function newId(provider=globalThis.crypto){
 if(typeof provider?.randomUUID==='function')return provider.randomUUID();
 const bytes=new Uint8Array(16);provider.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function atIndex(list,index){let n=Number(index)||0;n=Math.trunc(n);if(n<0)n+=list.length;return n<0||n>=list.length?undefined:list[n];}
if(!Array.prototype.at)Object.defineProperty(Array.prototype,'at',{configurable:true,writable:true,value:function(index){return atIndex(this,index);}});
