<script>
  import apiClient from '$lib/apiClient';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { toast } from 'svelte-sonner';
  let { proyecto, refresh, offline = false } = $props();
  let planning = $state(false);
  let busy = $state(false);
  let hitos = $state([{ nombre: '', criterio: '', peso: 100 }]);
  async function save(event) {
    event.preventDefault(); busy = true;
    try {
      await apiClient.post(`/proyectos/${proyecto.id}/hitos`,{hitos});
      planning = false; toast.success('Plan definido. El avance inicia en cero y se calcula con evidencia aprobada'); await refresh();
    } catch (error) { toast.error(error.response?.data?.error || 'No se pudo definir el plan'); }
    finally { busy = false; }
  }
</script>
<section class="glass-light rounded-[24px] p-6 space-y-4">
  <h2 class="text-xl font-semibold text-[#071D49]">Metas y avance verificable</h2>
  {#if proyecto.avancePorHitos}
    <p class="text-sm">Avance calculado: {proyecto.porcentajeAvanceFisico}%. Un hito aporta su peso cuando tiene al menos una evidencia aprobada por Gerencia según su criterio de aceptación. Varias fotos del mismo hito no suman avance adicional.</p>
    {#each proyecto.hitos || [] as hito}
      {@const approved = proyecto.evidencias?.some(e => e.hitoId === hito.id && e.estadoRevision === 'Aprobada')}
      <div class="border-b border-blue-100 py-3">
        <div class="flex justify-between gap-4"><strong>{hito.nombre}</strong><span>{hito.peso / 100}% · {approved ? 'Con evidencia aprobada' : 'Pendiente de aprobación'}</span></div>
        <p class="text-sm mt-1">{hito.criterio}</p>
      </div>
    {/each}
  {:else}
    <p class="text-sm">Avance manual registrado: {proyecto.porcentajeAvanceFisico}%. Este proyecto todavía no tiene un plan de hitos.</p>
    {#if auth.puedeEditar('proyectos') && !offline}
      <button class="rounded-full bg-[#071D49] text-white px-5 py-2" onclick={() => planning = !planning}>Definir plan de hitos</button>
    {/if}
  {/if}
  {#if planning}
    <form onsubmit={save} class="space-y-4 bg-white rounded-2xl p-5">
      <p class="text-sm">Use metas acordadas con la institución. Los pesos deben sumar 100%. Al activar el plan, el avance manual se reemplaza por cero. El plan queda fijo; esta versión no permite reemplazarlo.</p>
      {#each hitos as hito, i}
        <fieldset class="border border-blue-100 rounded-xl p-3 space-y-2">
          <legend>Hito {i + 1}</legend>
          <label class="block">Nombre<input aria-label={`Nombre del hito ${i+1}`} required maxlength="200" bind:value={hito.nombre} class="block w-full border rounded-lg p-2" /></label>
          <label class="block">Criterio para aceptar la evidencia<textarea aria-label={`Criterio del hito ${i+1}`} required maxlength="2000" bind:value={hito.criterio} class="block w-full border rounded-lg p-2"></textarea></label>
          <label class="block">Peso (%)<input aria-label={`Peso del hito ${i+1}`} type="number" min="0.01" max="100" step="0.01" required bind:value={hito.peso} class="block border rounded-lg p-2" /></label>
          {#if hitos.length > 1}<button type="button" onclick={() => hitos = hitos.filter((_,index) => index !== i)}>Quitar hito</button>{/if}
        </fieldset>
      {/each}
      <p>Total: {hitos.reduce((sum,h) => sum+Number(h.peso || 0),0).toFixed(2)}%</p>
      <button type="button" disabled={hitos.length >= 30 || busy} onclick={() => hitos = [...hitos,{nombre:'',criterio:'',peso:0}]}>Añadir hito</button>
      <button disabled={busy} class="ml-4 rounded-full bg-[#071D49] text-white px-5 py-2">{busy ? 'Guardando...' : 'Activar plan y calcular avance'}</button>
    </form>
  {/if}
</section>
