<script>
  import "../../app.css";
  import Icon from '$lib/components/ui/Icon.svelte';

  let { children } = $props();
</script>

<div class="min-h-screen bg-[#FFFFFF] text-[#071D49] font-sans antialiased flex flex-col selection:bg-[#1248AA]/15">
  <!-- Header Público Ciudadano -->
  <header class="bg-white border-b border-gray-100 shadow-xs sticky top-0 z-30">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#071D49] flex items-center justify-center text-amber-400 shadow-md shrink-0">
          <Icon name="account_balance" className="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]">Portal Ciudadano</span>
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
          </div>
          <h1 class="text-[14px] font-semibold tracking-tight text-[#071D49] leading-tight">Mancomunidad Frontera del Norte</h1>
          <p class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40">Transparencia y Datos Abiertos (Decreto 57-2008)</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <a href="/proyectos" class="px-5 py-2.5 bg-[#071D49] hover:bg-black text-white rounded-full text-[12px] font-bold shadow-sm transition-all duration-300 flex items-center gap-1.5">
          <Icon name="lock" className="w-3.5 h-3.5 text-[#1248AA]" />
          <span>Acceso Funcionarios</span>
        </a>
      </div>
    </div>
  </header>
  
  <main class="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
    {@render children()}
  </main>

  <footer class="bg-white border-t border-gray-100 mt-auto">
    <div class="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#071D49]/50">
      <p>&copy; 2024 Mancomunidad de Municipios Frontera del Norte de Huehuetenango (MFNdH). Todos los derechos reservados.</p>
      <p class="font-medium">Ley de Acceso a la Información Pública · Artículo 10 numerales 7, 8 y 11</p>
    </div>
  </footer>
</div>
