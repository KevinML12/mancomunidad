<script>
  import { navigationFor } from '$lib/navigation.js';
  import { auth } from '$lib/stores/auth.svelte.js';
  import { page } from '$app/stores';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { MUNICIPIOS_MFN } from '$lib/municipios.js';
  import { clearUserOfflineData, getEvidenceDrafts, stopOfflineService } from '$lib/offline-field.js';
  let { children } = $props();
  let mobileMenuOpen = $state(false);
  let otherAreasOpen = $state(false);
  let areas = $derived(navigationFor(auth.role,auth.permisos));
  let currentArea = $derived([...areas.primary,...areas.secondary].find(area => $page.url.pathname.startsWith(area.path)));
  $effect(() => { $page.url.pathname; otherAreasOpen=false; });
  const logout = async () => {
    try {
      const drafts = await getEvidenceDrafts(auth.user?.id);
      if (drafts.length && !window.confirm(`Hay ${drafts.length} evidencia(s) sin sincronizar. Cerrar sesión eliminará sus copias locales. ¿Continuar?`)) return;
      await clearUserOfflineData(auth.user?.id);
      await stopOfflineService();
    } catch (error) {
      if (!window.confirm('No se pudo borrar la copia local de este dispositivo. ¿Cerrar sesión de todos modos?')) return;
    }
    auth.logout();
    window.location.assign('/login');
  };
</script>

{#snippet navigation()}
  <div>
    <p class="mfn-brand">MFN Digital</p>
    <p class="mfn-caption mt-1">Coordinación Intermunicipal</p>
    <nav aria-label="Navegación institucional" class="mt-8 space-y-1">
      <a href="/" class="mfn-nav" class:active={$page.url.pathname === '/'} onclick={() => mobileMenuOpen=false}>Inicio</a>
      <p class="px-3 pt-3 pb-1 text-xs font-semibold text-[#071D49]/60">Áreas principales</p>
      {#each areas.primary as item}
        {@const active = $page.url.pathname.startsWith(item.path)}
        <a href={item.path} class="mfn-nav" class:active aria-current={active ? 'page' : undefined} onclick={() => mobileMenuOpen=false}>{item.title}</a>
      {/each}
    </nav>
    <a href="/transparencia" class="mfn-nav mt-4" onclick={() => mobileMenuOpen = false}>Portal ciudadano</a>
  </div>
  <div class="mt-8 space-y-4">
    <p class="mfn-caption">{MUNICIPIOS_MFN.length} municipios activos<br />Huehuetenango Norte</p>
    <div>
      <p class="text-sm font-semibold text-black">{auth.user?.nombre || 'Usuario institucional'}</p>
      <p class="mfn-caption">{auth.roleLabel || 'Sesión institucional'}</p>
    </div>
    <button onclick={logout} class="mfn-nav w-full text-left">Cerrar sesión</button>
  </div>
{/snippet}

<div class="lg:hidden glass-light rounded-[24px] px-5 py-4 mb-6 mfn-mobile-bar sticky top-4 z-30">
  <p class="mfn-brand">MFN Digital</p>
  <button onclick={() => mobileMenuOpen = !mobileMenuOpen} class="p-3" aria-label="Abrir menú" aria-expanded={mobileMenuOpen}>
    <Icon name="menu" className="w-5 h-5 text-[#071D49]" />
  </button>
</div>
{#if mobileMenuOpen}
  <button class="fixed inset-0 bg-[#071D49]/30 z-40 lg:hidden" aria-label="Cerrar menú" onclick={() => mobileMenuOpen = false}></button>
  <aside class="fixed top-4 left-4 bottom-4 w-[min(300px,calc(100vw-32px))] glass-light rounded-[28px] p-6 z-50 overflow-y-auto flex flex-col justify-between lg:hidden">
    <button class="self-end p-2" aria-label="Cerrar menú" onclick={() => mobileMenuOpen = false}><Icon name="close" className="w-5 h-5" /></button>
    {@render navigation()}
  </aside>
{/if}
<aside class="hidden lg:flex w-[270px] shrink-0 glass-light rounded-[28px] p-6 flex-col justify-between min-h-[calc(100vh-4rem)] sticky top-8 z-20">
  {@render navigation()}
</aside>
<main class="mfn-content flex-1 min-w-0 pb-12 w-full">
  <div class="mb-6 flex flex-wrap justify-between items-center gap-3">
    <p class="text-sm text-[#071D49]"><strong>{auth.roleLabel || 'Espacio institucional'}</strong>{currentArea ? ` / ${currentArea.title}` : ' / Inicio'}</p>
    {#if areas.secondary.length}
      <button onclick={() => otherAreasOpen=!otherAreasOpen} aria-expanded={otherAreasOpen} aria-controls="otras-areas" class="rounded-full bg-white border border-blue-100 px-5 py-2 text-sm font-semibold text-[#071D49]">{otherAreasOpen ? 'Cerrar otras áreas' : `Otras áreas (${areas.secondary.length})`}</button>
    {/if}
  </div>
  {#if otherAreasOpen}
    <section id="otras-areas" aria-label="Otras áreas autorizadas" class="mb-7 bg-white rounded-[24px] p-5 border border-blue-100">
      <h2 class="font-semibold text-[#071D49]">Otras áreas autorizadas</h2><p class="text-sm mt-1 mb-4">Accesos complementarios para su rol. Las operaciones dependen de sus permisos.</p>
      <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{#each areas.secondary as area}<a href={area.path} onclick={() => otherAreasOpen=false} class="border border-blue-100 rounded-xl p-4 hover:bg-blue-50"><strong>{area.title}</strong><p class="text-sm mt-1">{area.description}</p></a>{/each}</div>
    </section>
  {/if}
  {@render children()}
</main>
