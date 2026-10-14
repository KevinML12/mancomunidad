<script>
  import apiClient from '$lib/apiClient';
  import { onMount } from 'svelte';
  import { FileText, Upload, Check, ShieldCheck, RefreshCw } from 'lucide-svelte';
  import { uploadPdf, pdfSelectionError, formatFileSize } from '$lib/documents/upload.js';
  let { tipo, value=$bindable(''), required=false, onbusy=(_busy)=>{} } = $props();
  let disponible=$state(null), busy=$state(false), error=$state(''), nombre=$state(''), bytes=$state(0), stage=$state(''), progress=$state(0);
  let attempted=$state(null);
  const stages={preparing:'Preparando documento',uploading:'Subiendo documento',verifying:'Comprobando integridad'};
  async function availability(){disponible=null;try {const {data}=await apiClient.get('/documentos/estado');disponible=data.disponible;}catch{disponible=false;}}
  onMount(()=>{availability();});
  function send(url,file){return new Promise((resolve,reject)=>{
    const request=new XMLHttpRequest();request.open('PUT',url);request.timeout=120000;request.setRequestHeader('Content-Type','application/pdf');
    request.upload.onprogress=event=>{if(event.lengthComputable)progress=Math.round(event.loaded/event.total*100);};
    request.onload=()=>request.status>=200&&request.status<300?resolve(undefined):reject(new Error('La carga no se completó. Vuelva a seleccionar el archivo'));
    request.onerror=()=>reject(new Error('Se interrumpió la conexión. Vuelva a seleccionar el archivo para reintentar'));
    request.ontimeout=()=>reject(new Error('La carga tardó demasiado. Revise su conexión y reintente'));request.send(file);
  });}
  async function select(event){
    const file=event.target.files?.[0];if(!file||busy)return;
    attempted={name:file.name,size:file.size};error=pdfSelectionError(file);
    if(error){event.target.value='';return;}
    busy=true;onbusy(true);progress=0;
    try {
      const confirmed=await uploadPdf(file,{tipo,api:apiClient,send,onStage:next=>stage=next,hash:async buffer=>{
        const digest=await crypto.subtle.digest('SHA-256',buffer);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      }});
      value=confirmed.reference;nombre=confirmed.nombre;bytes=file.size;stage='ready';attempted=null;
    }catch(err){error=err.response?.data?.error || err.message || 'No se pudo cargar el PDF';stage='';}
    finally{busy=false;onbusy(false);event.target.value='';}
  }
</script>
<section class="mfn-upload" class:has-file={Boolean(value)} aria-label="Documento de respaldo">
  <div class="mfn-upload-heading"><div><p class="mfn-eyebrow">Documento de respaldo</p><h3>Adjuntar PDF <span>{required ? 'Obligatorio' : 'Opcional'}</span></h3></div><span class="mfn-file-limit">PDF · máx. 10 MiB</span></div>
  <label class="mfn-upload-picker" class:is-disabled={busy || disponible!==true}>
    <span class="mfn-upload-symbol"><Upload size={22}/></span>
    <span><strong>{value ? 'Seleccionar otro PDF' : 'Seleccionar documento'}</strong><small>Elija el archivo original desde su dispositivo</small></span>
    <input aria-label="Adjuntar PDF" type="file" accept="application/pdf,.pdf" disabled={busy || disponible!==true} onchange={select}/>
  </label>
  {#if disponible===null}<p role="status" class="mfn-upload-note">Comprobando disponibilidad de carga…</p>{:else if !disponible}<div role="status" class="mfn-upload-warning">La carga no está disponible por el momento. Conserve su documento. <button type="button" onclick={availability}><RefreshCw size={14}/> Reintentar conexión</button></div>{/if}
  {#if busy}<div role="status" aria-live="polite" class="mfn-upload-status"><span>{stages[stage]}{stage==='uploading' ? ` · ${progress}%` : '…'}</span><small>Mantenga el formulario abierto</small>{#if stage==='uploading'}<progress max="100" value={progress} aria-label="Progreso de carga"></progress>{/if}</div>{/if}
  {#if value}<div class="mfn-attached" role="status"><span class="mfn-attached-icon"><FileText size={22}/></span><div><strong>{nombre || 'Documento adjunto'}</strong><small>{bytes ? `${formatFileSize(bytes)} · ` : ''}PDF privado · integridad comprobada</small></div><Check size={18}/></div><p class="mfn-upload-note">Carga completada. Guarde el formulario para vincular el PDF al expediente.</p>{/if}
  {#if error}<div role="alert" class="mfn-upload-error">{#if attempted}<strong>{attempted.name} · {formatFileSize(attempted.size)}</strong>{/if}<p>{error}</p>{#if value}<p>Se conserva el PDF previamente seleccionado.</p>{/if}</div>{/if}
  <p class="mfn-upload-footnote"><ShieldCheck size={16}/><span>El original se conserva sin compresión. Se comprueba la integridad del archivo; no sus firmas ni su validez legal.</span></p>
</section>
