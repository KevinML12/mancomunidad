<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { toast } from 'svelte-sonner';

  const PROYECTOS_PUBLICOS = [
    {
      id: 1,
      codigo: 'MFN-2024-AG01',
      nombre: 'Sistema de Agua Potable y Conducción por Gravedad',
      municipio: 'Santa Eulalia',
      cooperante: 'USAID / DAI',
      monto: '$ 1,240,000 (Q 9,672,000)',
      avance: 78.5,
      estado: 'En Ejecución',
      visibilidad: true
    },
    {
      id: 2,
      codigo: 'MFN-2024-VI04',
      nombre: 'Puente Biregional San Mateo - Conexión Corredor Norte',
      municipio: 'San Mateo Ixtatán',
      cooperante: 'AECID España',
      monto: '$ 2,850,000 (Q 22,230,000)',
      avance: 42.0,
      estado: 'Cimentación',
      visibilidad: true
    },
    {
      id: 3,
      codigo: 'MFN-2024-PV08',
      nombre: 'Pavimentación Asfáltica Tramo Barillas - Aldea San Ramón',
      municipio: 'Barillas',
      cooperante: 'MFN Fondos Propios',
      monto: 'Q 7,078,000',
      avance: 15.0,
      estado: 'Terracería',
      visibilidad: true
    },
    {
      id: 4,
      codigo: 'MFN-2023-PT02',
      nombre: 'Planta de Tratamiento de Aguas Residuales Macro-Soloma',
      municipio: 'San Pedro Soloma',
      cooperante: 'BID / IADB',
      monto: '$ 3,450,000 (Q 26,910,000)',
      avance: 96.0,
      estado: 'Recepción Previa',
      visibilidad: true
    }
  ];

  const ACTAS_PUBLICAS = [
    {
      numero: 'ACTA-01-2024',
      fecha: '18 de Enero 2024',
      municipio: 'Santa Eulalia',
      resumen: 'Aprobación del Plan Operativo Anual y fijación de cuotas ordinarias.',
      urlPdf: 'https://storage.mfn.gob.gt/actas/acta-01-2024.pdf',
      visibilidad: true
    },
    {
      numero: 'ACTA-02-2024',
      fecha: '08 de Febrero 2024',
      municipio: 'San Pedro Soloma',
      resumen: 'Adjudicación de maquinaria vial para el corredor norte.',
      urlPdf: 'https://storage.mfn.gob.gt/actas/acta-02-2024.pdf',
      visibilidad: true
    },
    {
      numero: 'ACTA-03-2024',
      fecha: '05 de Marzo 2024',
      municipio: 'San Rafael la Independencia',
      resumen: 'Mesa interinstitucional de calidad de agua y desinfección con cloro.',
      urlPdf: 'https://storage.mfn.gob.gt/actas/acta-03-2024.pdf',
      visibilidad: true
    }
  ];

  let proyectos = $state(PROYECTOS_PUBLICOS);
  let actas = $state(ACTAS_PUBLICAS);
  let activeTab = $state('proyectos'); // 'proyectos' | 'actas' | 'estadisticas'
  let searchQuery = $state('');

  function toggleVisibilidadProyecto(p) {
    p.visibilidad = !p.visibilidad;
    proyectos = [...proyectos];
    toast.info(p.visibilidad ? 'Proyecto publicado en portal ciudadano' : 'Proyecto retirado de la vista pública');
  }

  function toggleVisibilidadActa(a) {
    a.visibilidad = !a.visibilidad;
    actas = [...actas];
    toast.info(a.visibilidad ? 'Acta publicada en portal ciudadano' : 'Acta retirada de la vista pública');
  }

  let proyectosVisibles = $derived(
    proyectos.filter(p => {
      // Si está autenticado como Gerente, ve todos con switch; si es ciudadano, solo visibilidad: true
      if (!auth.isAuthenticated && !p.visibilidad) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.municipio.toLowerCase().includes(q);
      }
      return true;
    })
  );

  let actasVisibles = $derived(
    actas.filter(a => {
      if (!auth.isAuthenticated && !a.visibilidad) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return a.numero.toLowerCase().includes(q) || a.municipio.toLowerCase().includes(q) || a.resumen.toLowerCase().includes(q);
      }
      return true;
    })
  );
