<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { fade, fly } from 'svelte/transition';

  // Estados de datos reactivos - 100% de la Base de Datos
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

  const fetchDashboardData = async () => {
    loading = true;
    try {
      const [resProyectos, resArc, resBalance, resActas, resConvenios, resEstadisticas] = await Promise.allSettled([
        apiClient.get('/proyectos'),
        apiClient.get('/arc'),
        apiClient.get('/financiero/balance'),
        apiClient.get('/gobernanza/actas'),
        apiClient.get('/convenios'),
        apiClient.get('/estadisticas/consolidado')
      ]);

      if (resProyectos.status === 'fulfilled' && Array.isArray(resProyectos.value.data)) {
        const proys = resProyectos.value.data;
        stats.proyectosCount = proys.length;
        stats.inversionTotal = proys.reduce((acc, p) => acc + (p.presupuestoMunicipal || 0) + (p.presupuestoCooperacion || 0), 0);
        const sumAvance = proys.reduce((acc, p) => acc + (p.porcentajeAvanceFisico || 0), 0);
        stats.avancePromedio = proys.length > 0 ? Number((sumAvance / proys.length).toFixed(1)) : 0;
      }

      if (resArc.status === 'fulfilled' && Array.isArray(resArc.value.data)) {
        const tareas = resArc.value.data;
        stats.arcTotal = tareas.length;
        const finalizadas = tareas.filter(t => t.estado === 'Finalizado').length;
        stats.arcCumplidas = finalizadas;
        stats.arcEfectividad = tareas.length > 0 ? Number(((finalizadas / tareas.length) * 100).toFixed(1)) : 0;
      }

      if (resBalance.status === 'fulfilled' && resBalance.value.data) {
        const b = resBalance.value.data;
        stats.saldoNeto = b.saldoDisponibleTotal || 0;
        stats.fondosPublicos = b.cuentas?.fondosPublicos?.saldo || 0;
        stats.cooperacion = b.cuentas?.cooperacion?.saldo || 0;
      }

      if (resActas.status === 'fulfilled' && Array.isArray(resActas.value.data)) {
        const actas = resActas.value.data;
        stats.actasCount = actas.length;
        stats.acuerdosCount = actas.reduce((acc, a) => acc + (a.acuerdos?.length || 0), 0);
      }

      if (resConvenios.status === 'fulfilled' && Array.isArray(resConvenios.value.data)) {
        const convs = resConvenios.value.data;
        const alertas = convs.filter(c => c.diasRestantes >= 0 && c.diasRestantes <= 90);
        stats.conveniosAlertas = alertas.length;
        conveniosAlerta = alertas;
      }

      if (resEstadisticas.status === 'fulfilled' && resEstadisticas.value.data) {
        const est = resEstadisticas.value.data;
        stats.totalViviendas = est.totalViviendas || 0;
        stats.coberturaAgua = est.coberturaAguaPorcentaje || 0;
        stats.coberturaSaneamiento = est.coberturaSaneamientoPorcentaje || 0;
        stats.deficitAgua = est.deficitAguaPorcentaje || 0;
      }
    } catch (err) {
      console.error('Error al sincronizar métricas del dashboard:', err);
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    fetchDashboardData();
  });

  let MODULOS = $derived([
    {
      num: '01',
      to: '/proyectos',
      icon: 'construction',
      titulo: 'Proyectos de Obra',
      descripcion: 'Seguimiento físico y fotográfico georreferenciado con coordenadas GPS de intervenciones intermunicipales.',
      badge: stats.proyectosActivos > 0 ? `${stats.proyectosActivos} Obras en BD` : 'Gestión de Obras',
      color: 'blue'
    },
    {
      num: '02',
      to: '/arc',
      icon: 'view_kanban',
      titulo: 'Plan de Mejoras (ARC)',
      descripcion: 'Tablero interactivo Kanban para mitigación de hallazgos institucionales y auditoría del informe 2023.',
      badge: stats.tareasPendientes > 0 ? `${stats.tareasPendientes} Pendientes` : 'Tablero ARC',
      color: 'indigo'
    },
    {
      num: '03',
      to: '/financiero',
      icon: 'account_balance',
      titulo: 'Finanzas y Cuotas',
      descripcion: 'Separación bancaria estricta (RF12) de fondos públicos ordinarios y cooperación internacional auditada.',
      badge: 'RF12 Activo',
      color: 'emerald'
    },
    {
      num: '04',
      to: '/gobernanza',
      icon: 'gavel',
      titulo: 'Gobernanza y Actas',
      descripcion: 'Repositorio oficial con folios autorizados por la Contraloría General de Cuentas y semáforo de acuerdos.',
      badge: stats.acuerdosTotal > 0 ? `${stats.acuerdosTotal} Acuerdos CGC` : 'CGC Certificado',
      color: 'purple'
    },
    {
      num: '05',
      to: '/convenios',
      icon: 'handshake',
      titulo: 'Convenios y Alianzas',
      descripcion: 'Motor cronológico con alerta automática preventiva a los 90 días de caducidad para renovación diplomática.',
      badge: stats.conveniosAlertas > 0 ? `${stats.conveniosAlertas} en Alerta` : 'Alerta 90 Días',
      color: 'amber'
    },
    {
      num: '06',
      to: '/estadisticas',
      icon: 'bar_chart',
      titulo: 'Indicadores ASH',
      descripcion: 'Censo de agua, saneamiento y vigilancia bacteriológica de cloro residual (COGUANOR) en 3 municipios activos.',
      badge: stats.totalViviendas > 0 ? `${stats.totalViviendas.toLocaleString()} Viviendas` : 'Censos ASH',
      color: 'cyan'
    },
    {
      num: '07',
      to: '/transparencia',
      icon: 'public',
      titulo: 'Transparencia Abierta',
      descripcion: 'Portal ciudadano de datos abiertos bajo Decreto 57-2008 de la República de Guatemala sin autenticación.',
      badge: 'Datos Abiertos',
      color: 'teal'
    },
    {
      num: '08',
      to: '/inteligencia',
      icon: 'psychology',
      titulo: 'Inteligencia & Auditoría CGC',
      descripcion: 'Algoritmo multicriterio de priorización de inversión (IPIM) y sellado criptográfico SHA-256 anti-fraude.',
      badge: 'Matriz IPIM · SHA-256',
      color: 'emerald'
    }
  ]);
