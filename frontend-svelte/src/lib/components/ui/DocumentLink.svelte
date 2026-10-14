<script>
  import apiClient from '$lib/apiClient';
  import { toast } from 'svelte-sonner';
  import { FileText, ArrowUpRight, LockKeyhole } from 'lucide-svelte';
  import { documentKind, openPrivatePdf } from '$lib/documents/upload.js';
  let { reference, tipo, id, label='Abrir PDF' }=$props();
  let busy=$state(false);
  const kind=$derived(documentKind(reference));
  async function open(){
    if(busy)return;busy=true;
    try{await openPrivatePdf({openWindow:()=>window.open('about:blank','_blank'),authorize:()=>apiClient.post('/documentos/abrir',{tipo,id})});}
    catch(err){toast.error(err.response?.data?.error || err.message || 'No se pudo abrir el documento');}
    finally{busy=false;}
  }
</script>
{#if kind==='private' || kind==='external'}
<div class="mfn-document-link"><FileText size={19}/><div>
{#if kind==='private'}<button type="button" disabled={busy} onclick={open}>{busy ? 'Autorizando acceso…' : label}<ArrowUpRight size={15}/></button><small><LockKeyhole size={11}/> Acceso privado · enlace temporal</small>
{:else}<a href={reference} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={15}/></a><small>Enlace externo · archivo anterior</small>{/if}
</div></div>
{:else if kind==='invalid'}<span class="mfn-document-missing">La referencia del PDF necesita revisión</span>
{:else}<span class="mfn-document-missing"><FileText size={15}/> Sin documento adjunto</span>{/if}
