<script>
  import { auth } from '$lib/stores/auth.svelte.js';
  import { page } from '$app/stores';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { MUNICIPIOS_MFN } from '$lib/municipios.js';
  import { clearUserOfflineData, getEvidenceDrafts, stopOfflineService } from '$lib/offline-field.js';
  let { children } = $props();
  let mobileMenuOpen = $state(false);
  const items = [
    ['/', 'Tablero', 'dashboard'], ['/proyectos', 'Proyectos', 'proyectos'],
    ['/arc', 'Plan de mejoras ARC', 'arc'], ['/financiero', 'Finanzas y cuotas', 'financiero'],
    ['/gobernanza', 'Gobernanza y actas', 'gobernanza'], ['/personal', 'Talento humano', 'estructura'],
    ['/convenios', 'Convenios', 'convenios'], ['/estadisticas', 'Indicadores ASH', 'estadisticas'],
    ['/inteligencia', 'Control de integridad', 'inteligencia']
  ];
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
      {#each items.filter(item => auth.puedeVer(item[2])) as item}
        {@const active = $page.url.pathname === item[0] || (item[0] !== '/' && $page.url.pathname.startsWith(item[0] + '/'))}
        <a href={item[0]} class="mfn-nav" class:active aria-current={active ? 'page' : undefined} onclick={() => mobileMenuOpen = false}>{item[1]}</a>
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
<main class="mfn-content flex-1 min-w-0 pb-12 w-full">{@render children()}</main>
