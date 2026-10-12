<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { Toaster } from 'svelte-sonner';

  onMount(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const move = (event) => {
      if (motion.matches || !(event.target instanceof Element)) return;
      const panel = event.target.closest('.glass-light, .glass-light-nested');
      if (!(panel instanceof HTMLElement)) return;
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty('--spec-x', `${event.clientX - rect.left}px`);
      panel.style.setProperty('--spec-y', `${event.clientY - rect.top}px`);
      panel.style.setProperty('--spec-o', '1');
    };
    const leave = (event) => {
      if (!(event.target instanceof Element)) return;
      const panel = event.target.closest('.glass-light, .glass-light-nested');
      if (panel instanceof HTMLElement && (!(event.relatedTarget instanceof Node) || !panel.contains(event.relatedTarget))) panel.style.setProperty('--spec-o', '0');
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', leave, { passive: true });
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', leave);
    };
  });

  let { children } = $props();
</script>

<div class="mfn-canvas">
{@render children()}

<Toaster position="top-right" richColors />
</div>
