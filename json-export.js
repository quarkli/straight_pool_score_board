// Prefer a real save dialog; keep the anchor download as a mobile/older-browser fallback.
export async function exportJsonFile(text,filename,{win=window,doc=document,urls=URL,BlobType=Blob,schedule=setTimeout}={}){
 if(typeof text!=='string'||!text.length)throw Error('沒有可匯出的 JSON 資料。');
 const blob=new BlobType([text],{type:'application/json;charset=utf-8'});
 if(typeof win.showSaveFilePicker==='function'){
  try{
   const handle=await win.showSaveFilePicker({suggestedName:filename,types:[{description:'JSON 備份',accept:{'application/json':['.json']}}]});
   const writer=await handle.createWritable();
   try{await writer.write(blob);await writer.close();}catch(error){try{await writer.abort();}catch{}throw error;}
   return 'saved';
  }catch(error){if(error.name==='AbortError')return 'cancelled';}
 }
 const url=urls.createObjectURL(blob),anchor=doc.createElement('a');
 try{
  anchor.href=url;anchor.download=filename;anchor.style.display='none';
  doc.body.appendChild(anchor);anchor.click();
 }catch(error){urls.revokeObjectURL(url);throw error;}
 finally{if(anchor.parentNode)anchor.parentNode.removeChild(anchor);}
 // Give mobile download managers enough time to consume the Blob.
 schedule(()=>urls.revokeObjectURL(url),60000);
 return 'download';
}