</script>

<svelte:head>
  <title>Portal de Transparencia y Datos Abiertos | MFN</title>
</svelte:head>

<!-- BANNER INSTITUCIONAL CIUDADANO -->
<div class="bg-white border border-gray-100 rounded-[32px] p-8 md:p-12 mb-8 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] animate-fade-in relative overflow-hidden">
  <div class="max-w-3xl space-y-4">
    <div class="flex items-center gap-2">
      <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#3B82F6] bg-blue-50 px-3 py-1 rounded-full">
        Decreto 57-2008 · Acceso a la Información
      </span>
      {#if auth.isAuthenticated}
        <span class="text-[9px] font-extrabold uppercase tracking-[0.1em] text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Modo Administrador Activo (RF5)
        </span>
      {/if}
    </div>
    <h2 class="text-[36px] md:text-[44px] font-black tracking-[-0.04em] leading-tight text-[#0A1526]">
      Rendición de Cuentas y Datos Abiertos
    </h2>
    <p class="text-[14px] text-[#0A1526]/60 leading-relaxed font-medium">
      Consulte en tiempo real el avance de obras intermunicipales, resoluciones de Junta Directiva y estadísticas de infraestructura sanitaria en los 6 municipios miembros de Huehuetenango Norte.
    </p>

    <!-- Buscador Integrado -->
    <div class="pt-2 relative max-w-xl">
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Buscar obra, resolución, acta o municipio..." 
        class="w-full pl-12 pr-4 py-3.5 bg-[#F4F7FA] border border-gray-200 rounded-full text-[13px] text-[#0A1526] placeholder-[#0A1526]/40 focus:outline-none focus:border-[#3B82F6] focus:bg-white transition-all shadow-xs" 
      />
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0A1526]/40 mt-1" />
    </div>
  </div>
</div>

<!-- NAVEGACIÓN POR PESTAÑAS CIUDADANAS -->
<div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
  <div class="flex items-center gap-2 p-1.5 bg-white border border-gray-100 rounded-full shadow-xs">
    <button 
      onclick={() => activeTab = 'proyectos'}
      class="px-5 py-2.5 rounded-full text-[12px] font-bold transition-all pill-interactive {activeTab === 'proyectos' ? 'bg-[#0A1526] text-white shadow-xs' : 'text-[#0A1526]/60 hover:text-[#0A1526]'}"
    >
      Proyectos Públicos ({proyectosVisibles.length})
    </button>
    <button 
      onclick={() => activeTab = 'actas'}
      class="px-5 py-2.5 rounded-full text-[12px] font-bold transition-all pill-interactive {activeTab === 'actas' ? 'bg-[#0A1526] text-white shadow-xs' : 'text-[#0A1526]/60 hover:text-[#0A1526]'}"
    >
      Actas y Resoluciones ({actasVisibles.length})
    </button>
    <button 
      onclick={() => activeTab = 'estadisticas'}
      class="px-5 py-2.5 rounded-full text-[12px] font-bold transition-all pill-interactive {activeTab === 'estadisticas' ? 'bg-[#0A1526] text-white shadow-xs' : 'text-[#0A1526]/60 hover:text-[#0A1526]'}"
    >
      Indicadores ASH Regionales
    </button>
  </div>

  <span class="text-[11px] font-mono text-[#0A1526]/40">
    Actualizado al 24 de Marzo 2024
  </span>
</div>

