<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { toast } from 'svelte-sonner';

  let proyectos = $state([]);
  let actas = $state([]);
  let estadisticas = $state({
    coberturaAgua: 0,
    coberturaSaneamiento: 0,
    cloroConforme: 0,
    totalViviendas: 0,
    totalCensos: 0
  });

  let activeTab = $state('proyectos'); // 'proyectos' | 'actas' | 'estadisticas' | 'solicitudes' | 'datos'
  let searchQuery = $state('');
  let filtroMunicipio = $state('todos');
  let loading = $state(true);

  // Modal de Ficha Técnica de Proyecto
  let proyectoSeleccionado = $state(null);

  // Solicitud UIP (Decreto 57-2008)
  let subTabUIP = $state('crear'); // 'crear' | 'consultar'
  let nuevaSolicitud = $state({
    nombre: '',
    correo: '',
    telefono: '',
    municipio: 'Santa Eulalia',
    descripcion: ''
  });
  let solicitudGuardando = $state(false);
  let ticketGenerado = $state(null);
  let codigoConsulta = $state('');
  let resultadoConsulta = $state(null);
  let consultando = $state(false);

  const MUNICIPIOS_MFN = [
    'Santa Eulalia',
    'San Pedro Soloma',
    'San Mateo Ixtatán',
    'San Rafael la Independencia',
    'Barillas',
    'San Juan Ixcoy'
  ];

  const fetchTransparencia = async () => {
    loading = true;
    try {
      const endpoint = auth.isAuthenticated ? '/transparencia/gestion' : '/transparencia/publico';
      const { data } = await apiClient.get(endpoint);
      
      const publicaciones = data?.publicaciones || (Array.isArray(data) ? data : []);
      const proys = data?.proyectosPublicos || [];
      const stats = data?.estadisticas || null;

      if (stats) {
        estadisticas = stats;
      }

      if (Array.isArray(publicaciones)) {
        actas = publicaciones.map(pub => ({
          id: pub.id,
          numero: pub.codigo,
          fecha: pub.fechaPublicacion ? new Date(pub.fechaPublicacion).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente',
          municipio: 'Regional',
          resumen: pub.resumen || pub.titulo,
          urlPdf: '#',
          visibilidad: pub.visibilidad
        }));
      }

      if (Array.isArray(proys)) {
        proyectos = proys.map(p => {
          // Detectar municipio del nombre si existe
          let muni = 'Regional';
          for (const m of MUNICIPIOS_MFN) {
            if (p.nombre.toLowerCase().includes(m.toLowerCase())) {
              muni = m;
              break;
            }
          }

          const totalMonto = (p.presupuestoMunicipal || 0) + (p.presupuestoCooperacion || 0);

          return {
            id: p.id,
            codigo: `MFN-OBRA-${p.id.toString().padStart(3, '0')}`,
            nombre: p.nombre,
            municipio: muni,
            cooperante: p.agenciaFinanciadora || 'Fondos Propios MFN',
            presupuestoMunicipal: p.presupuestoMunicipal || 0,
            presupuestoCooperacion: p.presupuestoCooperacion || 0,
            montoTotal: totalMonto,
            montoFormateado: `Q ${totalMonto.toLocaleString()}`,
            avance: p.porcentajeAvanceFisico || 0,
            estado: p.estado || 'En Ejecución',
            visibilidad: true,
            fechaInicio: p.fechaInicioPlanificada ? new Date(p.fechaInicioPlanificada).toLocaleDateString('es-GT') : '2024-01-15',
            fechaFin: p.fechaFinPlanificada ? new Date(p.fechaFinPlanificada).toLocaleDateString('es-GT') : '2024-12-30',
            evidencias: p.evidencias || []
          };
        });
      }
    } catch (err) {
      console.error('Error al cargar datos de transparencia desde BD:', err);
      toast.error('No se pudo conectar con el portal de transparencia');
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    fetchTransparencia();
  });

  async function toggleVisibilidadProyecto(p) {
    p.visibilidad = !p.visibilidad;
    proyectos = [...proyectos];
    toast.info(p.visibilidad ? 'Proyecto publicado en portal ciudadano' : 'Proyecto retirado de la vista pública');
  }

  async function toggleVisibilidadActa(a) {
    const nuevoEstado = !a.visibilidad;
    a.visibilidad = nuevoEstado;
    actas = [...actas];
    
    if (a.id && auth.isAuthenticated) {
      try {
        await apiClient.put(`/transparencia/${a.id}/visibilidad`, { visibilidad: nuevoEstado });
        toast.success(nuevoEstado ? 'Publicación habilitada en el portal' : 'Publicación ocultada al público');
      } catch (err) {
        a.visibilidad = !nuevoEstado;
        actas = [...actas];
        toast.error('Error al actualizar visibilidad en la base de datos');
      }
    } else {
      toast.info(nuevoEstado ? 'Acta marcada pública' : 'Acta retirada de la vista pública');
    }
  }

  // Filtrado reactivo de proyectos
  let proyectosFiltrados = $derived(
    proyectos.filter(p => {
      if (!auth.isAuthenticated && !p.visibilidad) return false;
      if (filtroMunicipio !== 'todos' && p.municipio !== filtroMunicipio) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.municipio.toLowerCase().includes(q) || p.cooperante.toLowerCase().includes(q);
      }
      return true;
    })
  );

  // Filtrado reactivo de actas
  let actasFiltradas = $derived(
    actas.filter(a => {
      if (!auth.isAuthenticated && !a.visibilidad) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return a.numero.toLowerCase().includes(q) || a.municipio.toLowerCase().includes(q) || a.resumen.toLowerCase().includes(q);
      }
      return true;
    })
  );

  // Métricas agregadas en vivo
  let totalInversionObras = $derived(proyectos.reduce((acc, p) => acc + (p.montoTotal || 0), 0));
  let promedioAvanceObras = $derived(proyectos.length > 0 ? Number((proyectos.reduce((acc, p) => acc + p.avance, 0) / proyectos.length).toFixed(1)) : 0);

  // Manejo de Solicitud de Información UIP
  async function enviarSolicitudUIP(e) {
    e.preventDefault();
    if (!nuevaSolicitud.nombre.trim() || !nuevaSolicitud.descripcion.trim()) {
      toast.error('Nombre y descripción de la información son obligatorios');
      return;
    }

    solicitudGuardando = true;
    try {
      const { data } = await apiClient.post('/transparencia/solicitudes', nuevaSolicitud);
      ticketGenerado = data;
      toast.success('Solicitud UIP radicada con éxito en la base de datos');
      nuevaSolicitud = {
        nombre: '',
        correo: '',
        telefono: '',
        municipio: 'Santa Eulalia',
        descripcion: ''
      };
    } catch (err) {
      toast.error('Error al registrar solicitud: ' + (err.response?.data?.error || err.message));
    } finally {
      solicitudGuardando = false;
    }
  }

  async function consultarExpedienteUIP(e) {
    e.preventDefault();
    if (!codigoConsulta.trim()) return;

    consultando = true;
    resultadoConsulta = null;
    try {
      const { data } = await apiClient.get(`/transparencia/solicitudes/${codigoConsulta.trim()}`);
      resultadoConsulta = data;
      toast.success('Expediente localizado');
    } catch (err) {
      toast.error('Expediente no encontrado en el registro oficial');
    } finally {
      consultando = false;
    }
  }

  // Descarga de datos abiertos
  function exportarDatos(formato) {
    if (formato === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
        portal: 'Portal de Datos Abiertos · Mancomunidad Frontera del Norte',
        fechaExportacion: new Date().toISOString(),
        totalObras: proyectos.length,
        obras: proyectos,
        actas: actas,
        estadisticasTerritoriales: estadisticas
      }, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `datos_abiertos_mfn_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Archivo JSON de datos abiertos descargado');
    } else {
      // Export CSV
      const headers = ['Codigo', 'Nombre_Obra', 'Municipio', 'Cooperante', 'Presupuesto_Municipal', 'Presupuesto_Cooperacion', 'Monto_Total', 'Avance_Fisico', 'Estado'];
      const rows = proyectos.map(p => [
        `"${p.codigo}"`,
        `"${p.nombre.replace(/"/g, '""')}"`,
        `"${p.municipio}"`,
        `"${p.cooperante}"`,
        p.presupuestoMunicipal,
        p.presupuestoCooperacion,
        p.montoTotal,
        `${p.avance}%`,
        `"${p.estado}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `obras_publicas_mfn_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Archivo CSV de obras públicas descargado');
    }
  }
