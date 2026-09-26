<script>
  let { variant = 'dashboard' } = $props();
</script>

{#if variant === 'dashboard'}
  <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#D4AF37]/10 blur-[100px]"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#AA8222]/10 blur-[120px]"></div>
  </div>
{:else if variant === 'section'}
  <div class="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#D4AF37]/10 blur-[150px]"></div>
  </div>
{/if}
