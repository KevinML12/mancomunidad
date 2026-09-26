<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/proyectos');
  });
</script>

<div class="flex items-center justify-center min-h-[60vh] text-[#0A1526]/40 text-xs font-semibold">
  Cargando Módulo 01: Proyectos Intermunicipales...
</div>