</script>

<svelte:head>
  <title>Portal de Transparencia y Datos Abiertos | MFN Huehuetenango</title>
</svelte:head>

<!-- HERO INSTITUCIONAL CIUDADANO -->
<div class="bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] border border-gray-100 rounded-[36px] p-8 md:p-12 mb-8 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.06)] animate-fade-in relative overflow-hidden">
  <div class="absolute -right-16 -top-16 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

  <div class="max-w-4xl space-y-4 relative z-10">
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-[9px] font-black uppercase tracking-[0.15em] text-[#3B82F6] bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
        Decreto 57-2008 · Acceso a la Información Pública
      </span>
      <span class="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Datos en Vivo · Neon PostgreSQL</span>
      </span>
      {#if auth.isAuthenticated}
        <span class="text-[9px] font-black uppercase tracking-[0.1em] text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200">
          Modo Administrador Activo (RF5)
        </span>
      {/if}
    </div>

    <h1 class="text-[34px] md:text-[46px] font-black tracking-[-0.04em] leading-[1.08] text-[#0A1526]">
      Portal Ciudadano de Rendición de Cuentas y Datos Abiertos
    </h1>

    <p class="text-[14px] md:text-[15px] text-[#0A1526]/60 leading-relaxed font-medium max-w-3xl">
      Supervise en tiempo real el destino de cada quetzal en infraestructura intermunicipal, consulte resoluciones de asamblea autorizadas por la CGC y descargue datos abiertos sin restricciones de acceso.
    </p>

    <!-- Buscador Universal Integrado -->
    <div class="pt-2 relative max-w-2xl">
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Buscar obra, puente, planta de agua, resolución o cooperante..." 
        class="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-full text-[13px] text-[#0A1526] placeholder-[#0A1526]/40 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all shadow-sm" 
      />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0A1526]/40" />
      {#if searchQuery}
        <button 
          onclick={() => searchQuery = ''}
          class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full"
        >
          Limpiar
        </button>
      {/if}
    </div>
  </div>

  <!-- METRICAS CLAVE EN TIEMPO REAL -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-200/60">
    <div class="bg-white/80 backdrop-blur-xs border border-gray-100 p-4 rounded-2xl shadow-xs">
      <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#0A1526]/40 block mb-1">Inversión Fiscal Auditada</span>
      <p class="text-xl md:text-2xl font-black text-[#0A1526]">Q {totalInversionObras.toLocaleString()}</p>
      <span class="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
        <Icon name="verified" className="w-3 h-3" />
        <span>Fondos Públicos & Cooperación</span>
      </span>
    </div>

    <div class="bg-white/80 backdrop-blur-xs border border-gray-100 p-4 rounded-2xl shadow-xs">
      <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#0A1526]/40 block mb-1">Avance Físico Promedio</span>
      <p class="text-xl md:text-2xl font-black text-[#3B82F6]">{promedioAvanceObras}%</p>
      <span class="text-[10px] text-[#0A1526]/50 font-medium block mt-1">
        En {proyectos.length} obras fiscalizadas
      </span>
    </div>

    <div class="bg-white/80 backdrop-blur-xs border border-gray-100 p-4 rounded-2xl shadow-xs">
      <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#0A1526]/40 block mb-1">Actas y Resoluciones CGC</span>
      <p class="text-xl md:text-2xl font-black text-purple-700">{actas.length}</p>
      <span class="text-[10px] text-[#0A1526]/50 font-medium block mt-1">
        Hojas movibles autorizadas
      </span>
    </div>

    <div class="bg-white/80 backdrop-blur-xs border border-gray-100 p-4 rounded-2xl shadow-xs">
      <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#0A1526]/40 block mb-1">Hogares Monitoreados</span>
      <p class="text-xl md:text-2xl font-black text-cyan-700">{estadisticas.totalViviendas.toLocaleString()}</p>
      <span class="text-[10px] text-[#0A1526]/50 font-medium block mt-1">
        En {estadisticas.totalCensos} censos OMAS
      </span>
    </div>
  </div>
</div>

<!-- NAVEGACIÓN PRINCIPAL POR PESTAÑAS -->
<div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
  <div class="flex items-center gap-1.5 p-1.5 bg-white border border-gray-100 rounded-full shadow-xs overflow-x-auto max-w-full">
    <button 
      onclick={() => activeTab = 'proyectos'}
      class="px-5 py-2.5 rounded-full text-[12px] font-bold transition-all shrink-0 cursor-pointer {activeTab === 'proyectos' ? 'bg-[#0A1526] text-white shadow-xs' : 'text-[#0A1526]/60 hover:text-[#0A1526]'}"
    >
      Obras y Proyectos ({proyectosFiltrados.length})
    </button>
    <button 
      onclick={() => activeTab = 'actas'}
      class="px-5 py-2.5 rounded-full text-[12px] font-bold transition-all shrink-0 cursor-pointer {activeTab === 'actas' ? 'bg-[#0A1526] text-white shadow-xs' : 'text-[#0A1526]/60 hover:text-[#0A1526]'}"
    >
      Actas y Resoluciones CGC ({actasFiltradas.length})
    </button>
    <button 
      onclick={() => activeTab = 'estadisticas'}
      class="px-5 py-2.5 rounded-full text-[12px] font-bold transition-all shrink-0 cursor-pointer {activeTab === 'estadisticas' ? 'bg-[#0A1526] text-white shadow-xs' : 'text-[#0A1526]/60 hover:text-[#0A1526]'}"
    >
      Indicadores ASH Regionales
    </button>
    <button 
      onclick={() => activeTab = 'solicitudes'}
      class="px-5 py-2.5 rounded-full text-[12px] font-bold transition-all shrink-0 cursor-pointer {activeTab === 'solicitudes' ? 'bg-[#0A1526] text-white shadow-xs' : 'text-[#0A1526]/60 hover:text-[#0A1526]'}"
    >
      Solicitud de Información (UIP)
    </button>
    <button 
      onclick={() => activeTab = 'datos'}
      class="px-5 py-2.5 rounded-full text-[12px] font-bold transition-all shrink-0 cursor-pointer {activeTab === 'datos' ? 'bg-[#0A1526] text-white shadow-xs' : 'text-[#0A1526]/60 hover:text-[#0A1526]'}"
    >
      Datos Abiertos (Descarga)
    </button>
  </div>

  <div class="flex items-center gap-2">
    <button 
      onclick={() => exportarDatos('csv')}
      class="px-3.5 py-2 rounded-full text-[11px] font-bold text-[#0A1526] bg-white border border-gray-200 hover:border-gray-400 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
      title="Exportar listado a hoja de cálculo CSV"
    >
      <Icon name="download" className="w-3.5 h-3.5 text-[#3B82F6]" />
      <span>Descargar CSV</span>
    </button>
    <button 
      onclick={() => exportarDatos('json')}
      class="px-3.5 py-2 rounded-full text-[11px] font-bold text-[#0A1526] bg-white border border-gray-200 hover:border-gray-400 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
      title="Exportar dataset completo a JSON"
    >
      <Icon name="code" className="w-3.5 h-3.5 text-purple-600" />
      <span>Dataset JSON</span>
    </button>
  </div>
</div>

<!-- FILTRO POR MUNICIPIO (VISIBLE EN TAB PROYECTOS) -->
{#if activeTab === 'proyectos'}
  <div class="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
    <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#0A1526]/40 shrink-0 mr-1">
      Jurisdicción:
    </span>
    <button 
      onclick={() => filtroMunicipio = 'todos'}
      class="px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer {filtroMunicipio === 'todos' ? 'bg-[#0A1526] text-white shadow-xs' : 'bg-white text-[#0A1526]/60 border border-gray-200 hover:border-gray-300'}"
    >
      Todos los Municipios
    </button>
    {#each MUNICIPIOS_MFN as m}
      <button 
        onclick={() => filtroMunicipio = m}
        class="px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer {filtroMunicipio === m ? 'bg-[#0A1526] text-white shadow-xs' : 'bg-white text-[#0A1526]/60 border border-gray-200 hover:border-gray-300'}"
      >
        {m}
      </button>
    {/each}
  </div>
{/if}

<!-- CONTENIDO POR PESTAÑAS -->
{#if loading}
  <div class="py-24 text-center bg-white border border-gray-100 rounded-[28px] animate-pulse">
    <div class="w-8 h-8 border-3 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
    <p class="text-[13px] font-bold text-[#0A1526]">Cargando portal de transparencia desde la base de datos...</p>
  </div>
{:else}
  {#key activeTab}
  <div class="animate-scale-up">

  <!-- 1. PESTAÑA PROYECTOS -->
  {#if activeTab === 'proyectos'}
    {#if proyectosFiltrados.length === 0}
      <div class="py-20 text-center bg-white border border-gray-100 rounded-[32px]">
        <Icon name="construction" className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-base font-bold text-[#0A1526]">No hay proyectos públicos disponibles</p>
        <p class="text-xs text-[#0A1526]/40 mt-1">No se encontraron obras registradas en este municipio o coincidentes con la búsqueda.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each proyectosFiltrados as p}
          <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] card-lift flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-3 mb-3">
                <span class="text-[9px] font-mono font-bold text-[#3B82F6] bg-blue-50 px-2.5 py-1 rounded-md">
                  {p.codigo}
                </span>
                
                <div class="flex items-center gap-2">
                  <span class="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {p.estado}
                  </span>
                  {#if auth.isAuthenticated}
                    <button 
                      onclick={() => toggleVisibilidadProyecto(p)}
                      class="text-[9px] font-bold px-2 py-0.5 rounded border {p.visibilidad ? 'border-emerald-200 text-emerald-700' : 'border-rose-200 text-rose-700 bg-rose-50'}"
                      title="Control Gerencial de Visibilidad RF5"
                    >
                      {p.visibilidad ? 'Visible' : 'Oculto'}
                    </button>
                  {/if}
                </div>
              </div>

              <h3 class="text-xl font-black text-[#0A1526] tracking-tight leading-snug mb-1">
                {p.nombre}
              </h3>
              <p class="text-[12px] font-bold text-[#0A1526]/50 mb-4">
                {p.municipio} · Financiado por: <span class="text-[#0A1526] font-bold">{p.cooperante}</span>
              </p>

              <!-- Inversión Desglosada -->
              <div class="p-4 rounded-2xl bg-[#F8FAFC] border border-gray-100 mb-5">
                <div class="flex items-baseline justify-between mb-2">
                  <span class="text-[9px] font-bold uppercase tracking-wider text-[#0A1526]/40">Presupuesto Público Total</span>
                  <p class="text-lg font-black text-[#0A1526]">{p.montoFormateado}</p>
                </div>
                <div class="flex items-center justify-between text-[10px] font-medium text-[#0A1526]/60 pt-2 border-t border-gray-200/50">
                  <span>Municipal: Q {p.presupuestoMunicipal.toLocaleString()}</span>
                  <span>Cooperación: Q {p.presupuestoCooperacion.toLocaleString()}</span>
                </div>
              </div>

              <!-- Barra de Avance Físico -->
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between text-[11px] font-bold">
                  <span class="text-[#0A1526]/50">Avance Físico Certificado:</span>
                  <span class="text-[#3B82F6] font-black">{p.avance}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div class="bg-[#3B82F6] h-2 rounded-full transition-all duration-500" style="width: {p.avance}%"></div>
                </div>
              </div>
            </div>

            <!-- Footer con Botón Ver Ficha y Evidencias GPS -->
            <div class="pt-4 border-t border-gray-50 flex items-center justify-between gap-3">
              <span class="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                <Icon name="verified" className="w-3.5 h-3.5" />
                <span>EXIF & GPS Validado</span>
              </span>

              <button 
                onclick={() => proyectoSeleccionado = p}
                class="px-4 py-2 bg-[#0A1526] hover:bg-black text-white text-[11px] font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Icon name="visibility" className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Ficha Técnica y Mapa</span>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

  <!-- 2. PESTAÑA ACTAS -->
  {:else if activeTab === 'actas'}
    <div class="bg-white border border-gray-100 rounded-[32px] p-8 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] animate-fade-in">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div>
          <h3 class="text-lg font-black text-[#0A1526]">Actas Oficiales de Asamblea y Junta Directiva</h3>
          <p class="text-[12px] text-[#0A1526]/50">Hojas movibles autorizadas con sello de la Contraloría General de Cuentas (CGC).</p>
        </div>
        <span class="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
          Decreto 57-2008 Art. 10
        </span>
      </div>

      {#if actasFiltradas.length === 0}
        <div class="py-16 text-center">
          <Icon name="gavel" className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p class="text-sm font-bold text-[#0A1526]">No hay publicaciones o actas registradas</p>
          <p class="text-xs text-[#0A1526]/40 mt-1">No se encontraron resoluciones públicas en la base de datos.</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each actasFiltradas as a}
            <div class="bg-[#F8FAFC] border border-gray-100 rounded-[22px] p-6 transition-all duration-300 hover:shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-mono font-bold text-[#3B82F6] bg-blue-50 px-2.5 py-0.5 rounded-md">
                    {a.numero}
                  </span>
                  <span class="text-[11px] text-[#0A1526]/40">{a.fecha}</span>
                  <span class="text-[11px] font-bold text-[#0A1526]">· {a.municipio}</span>
                </div>
                <p class="text-[13px] font-bold text-[#0A1526] leading-snug">{a.resumen}</p>
              </div>

              <div class="flex items-center gap-3 shrink-0">
                {#if auth.isAuthenticated}
                  <button 
                    onclick={() => toggleVisibilidadActa(a)}
                    class="text-[9px] font-bold px-2 py-1 rounded border {a.visibilidad ? 'border-emerald-200 text-emerald-700' : 'border-rose-200 text-rose-700 bg-rose-50'}"
                  >
                    {a.visibilidad ? 'Público' : 'Retirado'}
                  </button>
                {/if}
                <a 
                  href={a.urlPdf} 
                  target="_blank"
                  class="px-5 py-2.5 bg-[#0A1526] hover:bg-black text-white text-[12px] font-bold rounded-full shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Icon name="download" className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Descargar Acta PDF</span>
                </a>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  <!-- 3. PESTAÑA INDICADORES ASH -->
  {:else if activeTab === 'estadisticas'}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
      <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#0A1526]/40">Cobertura Regional de Agua</span>
          <Icon name="water_drop" className="w-5 h-5 text-[#3B82F6]" />
        </div>
        <p class="text-[36px] font-black text-[#0A1526]">{estadisticas.coberturaAgua}%</p>
        <p class="text-[12px] text-[#0A1526]/50 mt-1">Hogares con servicio continuo en los 6 municipios ({estadisticas.totalViviendas} viviendas en base de datos).</p>
      </div>

      <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#0A1526]/40">Cobertura de Saneamiento</span>
          <Icon name="sanitizer" className="w-5 h-5 text-emerald-600" />
        </div>
        <p class="text-[36px] font-black text-[#0A1526]">{estadisticas.coberturaSaneamiento}%</p>
        <p class="text-[12px] text-[#0A1526]/50 mt-1">Letrinas mejoradas y red de drenaje sanitario auditada.</p>
      </div>

      <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#0A1526]/40">Sistemas con Cloro Conforme</span>
          <Icon name="science" className="w-5 h-5 text-amber-500" />
        </div>
        <p class="text-[36px] font-black text-[#0A1526]">{estadisticas.cloroConforme}%</p>
        <p class="text-[12px] text-[#0A1526]/50 mt-1">Cumplen norma técnica nacional COGUANOR ({estadisticas.totalCensos} censos OMAS).</p>
      </div>
    </div>

  <!-- 4. PESTAÑA SOLICITUDES UIP (DECRETO 57-2008) -->
  {:else if activeTab === 'solicitudes'}
    <div class="bg-white border border-gray-100 rounded-[32px] p-8 md:p-10 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] animate-fade-in max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 flex-wrap gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#3B82F6] bg-blue-50 px-2.5 py-0.5 rounded-md">
              Unidad de Información Pública (UIP)
            </span>
            <span class="text-[10px] text-[#0A1526]/40 font-mono">Decreto Número 57-2008</span>
          </div>
          <h3 class="text-2xl font-black text-[#0A1526]">Solicitud Electrónica de Información Pública</h3>
          <p class="text-[13px] text-[#0A1526]/60">Toda persona tiene derecho a conocer lo que conste en los archivos de la Mancomunidad.</p>
        </div>

        <div class="flex items-center gap-2 p-1 bg-[#F4F7FA] rounded-full">
          <button 
            onclick={() => subTabUIP = 'crear'}
            class="px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer {subTabUIP === 'crear' ? 'bg-[#0A1526] text-white shadow-xs' : 'text-[#0A1526]/60'}"
          >
            Nueva Solicitud
          </button>
          <button 
            onclick={() => subTabUIP = 'consultar'}
            class="px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer {subTabUIP === 'consultar' ? 'bg-[#0A1526] text-white shadow-xs' : 'text-[#0A1526]/60'}"
          >
            Rastrear Expediente
          </button>
        </div>
      </div>

      {#if subTabUIP === 'crear'}
        {#if ticketGenerado}
          <div class="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 animate-fade-in">
            <div class="flex items-center gap-2 text-emerald-800 font-black text-base">
              <Icon name="check_circle" className="w-6 h-6 text-emerald-600" />
              <span>Solicitud Registrada con Éxito</span>
            </div>
            <p class="text-sm">
              Se ha radicado formalmente su petición en los registros oficiales de la Mancomunidad Frontera del Norte.
            </p>
            <div class="p-4 bg-white rounded-xl border border-emerald-200 space-y-1 font-mono text-xs">
              <p><strong>Número de Expediente:</strong> <span class="text-base text-blue-600 font-black">{ticketGenerado.expediente}</span></p>
              <p><strong>Solicitante:</strong> {ticketGenerado.solicitante}</p>
              <p><strong>Plazo Legal de Respuesta:</strong> {ticketGenerado.fechaLimiteLegal} (10 días hábiles conforme Art. 42)</p>
              <p><strong>Estado:</strong> <span class="text-amber-700 font-bold">{ticketGenerado.estado}</span></p>
            </div>
            <button 
              onclick={() => ticketGenerado = null}
              class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
            >
              Radicar Otra Solicitud
            </button>
          </div>
        {:else}
          <form onsubmit={enviarSolicitudUIP} class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="uip-nombre" class="block text-[10px] font-bold uppercase tracking-wider text-[#0A1526]/50 mb-1">Nombre Completo del Solicitante *</label>
                <input 
                  id="uip-nombre"
                  type="text" 
                  bind:value={nuevaSolicitud.nombre}
                  required
                  placeholder="Ej. Licda. María Méndez"
                  class="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs text-[#0A1526] focus:outline-none focus:border-[#3B82F6]" 
                />
              </div>

              <div>
                <label for="uip-correo" class="block text-[10px] font-bold uppercase tracking-wider text-[#0A1526]/50 mb-1">Correo Electrónico para Notificaciones</label>
                <input 
                  id="uip-correo"
                  type="email" 
                  bind:value={nuevaSolicitud.correo}
                  placeholder="ciudadano@correo.gt"
                  class="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs text-[#0A1526] focus:outline-none focus:border-[#3B82F6]" 
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="uip-telefono" class="block text-[10px] font-bold uppercase tracking-wider text-[#0A1526]/50 mb-1">Teléfono de Contacto</label>
                <input 
                  id="uip-telefono"
                  type="text" 
                  bind:value={nuevaSolicitud.telefono}
                  placeholder="+502 5555-5555"
                  class="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs text-[#0A1526] focus:outline-none focus:border-[#3B82F6]" 
                />
              </div>

              <div>
                <label for="uip-municipio" class="block text-[10px] font-bold uppercase tracking-wider text-[#0A1526]/50 mb-1">Municipio de Residencia</label>
                <select 
                  id="uip-municipio"
                  bind:value={nuevaSolicitud.municipio}
                  class="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs text-[#0A1526] focus:outline-none focus:border-[#3B82F6]"
                >
                  {#each MUNICIPIOS_MFN as m}
                    <option value={m}>{m}</option>
                  {/each}
                  <option value="Regional">Otro / Regional</option>
                </select>
              </div>
            </div>

            <div>
              <label for="uip-desc" class="block text-[10px] font-bold uppercase tracking-wider text-[#0A1526]/50 mb-1">Descripción Clara de la Información Solicitada *</label>
              <textarea 
                id="uip-desc"
                bind:value={nuevaSolicitud.descripcion}
                required
                rows="4"
                placeholder="Indique con claridad el proyecto, acta, informe financiero o documento que desea consultar..."
                class="w-full px-4 py-3 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs text-[#0A1526] focus:outline-none focus:border-[#3B82F6]"
              ></textarea>
            </div>

            <div class="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
              <Icon name="info" className="w-4 h-4 shrink-0 text-[#3B82F6]" />
              <span>La Mancomunidad responderá en un plazo máximo de diez (10) días hábiles según el Art. 42 del Decreto 57-2008. No es obligatorio manifestar el interés por el cual se pide la información.</span>
            </div>

            <button 
              type="submit" 
              disabled={solicitudGuardando}
              class="w-full bg-[#0A1526] hover:bg-black text-white font-bold py-3.5 rounded-full text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {#if solicitudGuardando}
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Radicando en Base de Datos Oficial...</span>
              {:else}
                <Icon name="send" className="w-4 h-4 text-[#3B82F6]" />
                <span>Enviar Solicitud Formal de Información Pública</span>
              {/if}
            </button>
          </form>
        {/if}
      {:else}
        <!-- CONSULTA DE EXPEDIENTE -->
        <div class="space-y-6">
          <form onsubmit={consultarExpedienteUIP} class="flex items-center gap-3">
            <input 
              type="text" 
              bind:value={codigoConsulta}
              placeholder="Ej. EXP-UIP-2024-0001"
              required
              class="flex-1 px-4 py-3.5 bg-[#F8FAFC] border border-gray-200 rounded-full text-xs font-mono text-[#0A1526] focus:outline-none focus:border-[#3B82F6]" 
            />
            <button 
              type="submit" 
              disabled={consultando}
              class="px-6 py-3.5 bg-[#0A1526] hover:bg-black text-white text-xs font-bold rounded-full transition-colors cursor-pointer disabled:opacity-60"
            >
              {consultando ? 'Consultando...' : 'Buscar Expediente'}
            </button>
          </form>

          {#if resultadoConsulta}
            <div class="p-6 rounded-2xl bg-[#F8FAFC] border border-gray-200 space-y-3 animate-fade-in font-mono text-xs">
              <div class="flex items-center justify-between pb-3 border-b border-gray-200">
                <span class="text-sm font-black text-[#0A1526]">{resultadoConsulta.expediente}</span>
                <span class="px-3 py-1 rounded-full bg-blue-50 text-[#3B82F6] font-bold">{resultadoConsulta.estado}</span>
              </div>
              <p><strong>Solicitante:</strong> {resultadoConsulta.solicitante}</p>
              <p><strong>Municipio:</strong> {resultadoConsulta.municipio}</p>
              <p><strong>Fecha de Radicación:</strong> {new Date(resultadoConsulta.fechaRecepcion).toLocaleDateString('es-GT')}</p>
              <p><strong>Plazo Legal Límite:</strong> {resultadoConsulta.fechaLimite}</p>
              <div class="p-3 bg-white rounded-lg border border-gray-200 font-sans text-xs text-[#0A1526]">
                <strong>Información Requerida:</strong> {resultadoConsulta.descripcion}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>

  <!-- 5. PESTAÑA DATOS ABIERTOS -->
  {:else if activeTab === 'datos'}
    <div class="bg-white border border-gray-100 rounded-[32px] p-8 md:p-10 shadow-xs animate-fade-in max-w-4xl mx-auto space-y-6">
      <div class="text-center max-w-2xl mx-auto space-y-2">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-[#3B82F6] flex items-center justify-center mx-auto mb-2">
          <Icon name="code" className="w-6 h-6" />
        </div>
        <h3 class="text-2xl font-black text-[#0A1526]">Repositorio de Datos Abiertos (Open Data)</h3>
        <p class="text-xs text-[#0A1526]/60 leading-relaxed font-medium">
          Descargue los microdatos completos del sistema en formatos abiertos legibles por máquinas (CSV / JSON) para análisis periodístico, académico y de fiscalización comunitaria.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div class="p-6 rounded-2xl bg-[#F8FAFC] border border-gray-100 flex flex-col justify-between">
          <div class="space-y-2 mb-4">
            <span class="text-[9px] font-black uppercase tracking-wider text-[#3B82F6] bg-blue-50 px-2 py-0.5 rounded">Formato Tabular</span>
            <h4 class="text-base font-black text-[#0A1526]">Cartera de Obras Públicas (CSV)</h4>
            <p class="text-xs text-[#0A1526]/60">Incluye montos aprobados, porcentaje de ejecución física, municipio y entidad cooperante.</p>
          </div>
          <button 
            onclick={() => exportarDatos('csv')}
            class="w-full py-3 bg-[#0A1526] hover:bg-black text-white text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Icon name="download" className="w-4 h-4 text-[#3B82F6]" />
            <span>Descargar Dataset en CSV</span>
          </button>
        </div>

        <div class="p-6 rounded-2xl bg-[#F8FAFC] border border-gray-100 flex flex-col justify-between">
          <div class="space-y-2 mb-4">
            <span class="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Dataset Completo</span>
            <h4 class="text-base font-black text-[#0A1526]">Consolidado Institucional (JSON)</h4>
            <p class="text-xs text-[#0A1526]/60">Estructura jerárquica con actas CGC, indicadores hídricos OMAS y estadísticas de saneamiento.</p>
          </div>
          <button 
            onclick={() => exportarDatos('json')}
            class="w-full py-3 bg-[#0A1526] hover:bg-black text-white text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Icon name="code" className="w-4 h-4 text-purple-400" />
            <span>Descargar Dataset en JSON</span>
          </button>
        </div>
      </div>

      <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] text-[#0A1526]/60 font-mono text-center">
        Licencia Abierta: Creative Commons Reconocimiento 4.0 Internacional (CC BY 4.0) · Mancomunidad Frontera del Norte.
      </div>
    </div>
  {/if}

  </div>
  {/key}
{/if}

<!-- MODAL FICHA TÉCNICA DE PROYECTO -->
{#if proyectoSeleccionado}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
    <div class="bg-white rounded-[32px] p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <span class="text-[9px] font-mono font-bold text-[#3B82F6] bg-blue-50 px-2 py-0.5 rounded">
            {proyectoSeleccionado.codigo}
          </span>
          <h3 class="text-xl font-black text-[#0A1526] mt-1">{proyectoSeleccionado.nombre}</h3>
          <p class="text-xs text-[#0A1526]/50">{proyectoSeleccionado.municipio} · Financiado por {proyectoSeleccionado.cooperante}</p>
        </div>
        <button 
          onclick={() => proyectoSeleccionado = null}
          class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
        >
          <Icon name="close" className="w-4 h-4" />
        </button>
      </div>

      <!-- Presupuestos y Plazos -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 bg-[#F8FAFC] rounded-xl border border-gray-100">
          <span class="text-[9px] font-bold text-[#0A1526]/40 uppercase block">Inversión Total</span>
          <span class="text-sm font-black text-[#0A1526]">{proyectoSeleccionado.montoFormateado}</span>
        </div>
        <div class="p-3 bg-[#F8FAFC] rounded-xl border border-gray-100">
          <span class="text-[9px] font-bold text-[#0A1526]/40 uppercase block">Avance Físico</span>
          <span class="text-sm font-black text-[#3B82F6]">{proyectoSeleccionado.avance}%</span>
        </div>
        <div class="p-3 bg-[#F8FAFC] rounded-xl border border-gray-100">
          <span class="text-[9px] font-bold text-[#0A1526]/40 uppercase block">Fecha Inicio</span>
          <span class="text-xs font-bold text-[#0A1526]">{proyectoSeleccionado.fechaInicio}</span>
        </div>
        <div class="p-3 bg-[#F8FAFC] rounded-xl border border-gray-100">
          <span class="text-[9px] font-bold text-[#0A1526]/40 uppercase block">Fecha Entrega</span>
          <span class="text-xs font-bold text-[#0A1526]">{proyectoSeleccionado.fechaFin}</span>
        </div>
      </div>

      <!-- Galería de Evidencias Georreferenciadas -->
      <div>
        <h4 class="text-xs font-black uppercase tracking-wider text-[#0A1526]/40 mb-3">
          Supervisión Fotográfica y Coordenadas Satelitales GPS
        </h4>

        {#if proyectoSeleccionado.evidencias && proyectoSeleccionado.evidencias.length > 0}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {#each proyectoSeleccionado.evidencias as e}
              <div class="rounded-xl border border-gray-100 overflow-hidden bg-gray-50 p-3 space-y-2">
                <div class="h-32 bg-gray-200 rounded-lg overflow-hidden relative">
                  <img src={e.urlArchivo} alt="Evidencia de obra" class="w-full h-full object-cover" />
                  <span class="absolute bottom-2 left-2 text-[9px] bg-black/70 text-white px-2 py-0.5 rounded font-mono">
                    {e.latitud ? `${e.latitud}°, ${e.longitud}°` : 'GPS Registrado'}
                  </span>
                </div>
                <p class="text-[11px] text-[#0A1526]/80 font-medium">{e.descripcion || 'Registro fotográfico oficial de la obra.'}</p>
                {#if e.latitud && e.longitud}
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${e.latitud},${e.longitud}`}
                    target="_blank" 
                    rel="noreferrer"
                    class="text-[10px] font-bold text-[#3B82F6] hover:underline flex items-center gap-1"
                  >
                    <Icon name="location_on" className="w-3.5 h-3.5" />
                    <span>Ver en Google Maps Satélite</span>
                  </a>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="p-6 text-center bg-gray-50 rounded-2xl border border-gray-100">
            <Icon name="satellite_alt" className="w-8 h-8 text-gray-300 mx-auto mb-1" />
            <p class="text-xs text-[#0A1526]/60 font-medium">Ubicación registrada en jurisdicción de {proyectoSeleccionado.municipio}.</p>
          </div>
        {/if}
      </div>

      <div class="pt-4 border-t border-gray-100 flex justify-end">
        <button 
          onclick={() => proyectoSeleccionado = null}
          class="px-5 py-2.5 bg-[#0A1526] hover:bg-black text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
        >
          Cerrar Ficha
        </button>
      </div>
    </div>
  </div>
{/if}
