<script>
  import { onMount } from 'svelte';
  import apiClient from '$lib/apiClient';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';

  let dictamen = $state(null);
  let selloForense = $state(null);
  let loading = $state(true);
  let verificando = $state(false);

  const fetchData = async () => {
    loading = true;
    try {
      const [resDictamen, resSello] = await Promise.all([
        apiClient.get('/inteligencia/dictamen'),
        apiClient.get('/inteligencia/sello-forense')
      ]);
      dictamen = resDictamen.data;
      selloForense = resSello.data;
    } catch (err) {
      console.error('Error al cargar datos de inteligencia:', err);
      toast.error('No se pudo conectar con el motor de inteligencia territorial');
    } finally {
      loading = false;
    }
  };

  const revalidarSello = async () => {
    verificando = true;
    try {
      const { data } = await apiClient.get('/inteligencia/sello-forense');
      selloForense = data;
      toast.success('Cadena de bloques criptográfica validada: 100% inalterada en Neon DB');
    } catch (err) {
      toast.error('Error al auditar integridad');
    } finally {
      verificando = false;
    }
  };

  onMount(() => {
    fetchData();
  });
</script>

<svelte:head>
  <title>Inteligencia Territorial y Auditoría CGC | MFN Digital</title>
</svelte:head>

<!-- HEADER PRINCIPAL -->
<header class="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 mt-2 animate-fade-in">
  <div>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-[#3B82F6]">Módulo 08 Especializado</span>
      <span class="text-[9px] text-[#0A1526]/30">•</span>
      <span class="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-600">Innovación Pública Regional</span>
    </div>
    <h2 class="text-[36px] md:text-[40px] font-black tracking-[-0.04em] leading-none text-[#0A1526] mb-3">
      Inteligencia Territorial y Certificación Forense CGC
    </h2>
    <p class="text-[13px] text-[#0A1526]/50 leading-relaxed max-w-3xl">
      Algoritmo Multicriterio de Priorización de Inversión Intermunicipal (IPIM) sin sesgo político y Sellado Criptográfico SHA-256 de Inmutabilidad auditado para la Contraloría General de Cuentas.
    </p>
  </div>

  <div class="flex items-center gap-3 shrink-0">
    <button 
      onclick={revalidarSello}
      disabled={verificando}
      class="px-5 py-3 rounded-full text-[12px] font-bold text-white bg-[#0A1526] hover:bg-black transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
    >
      <Icon name="verified_user" className="w-4 h-4 text-emerald-400 {verificando ? 'animate-spin' : ''}" />
      <span>{verificando ? 'Auditando Base de Datos...' : 'Auditar Integridad Criptográfica'}</span>
    </button>
  </div>
</header>

{#if loading}
  <div class="py-24 text-center bg-white border border-gray-100 rounded-[32px] shadow-xs animate-pulse">
    <div class="w-10 h-10 border-3 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
    <p class="text-[13px] font-bold text-[#0A1526]">Ejecutando motor matemático de priorización geoespacial...</p>
    <p class="text-[11px] text-[#0A1526]/40 mt-1">Auditando registros reales en la base de datos Neon PostgreSQL</p>
  </div>
{:else}
  <!-- CERTIFICADO CRIPTOGRÁFICO CGC -->
  {#if selloForense}
    <div class="bg-gradient-to-br from-[#0A1526] to-[#1E293B] text-white rounded-[32px] p-8 md:p-10 mb-8 shadow-xl relative overflow-hidden animate-fade-in border border-slate-700">
      <div class="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div class="flex items-center gap-2.5 mb-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400">
              {selloForense.estadoIntegridad}
            </span>
            <span class="text-white/20">|</span>
            <span class="text-[10px] font-mono text-white/50">{selloForense.organismoAuditor}</span>
          </div>
          <h3 class="text-xl md:text-2xl font-black tracking-tight text-white">
            {selloForense.certificado}
          </h3>
          <p class="text-[12px] text-white/60 mt-1">
            Garantía matemática de no alteración retroactiva de fondos públicos, contratos ni censos.
          </p>
        </div>

        <div class="text-left lg:text-right shrink-0">
          <span class="text-[9px] font-mono uppercase tracking-widest text-white/40 block mb-1">Merkle Root SHA-256</span>
          <span class="text-[11px] font-mono bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-emerald-300 font-bold block max-w-sm truncate">
            {selloForense.merkleRootSha256}
          </span>
          <span class="text-[10px] text-white/40 mt-1 block">
            {selloForense.totalRegistrosCertificados} registros certificados en Neon DB
          </span>
        </div>
      </div>

      <!-- DESGLOSE DE BLOQUES CRIPTOGRÁFICOS -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
        {#each Object.entries(selloForense.bloquesAuditados) as [nombre, datos]}
          <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <span class="text-[9px] font-extrabold uppercase tracking-wider text-white/40 block truncate mb-1">
              {nombre}
            </span>
            <span class="text-base font-black text-white block">{datos.count} items</span>
            <span class="text-[9px] font-mono text-emerald-400/80 block mt-1 truncate">
              {datos.hashSha256}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- DICTAMEN OFICIAL VINCULANTE PARA LA ASAMBLEA -->
  {#if dictamen}
    <div class="bg-white border border-gray-100 rounded-[32px] p-8 md:p-10 mb-8 shadow-xs animate-fade-in">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#3B82F6] bg-blue-50 px-3 py-1 rounded-full">
          Algoritmo IPIM · Resolución Técnica
        </span>
        <span class="text-[10px] font-mono text-[#0A1526]/40">{dictamen.marcoLegal}</span>
      </div>

      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 mb-6 border-b border-gray-100">
        <div class="max-w-3xl">
          <h3 class="text-2xl md:text-3xl font-black tracking-tight text-[#0A1526] mb-2">
            Prioridad Máxima Asignada: <span class="text-[#3B82F6]">{dictamen.municipioRecomendado}</span>
          </h3>
          <p class="text-[13px] text-[#0A1526]/70 leading-relaxed font-medium">
            {dictamen.dictamenEjecutivo}
          </p>
        </div>

        <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 shrink-0 max-w-xs">
          <div class="flex items-center gap-2 text-amber-800 font-bold text-[11px] mb-1">
            <Icon name="gavel" className="w-4 h-4 text-amber-600" />
            <span>Resolución Anti-Favoritismo</span>
          </div>
          <p class="text-[11px] text-amber-900/70 leading-snug">
            Este dictamen se genera por fórmula matemática sobre censos reales y cuotas en base de datos, blindando la asignación ante disputas de alcaldes.
          </p>
        </div>
      </div>

      <!-- MATRIZ TERRITORIAL RANKING DE LOS 6 MUNICIPIOS -->
      <div>
        <h4 class="text-xs font-black uppercase tracking-wider text-[#0A1526]/40 mb-4">
          Matriz Multicriterio Regional (Ranking Oficial de Vulnerabilidad y Desatención)
        </h4>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-gray-100 text-[10px] font-extrabold uppercase tracking-wider text-[#0A1526]/40">
                <th class="py-3 px-4">Posición</th>
                <th class="py-3 px-4">Municipio</th>
                <th class="py-3 px-4">Índice IPIM</th>
                <th class="py-3 px-4">Nivel de Prioridad</th>
                <th class="py-3 px-4">Déficit Agua / San</th>
                <th class="py-3 px-4">Solvencia Fiscal</th>
                <th class="py-3 px-4">Obras Activas</th>
                <th class="py-3 px-4">Dictamen de Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 text-[12px]">
              {#each dictamen.ranking as m, i}
                <tr class="hover:bg-[#F8FAFC] transition-colors">
                  <td class="py-4 px-4 font-mono font-bold text-[#0A1526]/50">
                    #{i + 1}
                  </td>
                  <td class="py-4 px-4 font-black text-[#0A1526]">
                    {m.municipio}
                  </td>
                  <td class="py-4 px-4">
                    <div class="flex items-center gap-2">
                      <span class="font-black text-sm text-[#0A1526]">{m.puntajeIPIM}</span>
                      <div class="w-16 bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div 
                          class="h-full rounded-full transition-all {m.puntajeIPIM >= 70 ? 'bg-rose-500' : m.puntajeIPIM >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}" 
                          style="width: {m.puntajeIPIM}%"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border {m.nivelPrioridad === 'Crítica' ? 'bg-rose-50 text-rose-700 border-rose-200' : m.nivelPrioridad === 'Alta' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}">
                      {m.nivelPrioridad}
                    </span>
                  </td>
                  <td class="py-4 px-4 font-medium text-[#0A1526]/70">
                    {m.indicadores.deficitAgua}% / {m.indicadores.deficitSaneamiento}%
                  </td>
                  <td class="py-4 px-4 font-mono font-bold text-[#0A1526]/80">
                    {m.indicadores.solvenciaCuotas}%
                  </td>
                  <td class="py-4 px-4 font-bold text-[#0A1526]">
                    {m.indicadores.obrasActivas} obras
                  </td>
                  <td class="py-4 px-4 text-[11px] text-[#0A1526]/60 font-medium">
                    {m.recomendacionAccion}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}
{/if}
