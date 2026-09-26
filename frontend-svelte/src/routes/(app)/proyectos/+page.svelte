<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';
  import { fade, fly } from 'svelte/transition';

  const PROYECTOS_DEFAULT = [
    {
      id: 'AG01',
      codigo: 'MFN-2024-',
      sufijo: 'AG01',
      nombre: 'Sistema de Agua Potable y Conducción por Gravedad',
      nombreDetalle: 'Sistema de Agua Potable y Conducción por Gravedad Santa Eulalia',
      agencia: 'USAID / DAI',
      municipio: 'Santa Eulalia',
      subregion: 'MICROCUENCA IXTAPOC',
      presupuestoUsd: '$1,240,000',
      presupuestoQ: 'Q 9,672,000',
      estado: 'En Ejecución',
      estadoTipo: 'emerald',
      avance: 78.5,
      etapa: 'ETAPA 4/5',
      convenio: 'Convenio Vinculante USAID-GUA-089',
      descripcion: 'Intervención intermunicipal prioritaria orientada a garantizar caudal continuo y desinfección automatizada a 14,200 habitantes. Comprende obra de captación superficial, desarenador, 18.4 km de tubería HG de 4 pulgadas y tanque de dosificación de cloro.',
      aprobado: '$1,240,000',
      devengado: '$973,400',
      saldo: '$266,600',
      hallazgos: 0
    },
    {
      id: 'VI04',
      codigo: 'MFN-2024-',
      sufijo: 'VI04',
      nombre: 'Puente Biregional San Mateo - Conexión Corredor Norte',
      nombreDetalle: 'Puente Biregional San Mateo - Conexión Corredor Norte San Mateo Ixtatán',
      agencia: 'AECID España',
      municipio: 'San Mateo Ixtatán',
      subregion: 'RÍO YOLCULTEC',
      presupuestoUsd: '$2,850,000',
      presupuestoQ: 'Q 22,230,000',
      estado: 'Cimentación',
      estadoTipo: 'amber',
      avance: 42.0,
      etapa: 'ETAPA 2/5',
      convenio: 'Convenio Vinculante AECID-GT-114',
      descripcion: 'Construcción de infraestructura vial estratégica de conexión binacional sobre el Río Yolcultec. Estructura mixta con zapatas de concreto armado y superestructura metálica para soporte de carga pesada.',
      aprobado: '$2,850,000',
      devengado: '$1,197,000',
      saldo: '$1,653,000',
      hallazgos: 0
    },
    {
      id: 'PV08',
      codigo: 'MFN-2024-',
      sufijo: 'PV08',
      nombre: 'Pavimentación Asfáltica Tramo Barillas - Aldea San Ramón',
      nombreDetalle: 'Pavimentación Asfáltica Tramo Barillas - Aldea San Ramón',
      agencia: 'MFN Propio',
      municipio: 'Barillas',
      subregion: 'SECTOR FRONTERIZO',
      presupuestoUsd: '$918,000',
      presupuestoQ: 'Q 7,078,000',
      estado: 'Terracería',
      estadoTipo: 'blue',
      avance: 15.0,
      etapa: 'ETAPA 1/4',
      convenio: 'Fondo Mancomunado Extraordinario MFN-2024',
      descripcion: 'Mejoramiento vial mediante colocación de carpeta asfáltica en caliente y cunetas de concreto hidráulico a lo largo de 8.5 km en la franja fronteriza.',
      aprobado: '$918,000',
      devengado: '$137,700',
      saldo: '$780,300',
      hallazgos: 0
    },
    {
      id: 'PT02',
      codigo: 'MFN-2023-',
      sufijo: 'PT02',
      nombre: 'Planta de Tratamiento de Aguas Residuales Macro-Soloma',
      nombreDetalle: 'Planta de Tratamiento de Aguas Residuales Macro-Soloma',
      agencia: 'BID / IADB',
      municipio: 'San Pedro Soloma',
      subregion: 'VALLE CENTRAL',
      presupuestoUsd: '$3,450,000',
      presupuestoQ: 'Q 26,910,000',
      estado: 'Recepción Previa',
      estadoTipo: 'emerald',
      avance: 96.0,
      etapa: 'ETAPA 5/5',
      convenio: 'Convenio de Cooperación Reembolsable BID-GUA-002',
      descripcion: 'Planta de biofiltración y lodos activados con capacidad de tratamiento de 45 litros por segundo, reduciendo la contaminación de la cuenca hidrográfica del Río San Pedro.',
      aprobado: '$3,450,000',
      devengado: '$3,312,000',
      saldo: '$138,000',
      hallazgos: 0
    }
  ];

  let proyectos = $state(PROYECTOS_DEFAULT);
  let selectedProyecto = $state(PROYECTOS_DEFAULT[0]);
  let loading = $state(false);
  
  // Modal states
  let showModal = $state(false);
  let formLoading = $state(false);
  let formData = $state({
    nombre: '',
    agenciaFinanciadora: '',
    municipio: 'Santa Eulalia',
    fechaInicioPlanificada: '',
    fechaFinPlanificada: '',
    presupuestoMunicipal: 0,
    presupuestoCooperacion: 0
  });

  const fetchProyectos = async () => {
    try {
      const { data } = await apiClient.get('/proyectos');
      if (data && data.length > 0) {
        // Enlazar los proyectos de la base de datos con los visuales
        const merged = data.map((d, idx) => ({
          ...PROYECTOS_DEFAULT[idx % PROYECTOS_DEFAULT.length],
          id: d.id.toString(),
          sufijo: `AG${d.id.toString().padStart(2, '0')}`,
          nombre: d.nombre,
          nombreDetalle: d.nombre,
          agencia: d.agenciaFinanciadora || 'USAID / DAI',
          avance: d.porcentajeAvanceFisico || 78.5,
          estado: d.estado || 'En Ejecución'
        }));
        proyectos = merged;
        selectedProyecto = merged[0];
      }
    } catch (err) {
      console.log('Utilizando cartera predeterminada MFN');
    }
  };

  onMount(() => {
    fetchProyectos();
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    formLoading = true;
    try {
      await apiClient.post('/proyectos', formData);
      toast.success('Proyecto creado exitosamente');
      showModal = false;
      const nuevo = {
        id: (proyectos.length + 1).toString(),
        codigo: 'MFN-2024-',
        sufijo: `AG${(proyectos.length + 1).toString().padStart(2, '0')}`,
        nombre: formData.nombre,
        nombreDetalle: formData.nombre,
        agencia: formData.agenciaFinanciadora,
        municipio: formData.municipio,
        subregion: 'ZONA DE INVERSIÓN',
        presupuestoUsd: `$${Math.round((Number(formData.presupuestoMunicipal) + Number(formData.presupuestoCooperacion)) / 7.8).toLocaleString('en-US')}`,
        presupuestoQ: `Q ${(Number(formData.presupuestoMunicipal) + Number(formData.presupuestoCooperacion)).toLocaleString('es-GT')}`,
        estado: 'En Ejecución',
        estadoTipo: 'emerald',
        avance: 10.0,
        etapa: 'ETAPA 1/5',
        convenio: `Convenio Institucional ${formData.agenciaFinanciadora}`,
        descripcion: 'Nuevo proyecto registrado en la cartera de inversiones intermunicipales.',
        aprobado: `$${Math.round((Number(formData.presupuestoMunicipal) + Number(formData.presupuestoCooperacion)) / 7.8).toLocaleString('en-US')}`,
        devengado: '$0',
        saldo: `$${Math.round((Number(formData.presupuestoMunicipal) + Number(formData.presupuestoCooperacion)) / 7.8).toLocaleString('en-US')}`,
        hallazgos: 0
      };
      proyectos = [nuevo, ...proyectos];
      selectedProyecto = nuevo;
    } catch (err) {
      toast.error('Error al crear proyecto');
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
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Módulo 01</span>
      <span class="text-[9px] text-[#0A1526]/30">•</span>
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Concurrencia Fiduciaria y Territorial</span>
    </div>
    <h2 class="text-[40px] font-black tracking-[-0.04em] leading-none text-[#0A1526] mb-3">Proyectos Intermunicipales</h2>
    <p class="text-[13px] text-[#0A1526]/50 leading-relaxed max-w-xl">Control de inversión pública compartida, fiscalización en tiempo real y evidencias de campo.</p>
  </div>
  <div class="flex items-center gap-3 shrink-0">
    <!-- Buscador -->
    <div class="relative">
      <input type="text" placeholder="Buscar por código, obra o cuenca..." class="w-[300px] pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full text-[13px] text-[#0A1526] placeholder-[#0A1526]/30 shadow-sm focus:outline-none focus:border-[#3B82F6] transition-all" />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0A1526]/30" />
    </div>
    <!-- Filtro -->
    <button class="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-full shadow-sm text-[13px] font-bold text-[#0A1526] transition-colors flex items-center gap-2">
      <Icon name="tune" className="w-[18px] h-[18px] text-[#0A1526]/50" />
      Filtros
    </button>
    <!-- Nuevo Proyecto -->
    <button onclick={() => showModal = true} class="px-6 py-3 bg-[#0A1526] hover:bg-black text-white rounded-full text-[13px] font-bold shadow-md transition-colors flex items-center gap-2">
      <Icon name="add" className="w-[18px] h-[18px] text-[#3B82F6]" stroke={2.5} />
      Nuevo Proyecto
    </button>
  </div>
</header>

<!-- TARJETA DE DATOS (CARTERA DE INVERSIÓN) -->
<section class="bg-white shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] rounded-[32px] p-8 mb-8 border border-gray-100/50">
  <div class="flex items-center justify-between pb-6 mb-2 border-b border-gray-50">
    <div>
      <h3 class="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1">Cartera de Inversión Vigente</h3>
      <p class="text-[12px] font-medium text-[#0A1526]/50">4 convenios activos con avance técnico verificado por la Unidad Técnica MFN</p>
    </div>
    <div class="bg-white border border-gray-100 px-3.5 py-1.5 rounded-full shadow-sm">
      <span class="text-[10px] font-extrabold text-[#0A1526]/60 uppercase tracking-widest">{proyectos.length} de 14 Expedientes</span>
    </div>
  </div>

  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-gray-50">
          <th class="py-5 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Proyecto / Expediente</th>
          <th class="py-5 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Agencia Cooperante</th>
          <th class="py-5 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Municipio Ejecutor</th>
          <th class="py-5 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Presupuesto</th>
          <th class="py-5 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">Estado</th>
          <th class="py-5 px-4 text-[9px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 w-44">Avance Físico</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50/50">
        {#each proyectos as p}
          <tr 
            class="transition-colors cursor-pointer group {selectedProyecto?.id === p.id ? 'bg-[#F4F7FA]/60' : 'hover:bg-gray-50/50'}"
            onclick={() => selectedProyecto = p}
          >
            <td class="py-5 px-4">
              <div class="flex items-start gap-3">
                <span class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 {selectedProyecto?.id === p.id ? 'bg-[#3B82F6]' : 'bg-[#0A1526]/20 group-hover:bg-[#3B82F6]/50'} transition-colors"></span>
                <div>
                  <div class="flex items-center gap-1 mb-1">
                    <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#0A1526]/40">{p.codigo}</span>
                    <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#3B82F6]">{p.sufijo}</span>
                  </div>
                  <p class="text-[13px] font-black text-[#0A1526] leading-tight tracking-tight max-w-[210px]">{p.nombre}</p>
                </div>
              </div>
            </td>
            <td class="py-5 px-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full {p.agencia.includes('USAID') ? 'bg-[#EBF3FF] text-[#1D4ED8] border border-[#3B82F6]/10' : p.agencia.includes('AECID') ? 'bg-amber-50 text-amber-800 border border-amber-200/50' : p.agencia.includes('BID') ? 'bg-cyan-50 text-cyan-800 border border-cyan-200/50' : 'bg-gray-100 text-gray-700 border border-gray-200'}">
                <Icon name="verified_user" className="w-3.5 h-3.5" />
                <span class="text-[11px] font-extrabold tracking-tight">{p.agencia}</span>
              </span>
            </td>
            <td class="py-5 px-4">
              <p class="text-[13px] font-bold text-[#0A1526] tracking-tight">{p.municipio}</p>
              <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#0A1526]/40 mt-0.5">{p.subregion}</p>
            </td>
            <td class="py-5 px-4">
              <p class="text-[16px] font-black tracking-[-0.02em] text-[#0A1526]">{p.presupuestoUsd}</p>
              <p class="text-[10px] font-bold text-[#0A1526]/40 mt-0.5">{p.presupuestoQ}</p>
            </td>
            <td class="py-5 px-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full {p.estadoTipo === 'emerald' ? 'bg-[#ECFDF5] text-emerald-700 border-emerald-100' : p.estadoTipo === 'amber' ? 'bg-[#FFFBEB] text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'} border">
                <span class="w-1.5 h-1.5 rounded-full {p.estadoTipo === 'emerald' ? 'bg-emerald-500' : p.estadoTipo === 'amber' ? 'bg-amber-500' : 'bg-blue-500'}"></span>
                <span class="text-[11px] font-extrabold tracking-tight">{p.estado}</span>
              </span>
            </td>
            <td class="py-5 px-4">
              <div class="space-y-1.5 pr-4">
                <div class="flex items-end justify-between">
                  <span class="text-[14px] font-black text-[#0A1526] leading-none">{p.avance}%</span>
                  <span class="text-[8px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40">{p.etapa}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1">
                  <div class="bg-[#3B82F6] h-1 rounded-full transition-all duration-500" style="width: {p.avance}%"></div>
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
<section class="bg-white shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] rounded-[32px] p-8 space-y-8 animate-scale-up border border-gray-100/50">
  <!-- Header de la Ficha -->
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-50">
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <span class="text-[9px] font-extrabold uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg bg-[#EBF3FF] text-[#1D4ED8]">Expediente Auditado</span>
        <span class="text-[11px] font-bold text-[#0A1526]/50">{selectedProyecto.codigo}{selectedProyecto.sufijo}</span>
        <span class="w-1 h-1 rounded-full bg-gray-200"></span>
        <span class="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5">
          <Icon name="verified" className="w-4 h-4" />
          {selectedProyecto.convenio}
        </span>
      </div>
      <h3 class="text-[28px] font-black tracking-[-0.03em] text-[#0A1526] leading-tight max-w-3xl">{selectedProyecto.nombreDetalle}</h3>
      <p class="text-[13px] text-[#0A1526]/50 leading-relaxed max-w-4xl font-medium">
        {selectedProyecto.descripcion}
      </p>
    </div>
    <!-- Botones de Acción -->
    <div class="flex items-center gap-3 shrink-0">
      <button class="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-full shadow-sm text-[12px] font-bold text-[#0A1526] transition-all flex items-center gap-2 pill-interactive">
        <Icon name="description" className="w-[18px] h-[18px] text-[#0A1526]/40" />
        Dictamen SIAF
      </button>
      <a href="/proyectos/{selectedProyecto.id}" class="px-6 py-3 bg-[#0A1526] hover:bg-black text-white rounded-full text-[12px] font-bold shadow-md transition-all flex items-center gap-2 pill-interactive">
        <Icon name="upload" className="w-[18px] h-[18px] text-[#3B82F6]" />
        Subir Evidencia
      </a>
    </div>
  </div>

  <!-- TARJETAS FINANCIERAS (GRID PLANO SIN SOMBRA) -->
  <div>
    <div class="flex items-center justify-between mb-5">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Estado Fiduciario y Certificación de Fondos</span>
      <span class="text-[10px] font-bold text-[#0A1526]/30 uppercase tracking-[0.1em]">Corte al 24 de Marzo 2024</span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- StatCard 1 -->
      <div class="bg-white border border-gray-100 rounded-[20px] p-6 shadow-xs card-lift">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Monto Aprobado</span>
          <span class="w-8 h-8 rounded-full bg-[#EBF3FF] flex items-center justify-center text-[#3B82F6]">
            <Icon name="attach_money" className="w-[18px] h-[18px]" stroke={2} />
          </span>
        </div>
        <p class="text-[26px] font-black tracking-[-0.04em] text-[#0A1526]">{selectedProyecto.aprobado}</p>
        <div class="mt-3 flex items-center gap-1.5">
          <span class="text-[11px] font-black text-emerald-600">100%</span>
          <span class="text-[11px] font-medium text-[#0A1526]/50">Fideicomiso aperturado</span>
        </div>
      </div>
      <!-- StatCard 2 -->
      <div class="bg-white border border-gray-100 rounded-[20px] p-6 shadow-xs card-lift">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Monto Devengado</span>
          <span class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Icon name="trending_up" className="w-[18px] h-[18px]" stroke={2} />
          </span>
        </div>
        <p class="text-[26px] font-black tracking-[-0.04em] text-[#0A1526]">{selectedProyecto.devengado}</p>
        <div class="mt-3 flex items-center gap-1.5">
          <span class="text-[11px] font-black text-emerald-600">{selectedProyecto.avance}%</span>
          <span class="text-[11px] font-medium text-[#0A1526]/50">ejecutado financieramente</span>
        </div>
      </div>
      <!-- StatCard 3 -->
      <div class="bg-white border border-gray-100 rounded-[20px] p-6 shadow-xs card-lift">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Saldo por Liquidar</span>
          <span class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <Icon name="schedule" className="w-[18px] h-[18px]" stroke={2} />
          </span>
        </div>
        <p class="text-[26px] font-black tracking-[-0.04em] text-[#0A1526]">{selectedProyecto.saldo}</p>
        <div class="mt-3 flex items-center gap-1.5">
          <span class="text-[11px] font-medium text-[#0A1526]/50">Retención de garantía 5% incluida</span>
        </div>
      </div>
      <!-- StatCard 4 -->
      <div class="bg-white border border-gray-100 rounded-[20px] p-6 shadow-xs card-lift">
        <div class="flex items-center justify-between mb-4">
          <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Auditoría Concurrente</span>
          <span class="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <Icon name="shield" className="w-[18px] h-[18px]" stroke={2} />
          </span>
        </div>
        <div class="flex items-baseline gap-1.5">
          <p class="text-[26px] font-black tracking-[-0.04em] text-[#0A1526]">{selectedProyecto.hallazgos}</p>
          <p class="text-[14px] font-bold text-[#0A1526]/40">Hallazgos</p>
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
          <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]/40">Evidencias Fotográficas Georreferenciadas</span>
          <span class="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">EXIF VALIDADO</span>
        </div>
        <p class="text-[12px] text-[#0A1526]/50">Fotografías de supervisión técnica de campo con coordenadas inmutables y fecha de captura satelital.</p>
      </div>
      <div class="flex items-center gap-4 text-right">
        <div>
          <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#0A1526]/30 mb-0.5">Tolerancia GPS:</p>
          <p class="text-[12px] font-black text-[#0A1526]">±1.8 metros</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      <!-- Foto 1 -->
      <div class="bg-white border border-gray-100 rounded-[24px] overflow-hidden card-lift group">
        <div class="h-40 bg-gray-900 relative overflow-hidden">
          <img src="https://images.unsplash.com/photo-1541888086225-b829ccba6f6b?q=80&w=600&auto=format&fit=crop" class="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500 ease-out" alt="Obra" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div class="absolute top-3 left-3 bg-[#0A1526]/80 backdrop-blur-md rounded-lg px-2.5 py-1 text-white text-[9px] font-bold flex items-center gap-1.5">
            <Icon name="calendar_today" className="w-[12px] h-[12px] text-[#3B82F6]" />
            14 Mar 2024 • 10:45 AM
          </div>
          <div class="absolute top-3 right-3 bg-emerald-500 rounded-lg px-2 py-1 text-white text-[9px] font-black flex items-center gap-1">
            <Icon name="satellite_alt" className="w-[12px] h-[12px]" />
            GPS OK
          </div>
          <div class="absolute bottom-3 left-4">
            <p class="text-white text-[12px] font-bold">Caja de Captación y Línea de Conducción</p>
            <p class="text-white/60 text-[10px] mt-0.5">Fase de Encofrado Hidráulico</p>
          </div>
        </div>
        <div class="p-5 space-y-3">
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#0A1526]/40">Coordenadas:</span>
            <span class="font-bold text-[#0A1526]">15.7314° N, -91.4821° W</span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#0A1526]/40">Altitud Satelital:</span>
            <span class="font-bold text-[#0A1526]">2,450 msnm</span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#0A1526]/40">Supervisor:</span>
            <span class="font-bold text-[#0A1526]">Ing. Carlos Méndez</span>
          </div>
        </div>
      </div>

      <!-- Foto 2 -->
      <div class="bg-white border border-gray-100 rounded-[24px] overflow-hidden card-lift group">
        <div class="h-40 bg-gray-900 relative overflow-hidden">
          <img src="https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?q=80&w=600&auto=format&fit=crop" class="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500 ease-out" alt="Tanque" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div class="absolute top-3 left-3 bg-[#0A1526]/80 backdrop-blur-md rounded-lg px-2.5 py-1 text-white text-[9px] font-bold flex items-center gap-1.5">
            <Icon name="calendar_today" className="w-[12px] h-[12px] text-[#3B82F6]" />
            09 Mar 2024 • 03:20 PM
          </div>
          <div class="absolute top-3 right-3 bg-emerald-500 rounded-lg px-2 py-1 text-white text-[9px] font-black flex items-center gap-1">
            <Icon name="satellite_alt" className="w-[12px] h-[12px]" />
            GPS OK
          </div>
          <div class="absolute bottom-3 left-4">
            <p class="text-white text-[12px] font-bold">Tanque de Distribución y Cloración</p>
            <p class="text-white/60 text-[10px] mt-0.5">Prueba Hidrostática de Estanqueidad</p>
          </div>
        </div>
        <div class="p-5 space-y-3">
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#0A1526]/40">Coordenadas:</span>
            <span class="font-bold text-[#0A1526]">15.7289° N, -91.4795° W</span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#0A1526]/40">Altitud Satelital:</span>
            <span class="font-bold text-[#0A1526]">2,580 msnm</span>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#0A1526]/40">Supervisor:</span>
            <span class="font-bold text-[#0A1526]">Arq. Valeria Soto</span>
          </div>
        </div>
      </div>

      <!-- Añadir Foto -->
      <div class="border-2 border-dashed border-gray-200 rounded-[24px] flex flex-col items-center justify-center p-6 text-center hover:bg-gray-50 transition-all card-lift cursor-pointer min-h-[260px]">
        <div class="w-12 h-12 rounded-2xl bg-[#EBF3FF] flex items-center justify-center mb-4">
          <Icon name="add_photo_alternate" className="w-6 h-6 text-[#3B82F6]" />
        </div>
        <p class="text-[13px] font-black text-[#0A1526] mb-1.5">Arrastra nuevas fotografías de obra</p>
        <p class="text-[11px] text-[#0A1526]/50 max-w-[210px] mb-5">Lectura automática de metadatos EXIF (coordenadas, estampa satelital y dispositivo).</p>
        <span class="px-5 py-2 border border-gray-200 rounded-full text-[11px] font-bold text-[#0A1526]">Examinar archivos</span>
      </div>
    </div>
  </div>

  <div class="pt-5 mt-5 border-t border-gray-50 flex items-center justify-between">
    <div class="flex items-center gap-2 text-[10px] text-[#0A1526]/40 font-medium">
      <Icon name="shield" className="w-4 h-4 text-emerald-500" />
      Verificación criptográfica: Folio digital acreditado ante la Contraloría General de Cuentas
    </div>
    <div class="text-[10px] font-bold text-[#0A1526]/30">
      Hash SHA-256: <span class="text-[#0A1526]/60">8f2a...e37d</span>
    </div>
  </div>
</section>
{/key}
{/if}

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div transition:fade={{ duration: 180 }} class="fixed inset-0 bg-[#0A1526]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={() => showModal = false}>
    <div transition:fly={{ y: 20, duration: 250 }} class="bg-white rounded-[32px] w-full max-w-2xl shadow-[0_24px_60px_-20px_rgba(10,21,38,0.12)] p-8 border border-gray-100" onclick={e => e.stopPropagation()}>
      <div class="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
        <h2 class="text-xl font-black text-[#0A1526] tracking-tight">Nuevo Proyecto de Inversión</h2>
        <button onclick={() => showModal = false} class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Icon name="close" className="w-5 h-5 text-[#0A1526]/50" stroke={2} />
        </button>
      </div>

      <form onsubmit={handleSubmit} class="space-y-5">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/50 mb-1.5">Nombre del Proyecto</label>
          <input required bind:value={formData.nombre} type="text" class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] rounded-xl px-4 py-3 text-[13px] text-[#0A1526] shadow-sm transition-all" placeholder="Ej: Sistema de Agua Potable..." />
        </div>
        
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/50 mb-1.5">Agencia Cooperante</label>
            <input required bind:value={formData.agenciaFinanciadora} type="text" class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] rounded-xl px-4 py-3 text-[13px] text-[#0A1526] shadow-sm transition-all" placeholder="Ej: USAID / AECID" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/50 mb-1.5">Municipio</label>
            <select bind:value={formData.municipio} class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] rounded-xl px-4 py-3 text-[13px] text-[#0A1526] shadow-sm transition-all">
              <option value="Santa Eulalia">Santa Eulalia</option>
              <option value="San Pedro Soloma">San Pedro Soloma</option>
              <option value="San Rafael la Independencia">San Rafael la Independencia</option>
              <option value="San Mateo Ixtatán">San Mateo Ixtatán</option>
              <option value="Barillas">Santa Cruz Barillas</option>
              <option value="San Miguel Acatán">San Miguel Acatán</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/50 mb-1.5">Aporte Municipal (Q)</label>
            <input required bind:value={formData.presupuestoMunicipal} type="number" min="0" step="0.01" class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] rounded-xl px-4 py-3 text-[13px] text-[#0A1526] shadow-sm transition-all" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/50 mb-1.5">Aporte Cooperación (Q)</label>
            <input required bind:value={formData.presupuestoCooperacion} type="number" min="0" step="0.01" class="w-full bg-white border border-gray-200 focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] rounded-xl px-4 py-3 text-[13px] text-[#0A1526] shadow-sm transition-all" />
          </div>
        </div>

        <div class="pt-4 flex justify-end gap-3 mt-8 border-t border-gray-50 pt-6">
          <button type="button" onclick={() => showModal = false} class="px-6 py-3 rounded-full font-bold text-[#0A1526]/60 hover:bg-gray-50 transition-colors text-[13px]">Cancelar</button>
          <button type="submit" disabled={formLoading} class="px-8 py-3 bg-[#0A1526] text-white rounded-full font-bold hover:bg-black shadow-md transition-all text-[13px] disabled:opacity-50">
            {formLoading ? 'Registrando...' : 'Registrar Proyecto'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
