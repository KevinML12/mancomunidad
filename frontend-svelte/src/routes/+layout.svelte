<script>
  import '../app.css';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { Toaster } from 'svelte-sonner';

  const queryClient = new QueryClient();
  let { children } = $props();
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
</QueryClientProvider>

<Toaster position="top-right" richColors />
