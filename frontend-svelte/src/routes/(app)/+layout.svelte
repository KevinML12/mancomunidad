<script>
  import { auth } from '$lib/stores/auth.svelte.js';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import { onMount } from 'svelte';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

  let { children } = $props();
  const queryClient = new QueryClient();

  onMount(() => {
    if (auth.isAuthenticated && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch((error) => {
        console.warn('No se pudo activar el modo de campo:', error);
      });
    }
  });

  $effect(() => {
    if (auth.isAuthenticated) {
      const modulo = $page.url.pathname.split('/')[1] || 'dashboard';
      if (!auth.puedeVer(modulo === 'personal' ? 'estructura' : modulo)) goto('/');
    }
    if (!auth.isAuthenticated) {
      goto('/login');
    }
  });
</script>

{#if auth.isAuthenticated}
  <QueryClientProvider client={queryClient}>
  <div class="min-h-screen text-[#071D49] font-sans antialiased selection:bg-[#1248AA]/15 selection:text-[#071D49]">
    <div class="max-w-[1500px] mx-auto flex flex-col lg:flex-row gap-6 items-start relative z-10 p-6 lg:p-8">
      <AppLayout>
        {#key $page.url.pathname}
          <div class="animate-fade-in w-full">
            {@render children()}
          </div>
        {/key}
      </AppLayout>
    </div>
  </div>
  </QueryClientProvider>
{/if}
