<script>
  import { navigationFor } from '$lib/navigation.js';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { page } from '$app/stores';
  import { MUNICIPIOS_MFN } from '$lib/municipios.js';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { clearUserOfflineData, getEvidenceDrafts, stopOfflineService } from '$lib/offline-field.js';

  let { children } = $props();
  let otherAreasOpen = $state(false);
  let areas = $derived(navigationFor(auth.role, auth.permisos));
  let dockLead = $derived(areas.primary.slice(0, Math.ceil(areas.primary.length / 2)));
  let dockTrail = $derived(areas.primary.slice(Math.ceil(areas.primary.length / 2)));
  let mobileLead = $derived(areas.primary.slice(0, 1));
  let mobileTrail = $derived(areas.primary.slice(1, 2));
  let mobileExtra = $derived(areas.primary.slice(2));
  let currentArea = $derived([...areas.primary, ...areas.secondary].find(area => $page.url.pathname.startsWith(area.path)));
  const icons = {
    proyectos: 'construction', arc: 'view_kanban', financiero: 'account_balance',
    gobernanza: 'gavel', convenios: 'handshake', estadisticas: 'bar_chart',
    inteligencia: 'shield', estructura: 'badge', reclutamiento: 'badge',
    evaluaciones: 'view_kanban', ausencias: 'calendar_today',
    disciplina: 'shield', capacitacion: 'school', transparencia: 'public'
  };
  const dockLabels = {
    proyectos: 'Proyectos', arc: 'ARC', financiero: 'Finanzas', gobernanza: 'Actas',
    convenios: 'Convenios', estadisticas: 'Indicadores', inteligencia: 'Integridad',
    estructura: 'Personal', reclutamiento: 'Convocatorias', evaluaciones: 'Evaluaciones',
    ausencias: 'Ausencias', disciplina: 'Disciplina', capacitacion: 'Formación',
    transparencia: 'Público'
  };
  const mobileLabels = { evaluaciones: 'Eval.', inteligencia: 'Integridad', estructura: 'Personal' };

  $effect(() => {
    $page.url.pathname;
    otherAreasOpen = false;
  });

  const logout = async () => {
    try {
      const drafts = await getEvidenceDrafts(auth.user?.id);
      if (drafts.length && !window.confirm(`Hay ${drafts.length} evidencia(s) sin sincronizar. Cerrar sesión eliminará sus copias locales. ¿Continuar?`)) return;
      await clearUserOfflineData(auth.user?.id);
      await stopOfflineService();
    } catch (error) {
      if (!window.confirm('No se pudo borrar la copia local de este dispositivo. ¿Cerrar sesión de todos modos?')) return;
    }
    try {
      await auth.logout();
      window.location.assign('/login');
    } catch {
      window.alert('No se pudo cerrar la sesión. Intente de nuevo.');
    }
  };
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') otherAreasOpen = false; }} />