<!-- CONTENIDO POR PESTAÑAS -->
{#key activeTab}
<div class="animate-scale-up">
{#if activeTab === 'proyectos'}
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    {#each proyectosVisibles as p}
      <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] card-lift flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-3 mb-3">
            <span class="text-[9px] font-mono font-bold text-[#3B82F6] bg-blue-50 px-2 py-0.5 rounded-md">
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

          <h3 class="text-lg font-black text-[#0A1526] tracking-tight leading-snug mb-1">
            {p.nombre}
          </h3>
          <p class="text-[12px] font-bold text-[#0A1526]/40 mb-4">{p.municipio} · Financiado por {p.cooperante}</p>

          <div class="p-4 rounded-2xl bg-[#F8FAFC] border border-gray-100 mb-5">
            <span class="text-[9px] font-bold uppercase tracking-wider text-[#0A1526]/40 block mb-1">Inversión Aprobada</span>
            <p class="text-base font-black text-[#0A1526]">{p.monto}</p>
          </div>

          <div class="space-y-1.5">
            <div class="flex justify-between text-[11px] font-bold">
              <span class="text-[#0A1526]/50">Avance Físico Certificado:</span>
              <span class="text-[#3B82F6] font-black">{p.avance}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div class="bg-[#3B82F6] h-1.5 rounded-full transition-all duration-500" style="width: {p.avance}%"></div>
            </div>
          </div>
        </div>

        <div class="pt-5 mt-5 border-t border-gray-50 flex items-center justify-between text-[11px]">
          <span class="text-[#0A1526]/40 font-medium">Supervisión: Ing. Carlos Méndez</span>
          <span class="text-emerald-700 font-bold flex items-center gap-1">
            <Icon name="verified" className="w-3.5 h-3.5" />
            <span>EXIF Validado</span>
          </span>
        </div>
      </div>
    {/each}
  </div>
{:else if activeTab === 'actas'}
  <div class="bg-white border border-gray-100 rounded-[32px] p-8 shadow-[0_20px_60px_-15px_rgba(10,21,38,0.05)] animate-fade-in">
    <div class="space-y-4">
      {#each actasVisibles as a}
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
              class="px-5 py-2.5 bg-[#0A1526] hover:bg-black text-white text-[12px] font-bold rounded-full shadow-xs flex items-center gap-2 transition-colors"
            >
              <Icon name="download" className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Descargar Acta PDF</span>
            </a>
          </div>
        </div>
      {/each}
    </div>
  </div>
{:else}
  <!-- Indicadores ASH Abiertos -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
    <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-xs">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#0A1526]/40">Cobertura Regional de Agua</span>
        <Icon name="water_drop" className="w-5 h-5 text-[#3B82F6]" />
      </div>
      <p class="text-[32px] font-black text-[#0A1526]">68.4%</p>
      <p class="text-[12px] text-[#0A1526]/50 mt-1">Hogares con servicio continuo en los 6 municipios.</p>
    </div>

    <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-xs">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#0A1526]/40">Cobertura de Saneamiento</span>
        <Icon name="sanitizer" className="w-5 h-5 text-emerald-600" />
      </div>
      <p class="text-[32px] font-black text-[#0A1526]">51.2%</p>
      <p class="text-[12px] text-[#0A1526]/50 mt-1">Letrinas mejoradas y red de drenaje sanitario.</p>
    </div>

    <div class="bg-white border border-gray-100 rounded-[28px] p-7 shadow-xs">
      <div class="flex items-center justify-between mb-3">
        <span class="text-[9px] font-extrabold uppercase tracking-wider text-[#0A1526]/40">Sistemas con Cloro Conforme</span>
        <Icon name="science" className="w-5 h-5 text-amber-500" />
      </div>
      <p class="text-[32px] font-black text-[#0A1526]">72.5%</p>
      <p class="text-[12px] text-[#0A1526]/50 mt-1">Cumplen norma técnica nacional COGUANOR.</p>
    </div>
  </div>
{/if}
</div>
{/key}
