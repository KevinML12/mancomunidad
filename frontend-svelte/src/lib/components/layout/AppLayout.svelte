<script>
  import { auth } from '$lib/stores/auth.svelte.js';
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Icon from '$lib/components/ui/Icon.svelte';

  const NAV_ITEMS = [
    { to: '/', icon: 'dashboard', label: 'Tablero' },
    { to: '/proyectos', icon: 'construction', label: 'Proyectos de Obra', exact: false },
    { to: '/arc', icon: 'view_kanban', label: 'Plan de Mejoras (ARC)' },
    { to: '/financiero', icon: 'account_balance', label: 'Finanzas y Cuotas' },
    { to: '/gobernanza', icon: 'gavel', label: 'Gobernanza y Actas' },
    { to: '/personal', icon: 'badge', label: 'Talento Humano (SIRH)' },
    { to: '/convenios', icon: 'handshake', label: 'Alianzas y Convenios', hasDot: true },
    { to: '/estadisticas', icon: 'bar_chart', label: 'Indicadores ASH' },
    { to: '/inteligencia', icon: 'psychology', label: 'Inteligencia & CGC' },
    { to: '/transparencia', icon: 'public', label: 'Transparencia Abierta' },
  ];

  const handleLogout = () => {
    auth.logout();
    toast.success('Sesión cerrada');
    goto('/login');
  };

  let mobileMenuOpen = $state(false);

  const toggleMobileMenu = () => {
    mobileMenuOpen = !mobileMenuOpen;
  };

  const closeMobileMenu = () => {
    mobileMenuOpen = false;
  };

  let { children } = $props();
</script>

<!-- Mobile Navigation Bar (< lg) -->
<div class="lg:hidden w-full flex items-center justify-between glass-light px-5 py-3.5 rounded-2xl    mb-6 sticky top-4 z-30">
  <div class="flex items-center gap-3">
    <div class="w-9 h-9 rounded-xl bg-[#071D49] flex items-center justify-center text-amber-400 shadow-sm shrink-0">
      <Icon name="account_balance" className="w-4 h-4" />
    </div>
    <div>
      <h1 class="text-xs font-semibold tracking-tight text-[#071D49]">MFN Digital</h1>
      <p class="text-[12px] font-bold text-[#071D49]/50 uppercase tracking-wider">Huehuetenango Nte.</p>
    </div>
  </div>

  <button 
    onclick={toggleMobileMenu} 
    class="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-[#071D49] transition-colors"
    aria-label="Abrir menú"
  >
    <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="w-5 h-5" />
  </button>
</div>