<div class="w-full min-w-0">
  <header class="mfn-shell-header relative z-30 mb-8 px-1 py-3 md:px-2">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a href="/inicio" class="mfn-brand" aria-label="MFN Digital · Inicio">MFN Digital</a>
        <span class="text-xs font-medium text-[#071D49]/65">{auth.roleLabel || 'Espacio institucional'}</span>
      </div>
      <div class="flex flex-wrap items-center gap-3 text-xs text-[#071D49]/70">
        <span class="hidden sm:inline">{MUNICIPIOS_MFN.length} municipios · Huehuetenango Norte</span>
        <a href="/transparencia" class="font-medium hover:underline">Portal ciudadano ↗</a>
        <span class="hidden md:inline" aria-hidden="true">·</span>
        <span class="hidden md:inline font-medium text-[#071D49]">{auth.user?.nombre || 'Usuario institucional'}</span>
        <button onclick={logout} class="rounded-[4px] px-2 py-1 font-medium text-[#071D49] hover:bg-white/70">Cerrar sesión</button>
      </div>
    </div>

  </header>

  {#if otherAreasOpen}
    <button class="fixed inset-0 z-40 cursor-default bg-[#071D49]/15" aria-label="Cerrar otras áreas" onclick={() => otherAreasOpen = false}></button>
    <section id="otras-areas" aria-label="Otras áreas autorizadas" class="glass-light mfn-more-sheet fixed bottom-28 left-4 right-4 z-50 mx-auto max-h-[min(65vh,620px)] max-w-[760px] overflow-y-auto rounded-[4px] p-5 md:p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="font-medium text-[#071D49]">Otras áreas</h2>
          <p class="mt-1 text-sm text-[#071D49]/70">Accesos complementarios para {auth.roleLabel || 'su rol'}.</p>
        </div>
        <button onclick={() => otherAreasOpen = false} class="rounded-full bg-white/70 p-2 text-[#071D49] hover:bg-white" aria-label="Cerrar otras áreas"><Icon name="close" className="h-4 w-4" /></button>
      </div>
      {#if mobileExtra.length}
        <div class="mt-5 sm:hidden">
          <h3 class="mb-3 text-xs font-medium uppercase tracking-wider text-[#071D49]/65">También prioritarias</h3>
          <div class="grid gap-3">
            {#each mobileExtra as area}
              <a href={area.path} onclick={() => otherAreasOpen = false} class="flex gap-3 rounded-[4px] border border-[#071D49]/15 bg-white/75 p-4">
                <Icon name={icons[area.key] || 'dashboard'} className="h-5 w-5 shrink-0 text-[#071D49]" />
                <span><strong class="text-[#071D49]">{area.title}</strong><span class="mt-1 block text-sm text-[#071D49]/70">{area.description}</span></span>
              </a>
            {/each}
          </div>
        </div>
      {/if}
      {#if areas.secondary.length}<h3 class="mb-3 mt-5 text-xs font-medium uppercase tracking-wider text-[#071D49]/65">Otras áreas autorizadas</h3>{/if}
      <div class="grid gap-3 sm:grid-cols-2">
        {#each areas.secondary as area}
          <a href={area.path} onclick={() => otherAreasOpen = false} class="flex gap-3 rounded-[4px] border border-[#CBD8ED]/70 bg-white/75 p-4 transition-colors hover:bg-white">
            <Icon name={icons[area.key] || 'dashboard'} className="mt-0.5 h-5 w-5 shrink-0 text-[#071D49]" />
            <span><strong class="text-[#071D49]">{area.title}</strong><span class="mt-1 block text-sm text-[#071D49]/70">{area.description}</span></span>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <main class="mfn-content w-full min-w-0 pb-36">
    <p class="mb-6 text-xs font-medium tracking-wide text-[#071D49]/60"><strong>{auth.roleLabel || 'Espacio institucional'}</strong>{currentArea ? ` / ${currentArea.title}` : ' / Inicio'}</p>
    {@render children()}
  </main>

  <nav aria-label="Módulos principales para su rol" class="mfn-dock fixed bottom-3 left-3 right-3 z-50 mx-auto hidden max-w-[720px] items-center justify-center gap-1 rounded-[4px] px-2 py-2 sm:bottom-5 sm:flex sm:gap-2 sm:px-3">
    {#each dockLead as area}
      {@const active = $page.url.pathname.startsWith(area.path)}
      <a href={area.path} title={area.title} aria-label={area.title} aria-current={active ? 'page' : undefined} class={`mfn-dock-item ${active ? 'is-active' : ''}`}>
        <Icon name={icons[area.key] || 'dashboard'} stroke={1.3} className="h-5 w-5" /><span>{dockLabels[area.key] || area.title}</span>
      </a>
    {/each}
    <a href="/inicio" aria-current={$page.url.pathname === '/inicio' ? 'page' : undefined} class={`mfn-dock-item mfn-dock-home ${$page.url.pathname === '/inicio' ? 'is-active' : ''}`}>
      <Icon name="arrow_upward" stroke={1.35} className="h-5 w-5" /><span>Inicio</span>
    </a>
    {#each dockTrail as area}
      {@const active = $page.url.pathname.startsWith(area.path)}
      <a href={area.path} title={area.title} aria-label={area.title} aria-current={active ? 'page' : undefined} class={`mfn-dock-item ${active ? 'is-active' : ''}`}>
        <Icon name={icons[area.key] || 'dashboard'} stroke={1.3} className="h-5 w-5" /><span>{dockLabels[area.key] || area.title}</span>
      </a>
    {/each}
    {#if areas.secondary.length}
      <button onclick={() => otherAreasOpen = !otherAreasOpen} aria-expanded={otherAreasOpen} aria-controls="otras-areas" class={`mfn-dock-item ${otherAreasOpen || areas.secondary.some(area => $page.url.pathname.startsWith(area.path)) ? 'is-active' : ''}`}>
        <Icon name="menu" stroke={1.3} className="h-5 w-5" /><span>Más</span>
      </button>
    {/if}
  </nav>
  <nav aria-label="Módulos principales para su rol en móvil" class="mfn-dock fixed bottom-3 left-3 right-3 z-50 mx-auto flex max-w-[420px] items-center justify-center gap-1 rounded-[4px] px-2 py-2 sm:hidden">
    {#each mobileLead as area}
      {@const active = $page.url.pathname.startsWith(area.path)}
      <a href={area.path} aria-label={area.title} aria-current={active ? 'page' : undefined} class={`mfn-dock-item ${active ? 'is-active' : ''}`}>
        <Icon name={icons[area.key] || 'dashboard'} stroke={1.3} className="h-5 w-5" /><span>{mobileLabels[area.key] || dockLabels[area.key] || area.title}</span>
      </a>
    {/each}
    <a href="/inicio" aria-current={$page.url.pathname === '/inicio' ? 'page' : undefined} class={`mfn-dock-item mfn-dock-home ${$page.url.pathname === '/inicio' ? 'is-active' : ''}`}>
      <Icon name="arrow_upward" stroke={1.35} className="h-5 w-5" /><span>Inicio</span>
    </a>
    {#each mobileTrail as area}
      {@const active = $page.url.pathname.startsWith(area.path)}
      <a href={area.path} aria-label={area.title} aria-current={active ? 'page' : undefined} class={`mfn-dock-item ${active ? 'is-active' : ''}`}>
        <Icon name={icons[area.key] || 'dashboard'} stroke={1.3} className="h-5 w-5" /><span>{mobileLabels[area.key] || dockLabels[area.key] || area.title}</span>
      </a>
    {/each}
    {#if mobileExtra.length || areas.secondary.length}
      <button onclick={() => otherAreasOpen = !otherAreasOpen} aria-label="Más áreas" aria-expanded={otherAreasOpen} aria-controls="otras-areas" class={`mfn-dock-item ${otherAreasOpen || [...mobileExtra, ...areas.secondary].some(area => $page.url.pathname.startsWith(area.path)) ? 'is-active' : ''}`}>
        <Icon name="menu" stroke={1.3} className="h-5 w-5" /><span>Más áreas</span>
      </button>
    {/if}
  </nav>
</div>
