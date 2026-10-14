<script>
  import { onMount } from 'svelte';
  import { X } from 'lucide-svelte';
  let { title, kicker='MFN Digital', description='', busy=false, onclose, children }=$props();
  let dialog;
  onMount(()=>{dialog.showModal();return ()=>dialog.close();});
  function cancel(event){event.preventDefault();if(!busy)onclose();}
  function backdrop(event){
    if(event.target!==dialog || busy)return;
    const box=dialog.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)onclose();
  }
</script>
<!-- Native modal supplies focus containment, Escape handling and inert background. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<dialog bind:this={dialog} oncancel={cancel} onclick={backdrop} aria-label={title} aria-busy={busy} class="mfn-document-dialog">
  <header class="mfn-dialog-header">
    <div><p class="mfn-eyebrow">{kicker}</p><h2>{title}</h2>{#if description}<p class="mfn-dialog-description">{description}</p>{/if}</div>
    <button type="button" aria-label="Cerrar formulario" disabled={busy} onclick={onclose} class="mfn-icon-button"><X size={20}/></button>
  </header>
  <div class="mfn-dialog-body">{@render children()}</div>
</dialog>
