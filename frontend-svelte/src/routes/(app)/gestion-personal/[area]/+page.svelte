<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import apiClient from '$lib/apiClient';
  import { AREAS } from '$lib/navigation.js';
  import { auth } from '$lib/stores/auth.svelte.js';

  const endpoints = {
    reclutamiento: '/convocatorias',
    evaluaciones: '/evaluaciones',
    ausencias: '/ausencias',
    disciplina: '/disciplina',
    capacitacion: '/capacitaciones'
  };
  let area = $derived($page.params.area);
  let config = $derived(AREAS.find(item => item.key === area));
  let records = $state([]);
  let loading = $state(true);
  let error = $state('');
  let success = $state('');
  let submitting = $state(false);
  let requestForm = $state({ tipo: 'Vacaciones', desde: '', hasta: '', motivo: '' });

  const dateLabel = value => value ? new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(new Date(value)) : 'Sin fecha';
  const titleFor = record => {
    if (area === 'reclutamiento') return record.puesto?.nombre || `Convocatoria ${record.id}`;
    if (area === 'capacitacion') return record.nombreHerramienta;
    if (area === 'ausencias') return `${record.tipo} · ${record.colaborador?.nombre || 'Mi solicitud'}`;
    return record.colaborador?.nombre || `Registro ${record.id}`;
  };
  const detailFor = record => {
    if (area === 'reclutamiento') return `${record.tipo} · Cierre: ${dateLabel(record.fechaCierre)} · ${record.candidatos?.length || 0} candidatos`;
    if (area === 'evaluaciones') return `Período ${record.periodo} · ${dateLabel(record.fecha || record.createdAt)}`;
    if (area === 'ausencias') return `${dateLabel(record.desde)} al ${dateLabel(record.hasta)}`;
    if (area === 'disciplina') return `${record.tipo} · ${dateLabel(record.fecha)} · ${record.descripcion}`;
    return `Fecha: ${dateLabel(record.fecha)}`;
  };
  const statusFor = record => {
    if (area === 'capacitacion') {
      const own = record.certificaciones?.find(item => item.colaboradorId === auth.user?.colaboradorId);
      return own?.firmado ? 'Certificada' : 'Disponible';
    }
    if (area === 'disciplina') return record.sancion?.resultado || 'En seguimiento';
    return record.estado || record.resultado || 'Registrado';
  };

  async function loadRecords() {
    if (!endpoints[area] || !auth.puedeVer(area)) return;
    loading = true;
    error = '';
    try {
      const { data } = await apiClient.get(endpoints[area]);
      records = Array.isArray(data) ? data : [];
    } catch (err) {
      error = err.response?.data?.error || 'No se pudieron cargar los registros. Intente de nuevo.';
    } finally {
      loading = false;
    }
  }

  async function requestAbsence(event) {
    event.preventDefault();
    success = '';
    error = '';
    if (!auth.user?.colaboradorId) {
      error = 'Su cuenta no tiene un expediente de colaborador vinculado.';
      return;
    }
    if (requestForm.hasta < requestForm.desde) {
      error = 'La fecha final debe ser igual o posterior a la inicial.';
      return;
    }
    submitting = true;
    try {
      await apiClient.post('/ausencias', { colaboradorId: auth.user.colaboradorId, ...requestForm });
      requestForm = { tipo: 'Vacaciones', desde: '', hasta: '', motivo: '' };
      success = 'Solicitud registrada. Puede verla en la lista de esta página.';
      await loadRecords();
    } catch (err) {
      error = err.response?.data?.error || 'No se pudo registrar la solicitud.';
    } finally {
      submitting = false;
    }
  }

  onMount(loadRecords);
</script>

<svelte:head><title>{config?.title || 'Gestión de personal'} · MFN Digital</title></svelte:head>

<div class="space-y-7">
  <header class="mfn-module-header">
    <p class="text-xs font-medium uppercase tracking-widest text-[#071D49]/55">Gestión de personal</p>
    <h1 class="mt-2 text-3xl font-medium text-[#071D49]">{config?.title || 'Área no disponible'}</h1>
    <p class="mt-2 text-sm text-[#071D49]/70">{config?.description || 'Consulte las áreas habilitadas para su cuenta.'}</p>
  </header>

  {#if area === 'ausencias' && auth.user?.colaboradorId}
    <section class="mfn-sketch-card p-5 md:p-6" aria-labelledby="nueva-ausencia">
      <h2 id="nueva-ausencia" class="text-lg font-medium text-[#071D49]">Solicitar ausencia</h2>
      <p class="mt-1 text-sm text-[#071D49]/65">La solicitud queda pendiente hasta que una persona autorizada la resuelva.</p>
      <form class="mt-5 grid gap-4 sm:grid-cols-2" onsubmit={requestAbsence}>
        <label class="grid gap-1 text-sm font-medium text-[#071D49]">Tipo
          <select class="rounded-[4px] p-3" bind:value={requestForm.tipo}>
            <option>Vacaciones</option><option>Permiso</option><option>Licencia</option>
          </select>
        </label>
        <label class="grid gap-1 text-sm font-medium text-[#071D49]">Motivo (opcional)
          <input class="rounded-[4px] p-3" type="text" bind:value={requestForm.motivo} />
        </label>
        <label class="grid gap-1 text-sm font-medium text-[#071D49]">Desde
          <input class="rounded-[4px] p-3" type="date" required bind:value={requestForm.desde} />
        </label>
        <label class="grid gap-1 text-sm font-medium text-[#071D49]">Hasta
          <input class="rounded-[4px] p-3" type="date" required min={requestForm.desde} bind:value={requestForm.hasta} />
        </label>
        <button class="w-fit rounded-[4px] bg-[#071D49] px-5 py-3 text-sm font-medium text-white disabled:opacity-50" disabled={submitting}>{submitting ? 'Guardando…' : 'Enviar solicitud'}</button>
      </form>
    </section>
  {/if}

  {#if error}<p role="alert" class="rounded-[4px] border border-[#071D49]/20 bg-white p-4 text-sm text-[#071D49]">{error}</p>{/if}
  {#if success}<p role="status" class="rounded-[4px] border border-[#071D49]/20 bg-white p-4 text-sm text-[#071D49]">{success}</p>{/if}

  <section aria-labelledby="registros-personal">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 id="registros-personal" class="text-xl font-medium text-[#071D49]">{area === 'ausencias' ? 'Solicitudes' : 'Registros'}</h2>
      <button class="rounded-[4px] border border-[#071D49]/20 bg-white/70 px-4 py-2 text-sm font-medium text-[#071D49]" onclick={loadRecords}>Actualizar</button>
    </div>
    {#if loading}
      <p role="status" class="text-sm text-[#071D49]/70">Cargando registros…</p>
    {:else if !error && records.length === 0}
      <p class="mfn-sketch-card p-6 text-sm text-[#071D49]/70">Aún no hay registros disponibles para su cuenta.</p>
    {:else}
      <div class="grid gap-3">
        {#each records as record (record.id)}
          <article class="mfn-sketch-card flex flex-wrap items-start justify-between gap-4 p-5">
            <div class="min-w-0">
              <h3 class="font-medium text-[#071D49]">{titleFor(record)}</h3>
              <p class="mt-1 text-sm text-[#071D49]/70">{detailFor(record)}</p>
            </div>
            <span class="rounded-[4px] border border-[#071D49]/15 bg-white/70 px-3 py-1 text-xs font-medium text-[#071D49]">{statusFor(record)}</span>
          </article>
        {/each}
      </div>
    {/if}
  </section>
</div>
