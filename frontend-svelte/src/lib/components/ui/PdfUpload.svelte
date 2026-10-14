<script>
  import apiClient from '$lib/apiClient';
  import { onMount } from 'svelte';
  let { tipo, value=$bindable(''), required=false, onbusy=(_busy)=>{} } = $props();
  let disponible=$state(null);
  let busy=$state(false);
  let error=$state('');
  let nombre=$state('');
  onMount(async()=>{try {const {data}=await apiClient.get('/documentos/estado');disponible=data.disponible;}catch{disponible=false;}});
  async function select(event) {
    const file=event.target.files?.[0];if(!file)return;
    error='';
    if (file.type!=='application/pdf' || !file.name.toLowerCase().endsWith('.pdf') || file.size>10*1024*1024 || file.size<8) {error='Seleccione un PDF de hasta 10 MB';event.target.value='';return;}
    busy=true;onbusy(true);
    try {
      const bytes=await file.arrayBuffer();
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      const sha256=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const {data:upload}=await apiClient.post('/documentos/preparar',{tipo,nombre:file.name,tipoMime:file.type,bytes:file.size,sha256});
      const sent=await fetch(upload.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:file});
      if(!sent.ok)throw new Error('La carga no se completó. Revise la conexión y vuelva a seleccionar el archivo');
      const {data:confirmed}=await apiClient.post('/documentos/confirmar',{ticket:upload.ticket},{timeout:60000});
      value=confirmed.reference;nombre=confirmed.nombre;
    } catch(err) {
      error=err.response?.data?.error || (err instanceof TypeError ? 'No se pudo conectar con el almacenamiento. Revise la conexión y reintente' : err.message) || 'No se pudo cargar el PDF';
      event.target.value='';
    } finally {busy=false;onbusy(false);}
  }
</script>
<div class="rounded-xl border border-blue-100 p-4 bg-white space-y-2">
  <label class="block text-sm font-semibold text-[#071D49]">Adjuntar PDF {required ? '' : '(opcional)'}
    <input aria-label="Adjuntar PDF" type="file" accept="application/pdf,.pdf" disabled={busy || disponible!==true} onchange={select} class="block w-full mt-2 text-sm" />
  </label>
  {#if disponible===null}<p class="text-sm">Comprobando almacenamiento…</p>{:else if !disponible}<p role="status" class="text-sm text-amber-900">La carga privada aún no está disponible. La administración debe conectar Cloudflare R2.</p>{/if}
  {#if busy}<p role="status" class="text-sm">Cargando y comprobando el PDF. Mantenga esta pantalla abierta.</p>{/if}
  {#if value}<p role="status" class="text-sm text-[#071D49]">{nombre || 'PDF'} cargado en almacenamiento privado. Guarde el formulario para vincularlo al expediente.</p>{/if}
  {#if error}<p role="alert" class="text-sm text-red-800">{error}{value ? ' Se conserva el PDF previamente seleccionado.' : ''}</p>{/if}
  <p class="text-xs text-black">Hasta 10 MB. No necesita pegar direcciones. Conserve el original; la carga comprueba formato básico e integridad, no firmas ni validez legal.</p>
</div>
