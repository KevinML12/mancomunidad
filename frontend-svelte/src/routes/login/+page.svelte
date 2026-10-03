<script>
  import { auth } from '$lib/stores/auth.svelte.js';
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { toast } from 'svelte-sonner';

  import apiClient from '$lib/apiClient';

  let correo = $state('');
  let contrasena = $state('');
  let mostrarContrasena = $state(false);
  let loading = $state(false);

  // RF1: Recuperación de Credenciales Institucionales
  let showRecuperarModal = $state(false);
  let pasoRecuperacion = $state(1); // 1: solicitar código, 2: ingresar token y nueva contraseña
  let correoRecuperar = $state('');
  let tokenRecuperacion = $state('');
  let nuevaContrasena = $state('');
  let confirmarContrasena = $state('');
  let recuperando = $state(false);

  async function onSubmit(e) {
    e?.preventDefault();
    if (!correo.trim() || !contrasena) {
      toast.error('Ingrese correo institucional y contraseña');
      return;
    }

    loading = true;
    try {
      await auth.login(correo.trim(), contrasena);
      toast.success('Sesión iniciada correctamente');
      goto('/');
    } catch (err) {
      console.error('Error de autenticación:', err);
      const msg = err.response?.data?.error || err.message || 'Error de conexión con el servidor';
      toast.error(`Error al iniciar sesión: ${msg}`);
    } finally {
      loading = false;
    }
  }

  async function solicitarRecuperacion(e) {
    e?.preventDefault();
    if (!correoRecuperar.trim()) {
      toast.error('Ingrese su correo institucional');
      return;
    }
    recuperando = true;
    try {
      const { data } = await apiClient.post('/auth/recuperar', { correo: correoRecuperar.trim() });
      toast.success(data.mensaje || 'Instrucción de recuperación generada');

      pasoRecuperacion = 2;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al solicitar recuperación');
    } finally {
      recuperando = false;
    }
  }

  async function ejecutarRestablecimiento(e) {
    e?.preventDefault();
    if (!tokenRecuperacion.trim() || !nuevaContrasena) {
      toast.error('Todos los campos son requeridos');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (nuevaContrasena.length < 12) {
      toast.error('La contraseña debe tener al menos 12 caracteres');
      return;
    }
    recuperando = true;
    try {
      const { data } = await apiClient.post('/auth/restablecer', {
        token: tokenRecuperacion.trim(),
        nuevaContrasena
      });
      toast.success(data.mensaje || 'Contraseña actualizada exitosamente');
      showRecuperarModal = false;
      pasoRecuperacion = 1;
      correo = correoRecuperar;
      contrasena = '';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al restablecer contraseña');
    } finally {
      recuperando = false;
    }
  }
</script>

<svelte:head>
  <title>Acceso al Sistema | MFN Digital</title>
</svelte:head>

<div class="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-6 text-[#071D49]">
  <div class="w-full max-w-md glass-light  rounded-[32px] p-8 md:p-10   animate-fade-in">
    <div class="flex flex-col items-center mb-8">
      <div class="w-14 h-14 rounded-2xl bg-[#071D49] flex items-center justify-center text-amber-400 shadow-md mb-4">
        <Icon name="account_balance" className="w-7 h-7" />
      </div>
      <div class="flex items-center gap-1.5 mb-1">
        <span class="text-[12px] font-semibold uppercase tracking-normal text-[#071D49]">MFN Digital</span>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
      </div>
      <h1 class="text-[20px] font-semibold tracking-tight text-[#071D49] text-center">
        Mancomunidad Frontera del Norte
      </h1>
      <p class="text-[12px] text-[#071D49]/50 mt-1 text-center font-medium">
        Plataforma de Gestión Operativa e Intermunicipal (Capítulo IV)
      </p>
    </div>

    <form onsubmit={onSubmit} autocomplete="off" class="space-y-4">
      <div>
        <label for="input-correo" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
          Correo Institucional
        </label>
        <div class="relative">
          <input 
            id="input-correo"
            type="email" 
            bind:value={correo} 
            required 
            disabled={loading}
            autocomplete="off"
            placeholder="usuario@mfn.gob.gt"
            class="w-full bg-[#FFFFFF] border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[13px] text-[#071D49] placeholder-[#071D49]/30 focus:outline-none focus:border-[#1248AA] focus:bg-white focus:ring-1 focus:ring-[#1248AA] transition-all disabled:opacity-50" 
          />
          <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#071D49]/30 pointer-events-none">
            <Icon name="mail" className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div>
        <label for="input-contrasena" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
          Contraseña
        </label>
        <div class="relative">
          <input 
            id="input-contrasena"
            type={mostrarContrasena ? 'text' : 'password'} 
            bind:value={contrasena} 
            required 
            disabled={loading}
            autocomplete="new-password"
            placeholder="••••••••"
            class="w-full bg-[#FFFFFF] border border-gray-100 rounded-xl pl-4 pr-10 py-3 text-[13px] text-[#071D49] placeholder-[#071D49]/30 focus:outline-none focus:border-[#1248AA] focus:bg-white focus:ring-1 focus:ring-[#1248AA] transition-all disabled:opacity-50" 
          />
          <button 
            type="button" 
            onclick={() => mostrarContrasena = !mostrarContrasena}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[#071D49]/40 hover:text-[#071D49] p-1 transition-colors"
            title={mostrarContrasena ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            <Icon name={mostrarContrasena ? 'visibility_off' : 'visibility'} className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex items-center justify-end pt-1">
        <button 
          type="button" 
          onclick={() => { showRecuperarModal = true; pasoRecuperacion = 1; }}
          class="text-[11px] font-bold text-[#1248AA] hover:underline cursor-pointer transition-colors"
        >
          ¿Olvidaste tu contraseña institucional?
        </button>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        class="w-full bg-[#071D49] hover:bg-black text-white font-bold py-3.5 rounded-full text-[13px] shadow-md transition-colors mt-4 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
      >
        {#if loading}
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Validando credenciales...</span>
        {:else}
          <span>Ingresar al Sistema MFN</span>
          <Icon name="arrow_forward" className="w-4 h-4 text-[#1248AA]" />
        {/if}
      </button>
    </form>

    <div class="mt-6 text-center">
      <a 
        href="/transparencia" 
        class="text-[12px] font-bold text-[#1248AA] hover:underline inline-flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-blue-50 transition-colors"
      >
        <Icon name="public" className="w-4 h-4" />
        <span>Portal Ciudadano de Transparencia (Sin Clave)</span>
      </a>
    </div>

    <div class="mt-8 pt-6 border-t border-gray-100 text-center">
      <p class="text-[12px] font-bold uppercase tracking-normal text-[#071D49]/30">
        Jurisdicción Activa · 3 municipios activos
      </p>
      <p class="text-[11px] font-medium text-[#071D49]/50 mt-1">
        San Pedro Soloma · Santa Eulalia · San Rafael la Independencia
      </p>
    </div>
  </div>
</div>

<!-- MODAL RECUPERACIÓN DE CONTRASEÑA (RF1) -->
{#if showRecuperarModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D49]/70 backdrop-blur-sm">
    <div class="glass-light rounded-[28px] max-w-md w-full p-8    relative animate-fade-in">
      <div class="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#1248AA]">
            <Icon name="lock_reset" className="w-4 h-4" />
          </span>
          <div>
            <h3 class="text-[14px] font-semibold text-[#071D49]">Recuperar Contraseña</h3>
            <p class="text-[12px] text-[#071D49]/50">Gestión de Seguridad RF1 (Decreto 57-2008)</p>
          </div>
        </div>
        <button 
          type="button" 
          onclick={() => showRecuperarModal = false} 
          class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#071D49]/60 transition-colors"
        >
          <Icon name="close" className="w-4 h-4" />
        </button>
      </div>

      {#if pasoRecuperacion === 1}
        <form onsubmit={solicitarRecuperacion} class="space-y-4">
          <p class="text-[12px] text-[#071D49]/60 leading-relaxed">
            Ingrese su correo electrónico oficial registrado ante la Mancomunidad Frontera del Norte. Le generaremos un token de restablecimiento temporal (vigencia: 15 minutos).
          </p>

          <div>
            <label for="input-correo-recuperar" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
              Correo Institucional
            </label>
            <input 
              id="input-correo-recuperar"
              type="email" 
              required
              bind:value={correoRecuperar} 
              placeholder="ejemplo@mfn.gob.gt"
              class="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49] focus:outline-none focus:border-[#1248AA] transition-all"
            />
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button 
              type="button" 
              onclick={() => showRecuperarModal = false} 
              class="px-5 py-2.5 rounded-full font-bold text-[12px] text-[#071D49]/60 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={recuperando}
              class="px-6 py-2.5 rounded-full font-bold text-[12px] bg-[#071D49] hover:bg-black text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {#if recuperando}
                <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generando...</span>
              {:else}
                <span>Continuar</span>
                <Icon name="arrow_forward" className="w-3.5 h-3.5 text-[#1248AA]" />
              {/if}
            </button>
          </div>
        </form>
      {:else}
        <form onsubmit={ejecutarRestablecimiento} class="space-y-4">
          <div class="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-[11px] text-[#071D49]">
            <p class="font-bold">Si la cuenta existe, consulte el código enviado al correo:</p>
            <p class="font-mono text-[#1248AA] truncate mt-0.5">{correoRecuperar}</p>
          </div>

          <div>
            <label for="input-token-recuperar" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
              Token de Seguridad (15 min)
            </label>
            <input 
              id="input-token-recuperar"
              type="text" 
              required
              bind:value={tokenRecuperacion} 
              placeholder="Pegue aquí el token recibido..."
              class="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-[12px] font-mono text-[#071D49] focus:outline-none focus:border-[#1248AA]"
            />
          </div>

          <div>
            <label for="input-nueva-contrasena" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
              Nueva Contraseña
            </label>
            <input 
              id="input-nueva-contrasena"
              type="password" 
              required
              minlength="12"
              bind:value={nuevaContrasena} 
              placeholder="Mínimo 12 caracteres"
              class="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49] focus:outline-none focus:border-[#1248AA]"
            />
          </div>

          <div>
            <label for="input-confirmar-contrasena" class="block text-[12px] font-bold uppercase tracking-normal text-[#071D49]/40 mb-1.5">
              Confirmar Nueva Contraseña
            </label>
            <input 
              id="input-confirmar-contrasena"
              type="password" 
              required
              minlength="12"
              bind:value={confirmarContrasena} 
              placeholder="Repita la nueva contraseña"
              class="w-full bg-[#FFFFFF] border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-[#071D49] focus:outline-none focus:border-[#1248AA]"
            />
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button 
              type="button" 
              onclick={() => pasoRecuperacion = 1} 
              class="px-5 py-2.5 rounded-full font-bold text-[12px] text-[#071D49]/60 hover:bg-gray-100 transition-colors"
            >
              Atrás
            </button>
            <button 
              type="submit" 
              disabled={recuperando}
              class="px-6 py-2.5 rounded-full font-bold text-[12px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {#if recuperando}
                <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Actualizando...</span>
              {:else}
                <span>Restablecer Contraseña</span>
                <Icon name="check" className="w-3.5 h-3.5" />
              {/if}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