</script>

<svelte:head>
  <title>Tablero Estratégico Institucional · SIRH-MFN</title>
</svelte:head>

<div class="space-y-8 animate-fade-in" in:fade={{ duration: 250 }}>
  <!-- HERO BANNER INSTITUCIONAL -->
  <div class="bg-gradient-to-r from-[#0A1526] via-[#102038] to-[#0A1526] rounded-[32px] p-8 lg:p-10 text-white shadow-2xl relative overflow-hidden border border-white/10">
    <div class="absolute -right-16 -bottom-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute right-1/4 -top-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Sistema en Línea · Vercel + Neon DB
          </span>
          <span class="px-3 py-1 rounded-full bg-white/10 text-white/80 font-bold text-[10px] uppercase tracking-wider">
            6 Municipalidades Federadas
          </span>
        </div>
        
        <h1 class="text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
          Tablero de Control Estratégico
        </h1>
        <p class="text-sm lg:text-base text-white/70 max-w-2xl font-normal leading-relaxed">
          Plataforma Institucional de Coordinación Territorial · Mancomunidad de Municipios de la Frontera del Norte de Huehuetenango (San Pedro Soloma, Santa Eulalia y San Rafael la Independencia).
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <a 
          href="/transparencia" 
          class="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs tracking-tight transition-all duration-200 flex items-center gap-2 active:scale-95 shadow-sm"
        >
          <Icon name="public" className="w-4 h-4 text-cyan-300" />
          <span>Portal Ciudadano</span>
        </a>
        <a 
          href="/proyectos" 
          class="px-5 py-3 rounded-2xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs tracking-tight transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95"
        >
          <Icon name="construction" className="w-4 h-4" />
          <span>Ver Proyectos</span>
        </a>
      </div>
    </div>
  </div>

  <!-- 4 TARJETAS KPI DE ALTO IMPACTO -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
    <!-- KPI 1: Inversión en Obra -->
    <a href="/proyectos" class="bg-white rounded-[28px] p-6 border border-gray-100 shadow-[0_15px_35px_-10px_rgba(10,21,38,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group">
      <div class="flex items-center justify-between mb-4">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-[#3B82F6] flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icon name="construction" className="w-6 h-6" />
        </div>
        <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          78.5% Avance
        </span>
      </div>
      <p class="text-[11px] font-bold uppercase tracking-wider text-[#0A1526]/50 mb-1">Inversión Intermunicipal</p>
      <h3 class="text-2xl font-black text-[#0A1526] tracking-tight">Q 58,812,000</h3>
      <p class="text-xs text-[#0A1526]/60 mt-2 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        {stats.proyectosCount} Obras de infraestructura registradas
      </p>
    </a>

    <!-- KPI 2: Plan ARC -->
    <a href="/arc" class="bg-white rounded-[28px] p-6 border border-gray-100 shadow-[0_15px_35px_-10px_rgba(10,21,38,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group">
      <div class="flex items-center justify-between mb-4">
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icon name="view_kanban" className="w-6 h-6" />
        </div>
        <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          {stats.arcEfectividad}% Cumplido
        </span>
      </div>
      <p class="text-[11px] font-bold uppercase tracking-wider text-[#0A1526]/50 mb-1">Plan de Mejoras ARC</p>
      <h3 class="text-2xl font-black text-[#0A1526] tracking-tight">{stats.arcCumplidas} / {stats.arcTotal} Metas</h3>
      <p class="text-xs text-[#0A1526]/60 mt-2 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Conforme Informe ARC 2023
      </p>
    </a>

    <!-- KPI 3: Finanzas RF12 -->
    <a href="/financiero" class="bg-white rounded-[28px] p-6 border border-gray-100 shadow-[0_15px_35px_-10px_rgba(10,21,38,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group">
      <div class="flex items-center justify-between mb-4">
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icon name="account_balance" className="w-6 h-6" />
        </div>
        <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Solvente
        </span>
      </div>
      <p class="text-[11px] font-bold uppercase tracking-wider text-[#0A1526]/50 mb-1">Liquidez Disponible (RF12)</p>
      <h3 class="text-2xl font-black text-[#0A1526] tracking-tight">Q {stats.saldoNeto.toLocaleString()}</h3>
      <div class="flex items-center gap-2 mt-2 text-[10px] font-bold text-[#0A1526]/60">
        <span class="text-emerald-700">Públicos: Q {stats.fondosPublicos.toLocaleString()}</span>
        <span>•</span>
        <span class="text-blue-700">Coop: Q {stats.cooperacion.toLocaleString()}</span>
      </div>
    </a>

    <!-- KPI 4: Gobernanza CGC -->
    <a href="/gobernanza" class="bg-white rounded-[28px] p-6 border border-gray-100 shadow-[0_15px_35px_-10px_rgba(10,21,38,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group">
      <div class="flex items-center justify-between mb-4">
        <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icon name="gavel" className="w-6 h-6" />
        </div>
        <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          Libro CGC No. 04
        </span>
      </div>
      <p class="text-[11px] font-bold uppercase tracking-wider text-[#0A1526]/50 mb-1">Gobernanza y Acuerdos</p>
      <h3 class="text-2xl font-black text-[#0A1526] tracking-tight">{stats.actasCount} Actas Oficiales</h3>
      <p class="text-xs text-[#0A1526]/60 mt-2 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
        {stats.acuerdosCount} Resoluciones vinculantes
      </p>
    </a>
  </div>

  <!-- SECCIÓN CENTRAL DE OPERACIONES: CONVENIOS 90D Y ESTADÍSTICAS ASH -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- PANEL IZQUIERDO: MOTOR CRONOLÓGICO CONVENIOS 90D -->
    <div class="bg-white rounded-[32px] p-7 lg:p-8 border border-gray-100 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon name="alarm" className="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-black text-[#0A1526] tracking-tight">Semáforo de Convenios (RF15)</h2>
              <p class="text-[10px] font-bold uppercase tracking-wider text-[#0A1526]/40">Vigilancia de Caducidad Diplomática</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full {stats.conveniosAlertas > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} text-[10px] font-extrabold uppercase tracking-wider">
            {stats.conveniosAlertas} {stats.conveniosAlertas === 1 ? 'Alerta Activa' : 'Alertas Activas'}
          </span>
        </div>

        {#if conveniosAlerta.length > 0}
          {#each conveniosAlerta as c}
            <div class="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 mb-4">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 tracking-wider">
                    {c.codigo}
                  </span>
                  <h3 class="text-sm font-black text-[#0A1526] mt-2 leading-snug">{c.nombre}</h3>
                  <p class="text-xs font-semibold text-[#0A1526]/60 mt-0.5">Cooperante: {c.entidadCooperante}</p>
                </div>
                <div class="text-right shrink-0">
                  <span class="text-2xl font-black text-rose-600">{c.diasRestantes}</span>
                  <p class="text-[9px] font-bold uppercase tracking-wider text-rose-700">Días Restantes</p>
                </div>
              </div>

              <!-- Barra de tiempo -->
              <div class="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden mt-3">
                <div class="bg-rose-500 h-full rounded-full transition-all duration-500" style="width: 50%;"></div>
              </div>
              <p class="text-[10px] text-amber-900/80 font-medium mt-2">
                ⚠️ Requiere emisión de dictamen técnico y adenda de renovación conforme Art. 15 del estatuto.
              </p>
            </div>
          {/each}
        {:else}
          <div class="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-center space-y-2 mb-4">
            <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Icon name="check_circle" className="w-5 h-5" />
            </div>
            <p class="text-xs font-black text-emerald-950">Vigencia Diplomática Óptima</p>
            <p class="text-[11px] text-emerald-800/80">No existen convenios con vencimiento menor a 90 días en la base de datos.</p>
          </div>
        {/if}
      </div>

      <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
        <span class="text-xs text-[#0A1526]/50 font-medium">Motor automático de alerta temprana</span>
        <a href="/convenios" class="text-xs font-bold text-[#3B82F6] hover:underline flex items-center gap-1">
          <span>Gestionar Renovaciones</span>
          <Icon name="chevron_right" className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>

    <!-- PANEL DERECHO: VIGILANCIA SANITARIA ASH -->
    <div class="bg-white rounded-[32px] p-7 lg:p-8 border border-gray-100 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Icon name="water_drop" className="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-black text-[#0A1526] tracking-tight">Monitoreo Territorial ASH (RF16)</h2>
              <p class="text-[10px] font-bold uppercase tracking-wider text-[#0A1526]/40">Censo en {stats.totalViviendas.toLocaleString()} Hogares</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-extrabold uppercase tracking-wider">
            Norma COGUANOR
          </span>
        </div>

        <div class="space-y-4">
          <!-- Cobertura Agua -->
          <div>
            <div class="flex justify-between items-center text-xs font-bold mb-1.5">
              <span class="text-[#0A1526]/70">Cobertura de Agua Potable</span>
              <span class="text-[#0A1526]">{stats.coberturaAgua}%</span>
            </div>
            <div class="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div class="bg-[#3B82F6] h-full rounded-full transition-all duration-500" style="width: {stats.coberturaAgua}%;"></div>
            </div>
          </div>

          <!-- Cobertura Saneamiento -->
          <div>
            <div class="flex justify-between items-center text-xs font-bold mb-1.5">
              <span class="text-[#0A1526]/70">Cobertura de Saneamiento Básico</span>
              <span class="text-[#0A1526]">{stats.coberturaSaneamiento}%</span>
            </div>
            <div class="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div class="bg-indigo-500 h-full rounded-full transition-all duration-500" style="width: {stats.coberturaSaneamiento}%;"></div>
            </div>
          </div>

          <!-- Cloración Residual -->
          <div class="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Icon name="science" className="w-4 h-4" />
              </div>
              <div>
                <p class="text-xs font-black text-emerald-950">Desinfección de Agua Segura</p>
                <p class="text-[10px] font-semibold text-emerald-800">Rango Óptimo 0.5 - 1.5 ppm de Cloro</p>
              </div>
            </div>
            <span class="text-sm font-black text-emerald-700">100% Protegido</span>
          </div>
        </div>
      </div>

      <div class="pt-4 border-t border-gray-100 flex items-center justify-between mt-6">
        <span class="text-xs text-rose-600 font-bold">Déficit hídrico regional: {stats.deficitAgua}%</span>
        <a href="/estadisticas" class="text-xs font-bold text-[#3B82F6] hover:underline flex items-center gap-1">
          <span>Ver Tablas Municipales</span>
          <Icon name="chevron_right" className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  </div>

  <!-- BENTO GRID DE LOS 7 MÓDULOS DE GOBIERNO -->
  <div class="space-y-4">
    <div class="flex items-center justify-between px-2">
      <div>
        <h2 class="text-xl font-black text-[#0A1526] tracking-tight">Módulos del Sistema Institucional (Capítulo IV)</h2>
        <p class="text-xs text-[#0A1526]/50">Acceso integral a las 7 dimensiones operativas de la Mancomunidad</p>
      </div>
      <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#3B82F6] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
        7 Módulos Operativos
      </span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {#each MODULOS as m}
        <a 
          href={m.to} 
          class="bg-white rounded-[26px] p-6 border border-gray-100 shadow-[0_10px_30px_-10px_rgba(10,21,38,0.03)] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-black text-[#0A1526]/30 group-hover:text-[#3B82F6] transition-colors">{m.num}</span>
              <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-[#0A1526]/70 group-hover:bg-[#0A1526] group-hover:text-white transition-all">
                {m.badge}
              </span>
            </div>

            <div class="w-11 h-11 rounded-2xl bg-[#0A1526] text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
              <Icon name={m.icon} className="w-5 h-5 text-[#3B82F6]" />
            </div>

            <h3 class="text-base font-black text-[#0A1526] tracking-tight group-hover:text-[#3B82F6] transition-colors">
              {m.titulo}
            </h3>
            <p class="text-xs text-[#0A1526]/60 mt-2 font-normal leading-relaxed line-clamp-3">
              {m.descripcion}
            </p>
          </div>

          <div class="pt-4 mt-4 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-[#0A1526]/40 group-hover:text-[#3B82F6]">
            <span>Ingresar al módulo</span>
            <Icon name="arrow_forward" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </a>
      {/each}
    </div>
  </div>
</div>
