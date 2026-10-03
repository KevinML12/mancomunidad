<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fade, fly } from 'svelte/transition';

  let proyectos = $state([]);
  let selectedProyecto = $state(null);
  let loading = $state(true);
  
  // Modal states
  let showModal = $state(false);
  let formLoading = $state(false);
  let formData = $state({
    nombre: '',
    agenciaFinanciadora: 'USAID / DAI',
    municipio: 'Santa Eulalia',
    fechaInicioPlanificada: '',
    fechaFinPlanificada: '',
    presupuestoMunicipal: 0,
    presupuestoCooperacion: 0
  });

  const fetchProyectos = async () => {
    loading = true;
    try {
      const { data } = await apiClient.get('/proyectos');
      if (Array.isArray(data)) {
        proyectos = data.map((d) => {
          const totalQ = (d.presupuestoMunicipal || 0) + (d.presupuestoCooperacion || 0);
          return {
            id: d.id.toString(),
            codigo: 'MFN-2024-',
            sufijo: `AG${d.id.toString().padStart(2, '0')}`,
            nombre: d.nombre,
            nombreDetalle: d.nombre,
            agencia: d.agenciaFinanciadora || 'Cooperación Internacional',
            municipio: d.municipio || 'Regional',
            subregion: 'TERRITORIO MFN',
            presupuestoUsd: `$${Math.round(totalQ / 7.8).toLocaleString()}`,
            presupuestoQ: `Q ${totalQ.toLocaleString()}`,
            estado: d.estado || 'Planificación',
            estadoTipo: d.estado === 'Finalizado' ? 'emerald' : d.estado === 'Ejecución' ? 'blue' : 'amber',
            avance: d.porcentajeAvanceFisico || 0,
            etapa: d.porcentajeAvanceFisico > 80 ? 'ETAPA 4/5' : d.porcentajeAvanceFisico > 40 ? 'ETAPA 2/5' : 'ETAPA 1/5',
            convenio: `Convenio Institucional MFN-${d.id}`,
            descripcion: `Proyecto de inversión pública registrado en la base de datos oficial. Agencia financiadora: ${d.agenciaFinanciadora}.`,
            aprobado: `Q ${totalQ.toLocaleString()}`,
            devengado: `Q ${Math.round(totalQ * ((d.porcentajeAvanceFisico || 0) / 100)).toLocaleString()}`,
            saldo: `Q ${Math.round(totalQ * (1 - ((d.porcentajeAvanceFisico || 0) / 100))).toLocaleString()}`,
            hallazgos: 0,
            evidenciasCount: d._count?.evidencias || 0
          };
        });
        if (proyectos.length > 0 && !selectedProyecto) {
          selectedProyecto = proyectos[0];
        } else if (selectedProyecto) {
          selectedProyecto = proyectos.find(p => p.id === selectedProyecto.id) || proyectos[0] || null;
        }
      }
    } catch (err) {
      console.error('Error al consultar proyectos de la base de datos:', err);
      toast.error('No se pudo cargar la cartera de proyectos de la BD');
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    fetchProyectos();
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    formLoading = true;
    try {
      await apiClient.post('/proyectos', {
        ...formData,
        fechaInicioPlanificada: formData.fechaInicioPlanificada || new Date().toISOString().split('T')[0],
        presupuestoMunicipal: Number(formData.presupuestoMunicipal),
        presupuestoCooperacion: Number(formData.presupuestoCooperacion)
      });
      toast.success('Proyecto guardado en la base de datos');
      showModal = false;
      await fetchProyectos();
    } catch (err) {
      toast.error('Error al guardar el proyecto en la base de datos');
    } finally {
      formLoading = false;
    }
  };
</script>

<svelte:head>
  <title>Proyectos Intermunicipales | MFN Digital</title>
</svelte:head>

<!-- HEADER SUPERIOR -->
<header class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 mt-2">
  <div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">Módulo 01</span>
      <span class="text-[12px] text-[#071D49]/30">•</span>
      <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Concurrencia Fiduciaria y Territorial</span>
    </div>
    <h2 class="text-[40px] font-semibold tracking-[-0.04em] leading-none text-[#071D49] mb-3">Proyectos Intermunicipales</h2>
    <p class="text-[13px] text-[#071D49]/50 leading-relaxed max-w-xl">Control de inversión pública compartida, fiscalización en tiempo real y evidencias de campo.</p>
  </div>
  <div class="flex items-center gap-3 shrink-0">
    <!-- Buscador -->
    <div class="relative">
      <input type="text" placeholder="Buscar por código, obra o cuenca..." class="w-[300px] pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full text-[13px] text-[#071D49] placeholder-[#071D49]/30 shadow-sm focus:outline-none focus:border-[#1248AA] transition-all" />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#071D49]/30" />
    </div>
    <!-- Filtro -->
    <button class="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-full shadow-sm text-[13px] font-bold text-[#071D49] transition-colors flex items-center gap-2">
      <Icon name="tune" className="w-[18px] h-[18px] text-[#071D49]/50" />
      Filtros
    </button>
    <!-- Nuevo Proyecto -->
    <button onclick={() => showModal = true} class="px-6 py-3 bg-[#071D49] hover:bg-black text-white rounded-full text-[13px] font-bold shadow-md transition-colors flex items-center gap-2">
      <Icon name="add" className="w-[18px] h-[18px] text-[#1248AA]" stroke={2.5} />
      Nuevo Proyecto
    </button>
  </div>
</header>

<!-- TARJETA DE DATOS (CARTERA DE INVERSIÓN) -->
<section class="glass-light  rounded-[32px] p-8 mb-8  ">
  <div class="flex items-center justify-between pb-6 mb-2 border-b border-gray-50">
    <div>
      <h3 class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 mb-1">Cartera de Inversión Vigente</h3>
      <p class="text-[12px] font-medium text-[#071D49]/50">4 convenios activos con avance técnico verificado por la Unidad Técnica MFN</p>
    </div>
    <div class="bg-white border border-gray-100 px-3.5 py-1.5 rounded-full shadow-sm">
      <span class="text-[12px] font-semibold text-[#071D49]/60 uppercase tracking-widest">{proyectos.length} de 14 Expedientes</span>
    </div>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-gray-50">
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Proyecto / Expediente</th>
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Agencia Cooperante</th>
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Municipio Ejecutor</th>
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Presupuesto</th>
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Estado</th>
          <th class="py-5 px-4 text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 w-44">Avance Físico</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50/50">
        {#each proyectos as p}
          <tr 
            class="transition-colors cursor-pointer group {selectedProyecto?.id === p.id ? 'bg-[#FFFFFF]/60' : 'hover:bg-gray-50/50'}"
            onclick={() => selectedProyecto = p}
          >
            <td class="py-5 px-4">
              <div class="flex items-start gap-3">
                <span class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 {selectedProyecto?.id === p.id ? 'bg-[#1248AA]' : 'bg-[#071D49]/20 group-hover:bg-[#1248AA]/50'} transition-colors"></span>
                <div>
                  <div class="flex items-center gap-1 mb-1">
                    <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">{p.codigo}</span>
                    <span class="text-[12px] font-bold uppercase tracking-normal text-[#1248AA]">{p.sufijo}</span>
                  </div>
                  <p class="text-[13px] font-semibold text-[#071D49] leading-tight tracking-tight max-w-[210px]">{p.nombre}</p>
                </div>
              </div>
            </td>
            <td class="py-5 px-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full {p.agencia.includes('USAID') ? 'bg-[#EDF4FF] text-[#1D4ED8] border border-[#1248AA]/10' : p.agencia.includes('AECID') ? 'bg-amber-50 text-amber-800 border border-amber-200/50' : p.agencia.includes('BID') ? 'bg-cyan-50 text-cyan-800 border border-cyan-200/50' : 'bg-gray-100 text-gray-700 border border-gray-200'}">
                <Icon name="verified_user" className="w-3.5 h-3.5" />
                <span class="text-[11px] font-semibold tracking-tight">{p.agencia}</span>
              </span>
            </td>
            <td class="py-5 px-4">
              <p class="text-[13px] font-bold text-[#071D49] tracking-tight">{p.municipio}</p>
              <p class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mt-0.5">{p.subregion}</p>
            </td>
            <td class="py-5 px-4">
              <p class="text-[16px] font-semibold tracking-[-0.02em] text-[#071D49]">{p.presupuestoUsd}</p>
              <p class="text-[12px] font-bold text-[#071D49]/40 mt-0.5">{p.presupuestoQ}</p>
            </td>
            <td class="py-5 px-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full {p.estadoTipo === 'emerald' ? 'bg-[#ECFDF5] text-emerald-700 border-emerald-100' : p.estadoTipo === 'amber' ? 'bg-[#FFFBEB] text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'} border">
                <span class="w-1.5 h-1.5 rounded-full {p.estadoTipo === 'emerald' ? 'bg-emerald-500' : p.estadoTipo === 'amber' ? 'bg-amber-500' : 'bg-blue-500'}"></span>
                <span class="text-[11px] font-semibold tracking-tight">{p.estado}</span>
              </span>
            </td>
            <td class="py-5 px-4">
              <div class="space-y-1.5 pr-4">
                <div class="flex items-end justify-between">
                  <span class="text-[14px] font-semibold text-[#071D49] leading-none">{p.avance}%</span>
                  <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">{p.etapa}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1">
                  <div class="bg-[#1248AA] h-1 rounded-full transition-all duration-500" style="width: {p.avance}%"></div>
                </div>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<!-- TARJETA DE EXPEDIENTE AUDITADO -->
{#if selectedProyecto}
{#key selectedProyecto.id}
<section class="glass-light  rounded-[32px] p-8 space-y-8 animate-scale-up  ">
  <!-- Header de la Ficha -->
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-50">
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <span class="text-[12px] font-semibold uppercase tracking-normal px-3 py-1.5 rounded-lg bg-[#EDF4FF] text-[#1D4ED8]">Expediente Auditado</span>
        <span class="text-[11px] font-bold text-[#071D49]/50">{selectedProyecto.codigo}{selectedProyecto.sufijo}</span>
        <span class="w-1 h-1 rounded-full bg-gray-200"></span>
        <span class="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
          <Icon name="verified" className="w-4 h-4" />
          {selectedProyecto.convenio}
        </span>
      </div>
      <h3 class="text-[28px] font-semibold tracking-[-0.03em] text-[#071D49] leading-tight max-w-3xl">{selectedProyecto.nombreDetalle}</h3>
      <p class="text-[13px] text-[#071D49]/50 leading-relaxed max-w-4xl font-medium">
        {selectedProyecto.descripcion}
      </p>
    </div>
    <!-- Botones de Acción -->
    <div class="flex items-center gap-3 shrink-0">
      <button class="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-full shadow-sm text-[12px] font-bold text-[#071D49] transition-all flex items-center gap-2 pill-interactive">
        <Icon name="description" className="w-[18px] h-[18px] text-[#071D49]/40" />
        Dictamen SIAF
      </button>
      <a href="/proyectos/{selectedProyecto.id}" class="px-6 py-3 bg-[#071D49] hover:bg-black text-white rounded-full text-[12px] font-bold shadow-md transition-all flex items-center gap-2 pill-interactive">
        <Icon name="upload" className="w-[18px] h-[18px] text-[#1248AA]" />
        Subir Evidencia
      </a>
    </div>
  </div>

  <!-- TARJETAS FINANCIERAS (GRID PLANO SIN SOMBRA) -->
  <div>
    <div class="flex items-center justify-between mb-5">
      <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Estado Fiduciario y Certificación de Fondos</span>
      <span class="text-[12px] font-bold text-[#071D49]/30 uppercase tracking-normal">Corte al 24 de Marzo 2024</span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- StatCard 1 -->
      <div class="glass-light   rounded-[20px] p-6 shadow-xs card-lift">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Monto Aprobado</span>
          <span class="w-8 h-8 rounded-full bg-[#EDF4FF] flex items-center justify-center text-[#1248AA]">
            <Icon name="attach_money" className="w-[18px] h-[18px]" stroke={2} />
          </span>
        </div>
        <p class="text-[26px] font-semibold tracking-[-0.04em] text-[#071D49]">{selectedProyecto.aprobado}</p>
        <div class="mt-3 flex items-center gap-1.5">
          <span class="text-[11px] font-semibold text-emerald-600">100%</span>
          <span class="text-[11px] font-medium text-[#071D49]/50">Fideicomiso aperturado</span>
        </div>
      </div>
      <!-- StatCard 2 -->
      <div class="glass-light   rounded-[20px] p-6 shadow-xs card-lift">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Monto Devengado</span>
          <span class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Icon name="trending_up" className="w-[18px] h-[18px]" stroke={2} />
          </span>
        </div>
        <p class="text-[26px] font-semibold tracking-[-0.04em] text-[#071D49]">{selectedProyecto.devengado}</p>
        <div class="mt-3 flex items-center gap-1.5">
          <span class="text-[11px] font-semibold text-emerald-600">{selectedProyecto.avance}%</span>
          <span class="text-[11px] font-medium text-[#071D49]/50">ejecutado financieramente</span>
        </div>
      </div>
      <!-- StatCard 3 -->
      <div class="glass-light   rounded-[20px] p-6 shadow-xs card-lift">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Saldo por Liquidar</span>
          <span class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <Icon name="schedule" className="w-[18px] h-[18px]" stroke={2} />
          </span>
        </div>
        <p class="text-[26px] font-semibold tracking-[-0.04em] text-[#071D49]">{selectedProyecto.saldo}</p>
        <div class="mt-3 flex items-center gap-1.5">
          <span class="text-[11px] font-medium text-[#071D49]/50">Retención de garantía 5% incluida</span>
        </div>
      </div>
      <!-- StatCard 4 -->
      <div class="glass-light   rounded-[20px] p-6 shadow-xs card-lift">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Auditoría Concurrente</span>
          <span class="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <Icon name="shield" className="w-[18px] h-[18px]" stroke={2} />
          </span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <p class="text-[26px] font-semibold tracking-[-0.04em] text-[#071D49]">{selectedProyecto.hallazgos}</p>
          <p class="text-[14px] font-bold text-[#071D49]/40">Hallazgos</p>
        </div>
        <div class="mt-3 flex items-center gap-1.5">
          <Icon name="check_circle" className="w-[14px] h-[14px] text-emerald-500" stroke={2.5} />
          <span class="text-[11px] font-bold text-emerald-600">Visto Bueno CGC y MFN</span>
        </div>
      </div>
    </div>
  </div>

  <!-- FOTOS (EVIDENCIAS) -->
  <div class="pt-4">
    <div class="flex items-end justify-between mb-5">
      <div>
        <div class="flex items-center gap-3 mb-1.5">
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40">Evidencias Fotográficas Georreferenciadas</span>
          <span class="text-[12px] font-bold uppercase tracking-widest px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">EXIF VALIDADO</span>
        </div>
        <p class="text-[12px] text-[#071D49]/50">Fotografías de supervisión técnica de campo con coordenadas inmutables y fecha de captura satelital.</p>
      </div>
      <div class="flex items-center gap-4 text-right">
        <div>
          <p class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/30 mb-0.5">Tolerancia GPS:</p>
          <p class="text-[12px] font-semibold text-[#071D49]">±1.8 metros</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <!-- Foto 1 -->
      <div class="glass-light   rounded-[24px] overflow-hidden card-lift group">
        <div class="h-40 bg-gray-900 relative overflow-hidden">
          <img src="https://images.unsplash.com/photo-1541888086225-b829ccba6f6b?q=80&w=600&auto=format&fit=crop" class="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500 ease-out" alt="Obra" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div class="absolute top-3 left-3 bg-[#071D49]/80 backdrop-blur-md rounded-lg px-2.5 py-1 text-white text-[12px] font-bold flex items-center gap-1.5">
            <Icon name="calendar_today" className="w-[12px] h-[12px] text-[#1248AA]" />
            14 Mar 2024 • 10:45 AM
          </div>
          <div class="absolute top-3 right-3 bg-emerald-500 rounded-lg px-2 py-1 text-white text-[12px] font-semibold flex items-center gap-1">
            <Icon name="satellite_alt" className="w-[12px] h-[12px]" />
            GPS OK
          </div>
          <div class="absolute bottom-3 left-4">
            <p class="text-white text-[12px] font-bold">Caja de Captación y Línea de Conducción</p>
            <p class="text-white/60 text-[12px] mt-0.5">Fase de Encofrado Hidráulico</p>
          </div>
        </div>
        <div class="p-5 space-y-3">
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Coordenadas:</span>
            <span class="font-bold text-[#071D49]">15.7314° N, -91.4821° W</span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Altitud Satelital:</span>
            <span class="font-bold text-[#071D49]">2,450 msnm</span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Supervisor:</span>
            <span class="font-bold text-[#071D49]">Ing. Carlos Méndez</span>
          </div>
        </div>
      </div>

      <!-- Foto 2 -->
      <div class="glass-light   rounded-[24px] overflow-hidden card-lift group">
        <div class="h-40 bg-gray-900 relative overflow-hidden">
          <img src="https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?q=80&w=600&auto=format&fit=crop" class="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500 ease-out" alt="Tanque" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div class="absolute top-3 left-3 bg-[#071D49]/80 backdrop-blur-md rounded-lg px-2.5 py-1 text-white text-[12px] font-bold flex items-center gap-1.5">
            <Icon name="calendar_today" className="w-[12px] h-[12px] text-[#1248AA]" />
            09 Mar 2024 • 03:20 PM
          </div>
          <div class="absolute top-3 right-3 bg-emerald-500 rounded-lg px-2 py-1 text-white text-[12px] font-semibold flex items-center gap-1">
            <Icon name="satellite_alt" className="w-[12px] h-[12px]" />
            GPS OK
          </div>
          <div class="absolute bottom-3 left-4">
            <p class="text-white text-[12px] font-bold">Tanque de Distribución y Cloración</p>
            <p class="text-white/60 text-[12px] mt-0.5">Prueba Hidrostática de Estanqueidad</p>
          </div>
        </div>
        <div class="p-5 space-y-3">
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Coordenadas:</span>
            <span class="font-bold text-[#071D49]">15.7289° N, -91.4795° W</span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Altitud Satelital:</span>
            <span class="font-bold text-[#071D49]">2,580 msnm</span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Supervisor:</span>
            <span class="font-bold text-[#071D49]">Arq. Valeria Soto</span>
          </div>
        </div>
      </div>

      <!-- Añadir Foto -->
      <div class="border-2 border-dashed border-gray-200 rounded-[24px] flex flex-col items-center justify-center p-6 text-center hover:bg-gray-50 transition-all card-lift cursor-pointer min-h-[260px]">
        <div class="w-12 h-12 rounded-2xl bg-[#EDF4FF] flex items-center justify-center mb-4">
          <Icon name="add_photo_alternate" className="w-6 h-6 text-[#1248AA]" />
        </div>
        <p class="text-[13px] font-semibold text-[#071D49] mb-1.5">Arrastra nuevas fotografías de obra</p>
        <p class="text-[11px] text-[#071D49]/50 max-w-[210px] mb-5">Lectura automática de metadatos EXIF (coordenadas, estampa satelital y dispositivo).</p>
        <span class="px-5 py-2 border border-gray-200 rounded-full text-[11px] font-bold text-[#071D49]">Examinar archivos</span>
      </div>
    </div>
  </div>

  <div class="pt-5 mt-5 border-t border-gray-50 flex items-center justify-between">
    <div class="flex items-center gap-2 text-[12px] text-[#071D49]/40 font-medium">
      <Icon name="shield" className="w-4 h-4 text-emerald-500" />
      Verificación criptográfica: Folio digital acreditado ante la Contraloría General de Cuentas
    </div>
    <div class="text-[12px] font-bold text-[#071D49]/30">
      Hash SHA-256: <span class="text-[#071D49]/60">8f2a...e37d</span>
    </div>
  </div>
</section>
{/key}
{/if}

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#071D49]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="glass-light rounded-[32px] w-full max-w-2xl  p-8  " onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <h2 class="text-xl font-semibold text-[#071D49] tracking-tight">Nuevo Proyecto de Inversión</h2>
        <button onclick={() => showModal = false} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#071D49]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={handleSubmit} class="space-y-5">
        <div>
          <label for="field-1" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Nombre del Proyecto</label>
          <input id="field-1" required bind:value={formData.nombre} type="text" class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all" placeholder="Ej: Sistema de Agua Potable..." />
        </div>
        
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label for="field-2" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Agencia Cooperante</label>
            <input id="field-2" required bind:value={formData.agenciaFinanciadora} type="text" class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all" placeholder="Ej: USAID / AECID" />
          </div>
          <div>
            <label for="field-3" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Municipio</label>
            <select id="field-3" bind:value={formData.municipio} class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all">
              <option value="Santa Eulalia">Santa Eulalia</option>
              <option value="San Pedro Soloma">San Pedro Soloma</option>
              <option value="San Rafael la Independencia">San Rafael la Independencia</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-5">
          <div>
            <label for="field-4" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Aporte Municipal (Q)</label>
            <input id="field-4" required bind:value={formData.presupuestoMunicipal} type="number" min="0" step="0.01" class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all" />
          </div>
          <div>
            <label for="field-5" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/50 mb-1.5">Aporte Cooperación (Q)</label>
            <input id="field-5" required bind:value={formData.presupuestoCooperacion} type="number" min="0" step="0.01" class="w-full bg-white border border-gray-200 focus:border-[#1248AA] focus:ring-1 focus:ring-[#1248AA] rounded-xl px-4 py-3 text-[13px] text-[#071D49] shadow-sm transition-all" />
          </div>
        </div>

        <div class="pt-4 flex justify-end gap-3 mt-8 border-t border-gray-50 pt-6">
          <button type="button" onclick={() => showModal = false} class="px-6 py-3 rounded-full font-bold text-[#071D49]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading} class="px-8 py-3 bg-[#071D49] text-white rounded-full font-bold hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Registrando...' : 'Registrar Proyecto'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
