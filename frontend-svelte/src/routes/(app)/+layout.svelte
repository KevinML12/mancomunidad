<script>
  import { auth } from '$lib/stores/auth.svelte.js';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';

  let { children } = $props();

  $effect(() => {
    if (!auth.isAuthenticated) {
      goto('/login');
    }
  });
</script>

{#if auth.isAuthenticated}
  <div class="bg-[#F4F7FA] min-h-screen text-[#0A1526] font-sans antialiased selection:bg-[#3B82F6]/15 selection:text-[#0A1526]">
    <div class="max-w-[1500px] mx-auto flex gap-10 items-start relative z-10 p-6 lg:p-8">
      <AppLayout>
        {#key $page.url.pathname}
          <div class="animate-fade-in w-full">
            {@render children()}
          </div>
        {/key}
      </AppLayout>
    </div>
  </div>
{/if}
