<script>
  import apiClient from '$lib/apiClient';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { toast } from 'svelte-sonner';
  let { evidencia, projectId, refresh, offline = false } = $props();
  let decision = $state('Aprobada');
  let motivo = $state('');
  let busy = $state(false);
  async function review(event) {
    event.preventDefault(); busy = true;
    try {
      await apiClient.put(`/proyectos/${projectId}/evidencias/${evidencia.id}/revision`,{estado:decision,motivo,version:evidencia.revisionVersion});
      motivo=''; toast.success('Revisión registrada'); await refresh();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo registrar la revisión');
      if (error.response?.status === 409) await refresh();
    } finally { busy = false; }
  }
</script>
<div class="space-y-2 text-sm border-t border-blue-100 pt-3">
  <strong>Revisión: {evidencia.estadoRevision || 'Pendiente'}</strong>
  <p>Cargada por usuario #{evidencia.cargadoPorId ?? 'sin registro'}.</p>
  <p>{evidencia.recibidoEn ? `Recibida por el servidor: ${new Date(evidencia.recibidoEn).toLocaleString('es-GT')}` : 'Registro histórico sin fecha de recepción acreditada.'}</p>
  <p>{evidencia.integridadArchivo}</p>
  {#if evidencia.sha256}<details><summary>Huella del archivo</summary><code class="break-all text-xs">{evidencia.sha256}</code></details>{/if}
  {#if evidencia.revisiones?.length}
    <details><summary>Historial de revisiones ({evidencia.revisiones.length})</summary>
      {#each evidencia.revisiones as r}<p class="py-2 border-b">{r.estado} · {new Date(r.fecha).toLocaleString('es-GT')} · Usuario #{r.usuarioId}<br />{r.motivo}</p>{/each}
    </details>
  {/if}
  {#if auth.puedeAprobar('proyectos') && !offline && evidencia.urlArchivo?.startsWith('data:image/') && evidencia.sha256}
    <form onsubmit={review} class="space-y-2">
      <label class="block">Decisión<select aria-label={`Decisión de evidencia ${evidencia.id}`} bind:value={decision} class="block w-full bg-white border rounded-lg p-2"><option>Aprobada</option><option>Rechazada</option></select></label>
      <label class="block">Motivo y criterio revisado<textarea aria-label={`Motivo de evidencia ${evidencia.id}`} required maxlength="2000" bind:value={motivo} class="block w-full bg-white border rounded-lg p-2"></textarea></label>
      <button disabled={busy} class="rounded-full bg-[#071D49] text-white px-4 py-2">{busy ? 'Registrando...' : 'Registrar revisión'}</button>
    </form>
  {/if}
</div>