<!-- Mobile Drawer Overlay -->
{#if mobileMenuOpen}
  <div 
    class="fixed inset-0 bg-[#071D49]/60 backdrop-blur-sm z-40 lg:hidden"
    onclick={closeMobileMenu}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}
  ></div>

  <aside class="fixed top-0 left-0 bottom-0 w-[300px] glass-light z-50 p-6 flex flex-col justify-between overflow-y-auto lg:hidden  animate-fade-in">
    <div class="space-y-6">
      <div class="flex items-center justify-between border-b border-gray-100 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-[#071D49] flex items-center justify-center text-amber-400">
            <Icon name="account_balance" className="w-4 h-4" />
          </div>
          <div>
            <h1 class="text-sm font-semibold text-[#071D49]">Frontera del Norte</h1>
            <p class="text-[12px] font-bold uppercase tracking-wider text-[#071D49]/40">Menú Institucional</p>
          </div>
        </div>
        <button onclick={closeMobileMenu} class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-[#071D49]/60">
          <Icon name="close" className="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-1">
        {#each NAV_ITEMS.filter(item => item.to === '/transparencia' || auth.puedeVer(item.to === '/' ? 'dashboard' : item.to === '/personal' ? 'estructura' : item.to.slice(1))) as item}
          {@const isActive = $page.url.pathname === item.to || (!item.exact && item.to !== '/' && $page.url.pathname.startsWith(item.to))}
          <a 
            href={item.to} 
            onclick={closeMobileMenu}
            class="flex items-center justify-between px-4 py-3 rounded-2xl text-[13px] font-semibold transition-all {isActive ? 'bg-[#071D49] text-white shadow-md' : 'text-[#071D49]/70 hover:bg-gray-50'}"
          >
            <div class="flex items-center gap-3">
              <Icon name={item.icon} className="w-[18px] h-[18px] {isActive ? 'text-[#1248AA]' : 'text-[#071D49]/40'}" />
              <span>{item.label}</span>
            </div>
            {#if item.hasDot}
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            {/if}
          </a>
        {/each}
      </div>
    </div>

    <div class="pt-6 border-t border-gray-100 space-y-3">
      <div class="px-3 py-2 rounded-xl bg-gray-50 text-[12px] font-bold text-[#071D49]/60">
        6 Municipios Federados · 2024-2028
      </div>
      <button onclick={handleLogout} class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors">
        <Icon name="logout" className="w-4 h-4" />
        <span>Cerrar Sesión</span>
      </button>
    </div>
  </aside>
{/if}

<aside class="hidden lg:flex w-[300px] shrink-0 glass-light  rounded-[32px] p-6 flex-col justify-between min-h-[calc(100vh-3rem)] sticky top-6 z-20">
  <div class="space-y-8">
    <!-- Header Institucional -->
    <div class="flex items-center gap-3.5 px-2">
      <div class="w-10 h-10 rounded-xl bg-[#071D49] flex items-center justify-center text-amber-400 shadow-md shrink-0">
        <Icon name="account_balance" className="w-5 h-5" />
      </div>
      <div>
        <div class="flex items-center gap-1.5">
          <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]">MFN Digital</span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
        </div>
        <h1 class="text-[14px] font-semibold tracking-tight text-[#071D49] leading-tight">Frontera del Norte</h1>
        <p class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mt-0.5">Gestión Intermunicipal</p>
      </div>
    </div>

    <!-- Menú Navegación -->
    <div class="space-y-1">
      <p class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]/40 px-3 mb-3">Módulos de Gobierno</p>
      
      {#each NAV_ITEMS.filter(item => item.to === '/transparencia' || auth.puedeVer(item.to === '/' ? 'dashboard' : item.to === '/personal' ? 'estructura' : item.to.slice(1))) as item}
        {@const isActive = $page.url.pathname === item.to || (!item.exact && item.to !== '/' && $page.url.pathname.startsWith(item.to))}
        {#if isActive}
          <!-- Ítem Activo -->
          <a class="bg-[#071D49] text-white shadow-lg shadow-[#071D49]/10 rounded-2xl px-4 py-3.5 font-semibold text-[13px] flex items-center justify-between transition-all duration-200 group active:scale-[0.99]" href={item.to}>
            <div class="flex items-center gap-3.5">
              <Icon name={item.icon} className="w-[18px] h-[18px] text-[#1248AA]" stroke={2} />
              <span class="tracking-tight">{item.label}</span>
            </div>
            <span class="text-[12px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/90">Activo</span>
          </a>
        {:else}
          <!-- Enlace Inactivo -->
          <a class="flex items-center justify-between px-4 py-3.5 text-[13px] font-medium text-[#071D49]/60 hover:text-[#071D49] hover:bg-[#FFFFFF] hover:translate-x-1 rounded-2xl transition-all duration-200 active:scale-[0.98]" href={item.to}>
            <div class="flex items-center gap-3.5">
              <Icon name={item.icon} className="w-[18px] h-[18px] text-[#071D49]/30 group-hover:text-[#071D49]/70 transition-colors" stroke={2} />
              <span class="tracking-tight">{item.label}</span>
            </div>
            {#if item.hasDot}
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2 beacon-dot text-rose-500"></span>
            {/if}
          </a>
        {/if}
      {/each}
    </div>
  </div>

  <!-- Pie del Sidebar: Jurisdicción y Perfil -->
  <div class="space-y-4 mt-8">
    <!-- Jurisdicción -->
    <div class="px-5 py-4 rounded-2xl glass-light    flex items-center justify-between">
      <div>
        <p class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1">Jurisdicción Activa</p>
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span class="text-[11px] font-bold text-[#071D49] tracking-tight">Territorio Huehuetenango Nte.</span>
        </div>
      </div>
      <div class="text-right">
        <p class="text-[13px] font-semibold text-[#071D49] leading-none">6</p>
        <p class="text-[12px] font-semibold text-[#071D49]/50">Municipios</p>
      </div>
    </div>

    <!-- Usuario Operativo -->
    <button onclick={handleLogout} class="w-full flex items-center justify-between px-2 py-2 rounded-2xl hover:bg-black/5 transition-all cursor-pointer group">
      <div class="flex items-center gap-3 text-left">
        <img src="https://i.pravatar.cc/100?img=11" alt="Avatar" class="w-10 h-10 rounded-full border border-gray-200" />
        <div>
          <p class="text-[12px] font-semibold text-[#071D49] tracking-tight group-hover:text-[#1248AA] transition-colors">{auth.user?.nombre || 'Dirección Ejecutiva'}</p>
          <p class="text-[12px] font-medium text-[#071D49]/40">sesion.mfn-auth.gt</p>
        </div>
      </div>
      <Icon name="chevron_right" className="w-4 h-4 text-[#071D49]/30" />
    </button>
  </div>
</aside>

<main class="flex-1 min-w-0 pb-12 w-full">
  {@render children()}
</main>
