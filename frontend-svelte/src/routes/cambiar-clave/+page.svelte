<script>
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth.svelte.js';
  import apiClient from '$lib/apiClient';

  let actual = $state('');
  let nueva = $state('');
  let confirmar = $state('');
  let error = $state('');
  let guardando = $state(false);

  $effect(() => {
    if (!auth.ready) return;
    if (!auth.user) goto('/login');
    else if (!auth.user.mustChangePassword) goto('/inicio');
  });

  async function cambiarClave(event) {
    event.preventDefault();
    error = '';
    if (nueva !== confirmar) {
      error = 'Las contraseñas nuevas no coinciden.';
      return;
    }
    if (nueva.length < 12 || new TextEncoder().encode(nueva).length > 72 || nueva === actual) {
      error = 'Use una contraseña diferente, de al menos 12 caracteres y hasta 72 bytes.';
      return;
    }
    guardando = true;
    try {
      await apiClient.post('/auth/password', { contrasenaActual: actual, nuevaContrasena: nueva });
      actual = ''; nueva = ''; confirmar = '';
      await auth.refresh();
      goto('/login');
    } catch (err) {
      error = err.response?.data?.error || 'No se pudo cambiar la contraseña. Intente nuevamente.';
    } finally {
      guardando = false;
    }
  }

  async function cerrarSesion() {
    try { await auth.logout(); } catch { await auth.refresh(); }
    goto('/login');
  }
</script>

<svelte:head>
  <title>Cambiar contraseña | MFN Digital</title>
</svelte:head>

{#if auth.ready && auth.user?.mustChangePassword}
  <main class="min-h-screen flex items-center justify-center p-6 text-[#071D49]">
    <section class="w-full max-w-md glass-light rounded-[4px] p-8 md:p-10" aria-labelledby="titulo-cambio-clave">
      <p class="text-[12px] text-[#071D49]/60 mb-3">MFN Digital · Acceso</p>
      <h1 id="titulo-cambio-clave" class="text-[24px] font-medium mb-3">Cambie su contraseña inicial</h1>
      <p class="text-[13px] text-[#071D49]/70 mb-6">Para abrir los módulos, establezca una contraseña personal. Se cerrarán las sesiones anteriores.</p>

      {#if error}
        <p role="alert" class="border border-[#071D49]/20 bg-white p-3 mb-5 text-[13px]">{error}</p>
      {/if}

      <form onsubmit={cambiarClave} class="space-y-4">
        <label class="block text-[13px]">
          <span class="block mb-1.5">Contraseña inicial</span>
          <input type="password" autocomplete="current-password" bind:value={actual} required disabled={guardando} class="w-full bg-white border border-[#071D49]/25 rounded-[4px] px-4 py-3" />
        </label>
        <label class="block text-[13px]">
          <span class="block mb-1.5">Nueva contraseña</span>
          <input type="password" autocomplete="new-password" bind:value={nueva} required minlength="12" disabled={guardando} class="w-full bg-white border border-[#071D49]/25 rounded-[4px] px-4 py-3" />
        </label>
        <label class="block text-[13px]">
          <span class="block mb-1.5">Repita la nueva contraseña</span>
          <input type="password" autocomplete="new-password" bind:value={confirmar} required minlength="12" disabled={guardando} class="w-full bg-white border border-[#071D49]/25 rounded-[4px] px-4 py-3" />
        </label>
        <button type="submit" disabled={guardando} class="w-full bg-[#071D49] text-white rounded-[4px] px-4 py-3 text-[13px] disabled:opacity-50">{guardando ? 'Guardando…' : 'Cambiar contraseña'}</button>
      </form>
      <button type="button" onclick={cerrarSesion} class="mt-5 text-[13px] text-[#071D49]/70 underline">Cerrar sesión</button>
    </section>
  </main>
{/if}
