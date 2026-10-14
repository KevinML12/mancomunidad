<script>
  import apiClient from '$lib/apiClient';
  import { toast } from 'svelte-sonner';
  let { reference, tipo, id, label='Abrir PDF' }=$props();
  let busy=$state(false);
  async function open() {
    busy=true;
    const tab=window.open('about:blank','_blank');
    if(tab)tab.opener=null;
    try {
      const {data}=await apiClient.post('/documentos/abrir',{tipo,id});
      if (tab) tab.location.replace(data.url);
      else toast.error('Permita abrir una pestaña para consultar el PDF y vuelva a intentar');
    } catch(err) {tab?.close();toast.error(err.response?.data?.error || 'No se pudo abrir el documento');}
    finally {busy=false;}
  }
</script>
{#if reference}
  {#if reference.startsWith('r2://')}
    <button type="button" disabled={busy} onclick={open} class="text-sm font-semibold text-[#1248AA] underline disabled:opacity-50">{busy ? 'Autorizando…' : label}</button>
    <span class="block text-xs text-[#071D49]">PDF privado · acceso temporal</span>
  {:else if /^https?:\/\//i.test(reference)}
    <a href={reference} target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-[#1248AA] underline">{label}</a>
    <span class="block text-xs text-[#071D49]">Enlace externo histórico</span>
  {:else}<span class="text-sm text-red-800">Referencia de documento no válida</span>{/if}
{:else}<span class="text-sm text-[#071D49]">Sin PDF adjunto</span>{/if}
