<script>
  import { auth } from '$lib/stores/auth.svelte.js';
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/ui/Icon.svelte';

  let correo = $state('gerencia@mfn.gob.gt');
  let contrasena = $state('mfn2026');
  let loading = $state(false);

  function onSubmit(e) {
    e?.preventDefault();
    loading = true;
    setTimeout(() => {
      goto('/proyectos');
      loading = false;
    }, 200);
  }
</script>

<svelte:head>
  <title>Acceso al Sistema | MFN Digital</title>
</svelte:head>

<div class="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-6 text-[#0A1526]">
  <div class="w-full max-w-md bg-white shadow-[0_20px_60px_-15px_rgba(10,21,38,0.06)] rounded-[32px] p-8 md:p-10 border border-gray-100/60">
    <div class="flex flex-col items-center mb-8">
      <div class="w-14 h-14 rounded-2xl bg-[#0A1526] flex items-center justify-center text-amber-400 shadow-md mb-4">
        <Icon name="account_balance" className="w-7 h-7" />
      </div>
      <div class="flex items-center gap-1.5 mb-1">
        <span class="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#0A1526]">MFN Digital</span>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
      </div>
      <h1 class="text-[20px] font-black tracking-tight text-[#0A1526] text-center">
        Mancomunidad Frontera del Norte
      </h1>
      <p class="text-[12px] text-[#0A1526]/50 mt-1 text-center font-medium">
        Plataforma de Gestión Operativa e Intermunicipal (Capítulo IV)
      </p>
    </div>

    <form onsubmit={onSubmit} class="space-y-4">
      <div>
        <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">
          Correo Institucional
        </label>
        <input 
          type="email" 
          bind:value={correo} 
          required 
          class="w-full bg-[#F4F7FA] border border-gray-100 rounded-xl px-4 py-3 text-[13px] text-[#0A1526] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-all" 
        />
      </div>

      <div>
        <label class="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1526]/40 mb-1.5">
          Contraseña
        </label>
        <input 
          type="password" 
          bind:value={contrasena} 
          required 
          class="w-full bg-[#F4F7FA] border border-gray-100 rounded-xl px-4 py-3 text-[13px] text-[#0A1526] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-all" 
        />
      </div>

      <button 
        type="submit" 
        class="w-full bg-[#0A1526] hover:bg-black text-white font-bold py-3.5 rounded-full text-[13px] shadow-md transition-colors mt-6 flex items-center justify-center gap-2"
      >
        <span>Ingresar a Módulo 01: Proyectos</span>
        <Icon name="arrow_forward" className="w-4 h-4 text-[#3B82F6]" />
      </button>
    </form>

    <div class="mt-8 pt-6 border-t border-gray-100 text-center">
      <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0A1526]/30">
        Jurisdicción Activa · 6 Municipios Miembros
      </p>
      <p class="text-[11px] font-medium text-[#0A1526]/50 mt-1">
        San Pedro Soloma · Santa Eulalia · San Rafael la Independencia
      </p>
    </div>
  </div>
</div>
