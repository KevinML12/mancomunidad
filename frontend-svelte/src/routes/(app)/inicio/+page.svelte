<script>
  import { navigationFor } from '$lib/navigation.js';
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import { settledLimited } from '$lib/settled-limited.js';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { fade } from 'svelte/transition';

  let areas = $derived(navigationFor(auth.role,auth.permisos));
  const esPrincipal = key => areas.primary.some(area => area.key === key);
  const areaIcons = {
    proyectos: 'construction', arc: 'view_kanban', financiero: 'account_balance',
    gobernanza: 'gavel', convenios: 'handshake', estadisticas: 'bar_chart',
    inteligencia: 'shield', estructura: 'badge', reclutamiento: 'person_search',
    evaluaciones: 'task_alt', ausencias: 'calendar_today', disciplina: 'shield',
    capacitacion: 'school', transparencia: 'public'
  };
  // Estados de datos reactivos - registros consultados
  let stats = $state({
    proyectosCount: 0,
    inversionTotal: 0,
    avancePromedio: 0,
    arcTotal: 0,
    arcCumplidas: 0,
    arcEfectividad: 0,
    saldoNeto: 0,
    fondosPublicos: 0,
    cooperacion: 0,
    actasCount: 0,
    acuerdosCount: 0,
    conveniosAlertas: 0,
    coberturaAgua: 0,
    coberturaSaneamiento: 0,
    deficitAgua: 0,
    totalViviendas: 0
  });

  let conveniosAlerta = $state([]);
  let loading = $state(true);
  let failedSources = $state([]);
  let roleDashboard = $state(null);
  let requestSequence = 0;
  let sourceReady = $state({});
  let inFlight = false;

  const fetchDashboardData = async () => {
    if (inFlight || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    inFlight = true;
    const sequence = ++requestSequence;
    if (!Object.keys(sourceReady).length) loading = true;
    try {
      const getIfAllowed = (module, path) => esPrincipal(module)
        ? apiClient.get(path)
        : Promise.resolve({ data: null });
      const sources = ['proyectos', 'arc', 'financiero', 'gobernanza', 'convenios', 'estadisticas', 'mi panel'];
      await settledLimited([
        () => getIfAllowed('proyectos', '/proyectos/metricas'),
        () => getIfAllowed('arc', '/arc/metricas'),
        () => getIfAllowed('financiero', '/financiero/balance'),
        () => getIfAllowed('gobernanza', '/gobernanza/metricas'),
        () => getIfAllowed('convenios', '/convenios/metricas'),
        () => getIfAllowed('estadisticas', '/estadisticas/consolidado'),
        () => auth.permisos?.alcance?.tablero !== 'institucional'
          ? apiClient.get('/dashboard')
          : Promise.resolve({ data: null })
      ], 2, (index, result) => {
        if (sequence !== requestSequence) return;
        const key = sources[index];
        if (result.status === 'rejected') {
          if (!failedSources.includes(key)) failedSources = [...failedSources, key];
          return;
        }
        failedSources = failedSources.filter(name => name !== key);
        const data = result.value.data;
        if (!data) return;
        sourceReady[key] = true;
        if (key === 'proyectos') {
          stats.proyectosCount = data.total;
          stats.inversionTotal = data.inversionTotal;
          stats.avancePromedio = data.avancePromedio;
        } else if (key === 'arc') {
          stats.arcTotal = data.total;
          stats.arcCumplidas = data.finalizadas;
          stats.arcEfectividad = data.porcentajeCumplimiento;
        } else if (key === 'financiero') {
          stats.saldoNeto = data.saldoDisponibleTotal || 0;
          stats.fondosPublicos = data.cuentas?.fondosPublicos?.saldo || 0;
          stats.cooperacion = data.cuentas?.cooperacion?.saldo || 0;
        } else if (key === 'gobernanza') {
          stats.actasCount = data.actas;
          stats.acuerdosCount = data.acuerdos;
        } else if (key === 'convenios') {
          stats.conveniosAlertas = data.proximos;
        } else if (key === 'estadisticas') {
          stats.totalViviendas = data.totalViviendas || 0;
          stats.coberturaAgua = data.coberturaAguaPorcentaje || 0;
          stats.coberturaSaneamiento = data.coberturaSaneamientoPorcentaje || 0;
          stats.deficitAgua = data.deficitAguaPorcentaje || 0;
        } else roleDashboard = data;
      });
    } catch (err) {
      console.error('Error al sincronizar métricas del dashboard:', err);
    } finally {
      if (sequence === requestSequence) loading = false;
      inFlight = false;
    }
  };

  onMount(() => {
    fetchDashboardData();
    const refresh = () => { if (document.visibilityState === 'visible') fetchDashboardData(); };
    const slow = navigator.connection?.saveData || ['slow-2g', '2g'].includes(navigator.connection?.effectiveType);
    const timer = window.setInterval(refresh, slow ? 300_000 : 120_000);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); requestSequence++; };
  });


</script>

<svelte:head>
  <title>Inicio · MFN Digital</title>
</svelte:head>

<div class="mfn-home space-y-5 animate-fade-in" in:fade={{ duration: 250 }}>
  {#if failedSources.length > 0}
    <div role="alert" class="rounded-md border border-[#071D49]/25 bg-white/85 p-4 text-sm text-[#071D49]">
      No se pudieron cargar: {failedSources.join(', ')}. Sus indicadores no están disponibles.
      <button onclick={fetchDashboardData} disabled={loading} class="ml-3 font-medium underline disabled:opacity-50">Reintentar</button>
    </div>
  {/if}

  <section class="mfn-home-route" aria-labelledby="bienvenida">
    <div class="mfn-home-route-copy">
      <p class="mfn-home-eyebrow">INICIO / {auth.roleLabel || 'USUARIO'}</p>
      <h1 id="bienvenida">Resumen de trabajo</h1>
      <p>Consulte sus módulos, indicadores y asuntos pendientes.</p>
      <div class="mfn-home-steps" aria-label="Áreas disponibles">
        <span>{areas.primary.length} módulos principales</span><span>{areas.secondary.length} adicionales</span>
      </div>
    </div>
    <div class="mfn-home-route-sheet">
      <p class="mfn-home-eyebrow">ACCESO SEGÚN SU ROL</p>
      <div class="mfn-home-route-inner">
        <div>
          <p class="mfn-home-eyebrow">MÓDULOS PRINCIPALES</p>
          <h2>{areas.primary.length} áreas disponibles</h2>
          <p>{areas.primary.map(area => area.title).join(' · ') || 'Sin módulos asignados'}</p>
        </div>
        <div class="mfn-home-progress">
          <p class="mfn-home-eyebrow">ESTADO DE LA INFORMACIÓN</p>
          <h2>{loading ? 'Cargando indicadores' : failedSources.length ? 'Algunos datos no están disponibles' : 'Indicadores disponibles'}</h2>
          <p>{loading ? 'Consultando los registros de sus áreas.' : failedSources.length ? 'Puede intentar la carga nuevamente desde el aviso superior.' : 'Consulte los indicadores y registros de esta página.'}</p>
        </div>
      </div>
    </div>
  </section>

  <section aria-labelledby="mis-areas" class="space-y-3">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <h2 id="mis-areas" class="text-xl font-medium text-[#071D49]">Mis áreas de trabajo</h2>
      <p class="text-xs text-[#071D49]/65">Accesos principales de su rol</p>
    </div>
    {#if areas.primary.length}
      <div class="mfn-home-areas">
        {#each areas.primary as area}
          <a href={area.path} class="mfn-home-area group">
            <span class="mfn-home-area-icon"><Icon name={areaIcons[area.key] || 'dashboard'} stroke={1.35} className="h-5 w-5" /></span>
            <strong>{area.title} <span aria-hidden="true">↗</span></strong>
            <small>{area.description}</small>
          </a>
        {/each}
      </div>
    {:else}
      <p class="mfn-home-note">No hay áreas principales habilitadas para esta cuenta. Consulte a la administración.</p>
    {/if}
  </section>

  {#if esPrincipal('proyectos') || esPrincipal('arc') || esPrincipal('financiero') || esPrincipal('gobernanza') || esPrincipal('convenios') || esPrincipal('estadisticas') || roleDashboard?.vista === 'personal' || roleDashboard?.vista === 'equipo' || roleDashboard?.vista === 'operativo'}
    <section class="mfn-home-metrics" aria-label="Indicadores de las áreas principales">
      {#if esPrincipal('proyectos')}<a href="/proyectos"><span>Proyectos activos</span><strong>{sourceReady.proyectos ? stats.proyectosCount : '…'}</strong></a>{/if}
      {#if esPrincipal('arc')}<a href="/arc"><span>Metas ARC</span><strong>{sourceReady.arc ? `${stats.arcCumplidas} / ${stats.arcTotal}` : '…'}</strong></a>{/if}
      {#if esPrincipal('financiero')}<a href="/financiero"><span>Saldo registrado</span><strong>{sourceReady.financiero ? `Q ${stats.saldoNeto.toLocaleString()}` : '…'}</strong></a>{/if}
      {#if esPrincipal('gobernanza')}<a href="/gobernanza"><span>Actas registradas</span><strong>{sourceReady.gobernanza ? stats.actasCount : '…'}</strong></a>{/if}
      {#if esPrincipal('convenios')}<a href="/convenios"><span>Convenios próximos a vencer</span><strong>{sourceReady.convenios ? stats.conveniosAlertas : '…'}</strong></a>{/if}
      {#if esPrincipal('estadisticas')}<a href="/estadisticas"><span>Cobertura de agua</span><strong>{sourceReady.estadisticas ? `${stats.coberturaAgua}%` : '…'}</strong></a>{/if}
      {#if roleDashboard?.vista === 'personal'}
        <a href="/gestion-personal/ausencias"><span>Días de vacaciones disponibles</span><strong>{roleDashboard.kpis.diasDisponibles}</strong></a>
        <a href="/gestion-personal/ausencias"><span>Días utilizados</span><strong>{roleDashboard.kpis.diasUsados}</strong></a>
        <a href="/gestion-personal/evaluaciones"><span>Última evaluación</span><strong>{roleDashboard.kpis.ultimoResultado || 'Sin registro'}</strong></a>
      {/if}
      {#if roleDashboard?.vista === 'equipo'}
        <a href="/gestion-personal/ausencias"><span>Ausencias pendientes</span><strong>{roleDashboard.kpis.ausenciasPendientes}</strong></a>
        <a href="/gestion-personal/evaluaciones"><span>Evaluaciones pendientes</span><strong>{roleDashboard.kpis.evaluacionesPendientes}</strong></a>
        <a href="/gestion-personal/ausencias"><span>Personas del equipo</span><strong>{roleDashboard.kpis.tamanoEquipo}</strong></a>
      {/if}
      {#if roleDashboard?.vista === 'operativo'}
        <a href="/gestion-personal/evaluaciones"><span>Evaluaciones pendientes</span><strong>{roleDashboard.kpis.evaluacionesPendientes}</strong></a>
        <a href="/gestion-personal/capacitacion"><span>Capacitaciones sin fecha</span><strong>{roleDashboard.kpis.capacitacionesSinProgramar}</strong></a>
        <a href="/personal"><span>Personal activo</span><strong>{roleDashboard.kpis.totalColaboradores}</strong></a>
      {/if}
    </section>
  {/if}

  {#if areas.primary.length}
    <section class="mfn-home-note" aria-labelledby="pendientes-hoy">
      <h2 id="pendientes-hoy">{roleDashboard?.alertas?.length ? 'Avisos pendientes' : 'Accesos rápidos'}</h2>
      <div class="mt-2 grid gap-1">
        {#if roleDashboard?.vista !== 'institucional' && roleDashboard?.alertas?.length}
          {#each roleDashboard.alertas.slice(0, 3) as alerta}
            <p><span aria-hidden="true">□</span> {alerta.texto}</p>
          {/each}
        {:else}
          {#each areas.primary.slice(0, 2) as area}
            <a href={area.path}><span aria-hidden="true">↗</span> {area.title}</a>
          {/each}
        {/if}
      </div>
    </section>
  {/if}
</div>
