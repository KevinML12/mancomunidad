import './style.css';

const root = document.querySelector('#app');
const state = { user: null, overview: null, publicaciones: [], usuarios: [], roles: [], municipios: [], tab: 'publicaciones', editing: null, message: '', error: '' };

async function api(path, options = {}) {
  const response = await fetch(`/api/v1${path}`, {
    credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function element(tag, { className, text, ...attributes } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  for (const [name, value] of Object.entries(attributes)) if (value !== undefined && value !== null) node.setAttribute(name, value);
  for (const child of children) node.append(child);
  return node;
}

function button(text, action, secondary = false) {
  const node = element('button', { className: `button${secondary ? ' secondary' : ''}`, text, type: 'button' });
  node.addEventListener('click', action);
  return node;
}

function field(label, name, tag = 'input', attributes = {}) {
  const control = element(tag, { name, id: name, ...attributes });
  return { wrapper: element('label', { className: 'field', for: name }, [element('span', { text: label }), control]), control };
}

async function bootstrap() {
  try {
    state.user = await api('/auth/me');
    if (state.user.mustChangePassword) {
      state.overview = null;
      state.error = '';
      render();
      return;
    }
    state.overview = await api('/admin/overview');
    await loadTab();
  } catch (error) {
    if (error.status === 401) state.user = null;
    state.overview = null;
    state.error = error.status === 403 ? 'Esta cuenta no tiene permiso de administración.' : error.status === 401 ? '' : error.message;
  }
  render();
}

async function loadTab() {
  if (state.tab === 'publicaciones') state.publicaciones = await api('/admin/publicaciones');
  if (state.tab === 'usuarios') [state.usuarios, state.roles, state.municipios] = await Promise.all([api('/admin/users'), api('/admin/roles'), api('/admin/municipalities')]);
}

function showMessage(text, error = false) {
  state.message = error ? '' : text;
  state.error = error ? text : '';
  render();
}

function renderLogin() {
  const shell = element('main', { className: 'login panel' });
  shell.append(element('p', { className: 'small muted', text: 'MFN DIGITAL' }), element('h1', { text: 'Administración' }), element('p', { className: 'muted', text: 'Acceso para cuentas autorizadas. Este sitio está separado del portal público.' }));
  if (state.message) shell.append(element('p', { className: 'notice', text: state.message }));
  if (state.error) shell.append(element('p', { className: 'error', text: state.error }));
  const form = element('form');
  const email = field('Correo', 'correo', 'input', { type: 'email', required: '', autocomplete: 'username' });
  const password = field('Contraseña', 'contrasena', 'input', { type: 'password', required: '', autocomplete: 'current-password' });
  const submit = element('button', { className: 'button', text: 'Ingresar', type: 'submit' });
  form.append(email.wrapper, password.wrapper, submit);
  form.addEventListener('submit', async event => {
    event.preventDefault(); submit.disabled = true;
    try {
      await api('/auth/login', { method: 'POST', body: JSON.stringify({ correo: email.control.value.trim(), contrasena: password.control.value }) });
      state.error = ''; state.message = '';
      await bootstrap();
    } catch (error) { showMessage(error.message, true); }
    finally { password.control.value = ''; submit.disabled = false; }
  });
  shell.append(form);
  return shell;
}

function renderDenied() {
  const shell = element('main', { className: 'login panel' });
  shell.append(element('h1', { text: 'Acceso restringido' }), element('p', { text: state.error || 'Esta cuenta no tiene permiso de administración.' }));
  shell.append(button('Cerrar sesión', async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* La cookie puede haber expirado. */ }
    state.user = null; state.error = ''; render();
  }, true));
  return shell;
}

function renderRequiredPasswordChange() {
  const shell = element('main', { className: 'login' });
  shell.append(element('p', { className: 'small muted', text: 'MFN DIGITAL · ADMINISTRACIÓN' }), element('h1', { text: 'Cambie su contraseña inicial' }), element('p', { className: 'muted', text: 'Para continuar, establezca una contraseña personal. Se cerrará esta sesión al guardarla.' }));
  if (state.error) shell.append(element('p', { className: 'error', text: state.error }));
  shell.append(renderSecurity(), button('Cerrar sesión', async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* La sesión puede haber expirado. */ }
    state.user = null; state.error = ''; render();
  }, true));
  return shell;
}

function renderPublicationForm() {
  const panel = element('section', { className: 'panel' });
  panel.append(element('h2', { text: state.editing ? 'Editar publicación' : 'Nueva publicación' }));
  panel.append(element('p', { className: 'small muted', text: 'Los archivos se guardan en R2. La publicación comienza como borrador.' }));
  const form = element('form');
  const type = field('Tipo', 'tipo', 'select');
  for (const value of ['Aviso', 'Proyecto', 'Acta', 'Estadística', 'Finanzas', 'Convocatoria', 'Documento']) type.control.append(element('option', { value, text: value }));
  const title = field('Título', 'titulo', 'input', { required: '', maxlength: '160' });
  const summary = field('Contenido o resumen', 'resumen', 'textarea', { required: '', maxlength: '3000' });
  const file = field('Imagen o PDF, hasta 2.5 MB', 'archivo', 'input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,application/pdf' });
  if (state.editing) {
    type.control.value = state.editing.tipo;
    title.control.value = state.editing.titulo;
    summary.control.value = state.editing.resumen;
  }
  const submit = element('button', { className: 'button', type: 'submit', text: state.editing ? 'Guardar cambios' : 'Guardar borrador' });
  form.append(type.wrapper, title.wrapper, summary.wrapper, file.wrapper, submit);
  if (state.editing) form.append(button('Cancelar edición', () => { state.editing = null; render(); }, true));
  form.addEventListener('submit', async event => {
    event.preventDefault(); submit.disabled = true;
    try {
      const payload = { tipo: type.control.value, titulo: title.control.value.trim(), resumen: summary.control.value.trim() };
      if (file.control.files?.[0]) {
        const selected = file.control.files[0];
        if (selected.size > 2.5 * 1024 * 1024) throw new Error('El archivo supera 2.5 MB. Reduzca su tamaño y reintente.');
        const archivoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
          reader.readAsDataURL(selected);
        });
        const media = await api('/admin/media', { method: 'POST', body: JSON.stringify({ archivoBase64, tipoMime: selected.type }) });
        payload.mediaRef = media.reference;
      }
      await api(state.editing ? `/admin/publicaciones/${state.editing.id}` : '/admin/publicaciones', {
        method: state.editing ? 'PATCH' : 'POST', body: JSON.stringify(payload),
      });
      state.editing = null;
      state.publicaciones = await api('/admin/publicaciones');
      state.overview = await api('/admin/overview');
      showMessage('Publicación guardada. Revise su contenido antes de hacerla visible.');
    } catch (error) { showMessage(error.message, true); }
    finally { submit.disabled = false; }
  });
  panel.append(form);
  return panel;
}

function renderPublications() {
  const area = element('div', { className: 'layout' });
  const list = element('section', { className: 'panel' });
  list.append(element('h2', { text: 'Publicaciones' }));
  if (!state.publicaciones.length) list.append(element('p', { className: 'empty', text: 'No hay publicaciones registradas.' }));
  for (const publication of state.publicaciones) {
    const card = element('article', { className: 'item' });
    const info = element('div', { className: 'row' }, [
      element('span', { className: 'badge', text: publication.tipo }),
      element('span', { className: 'small muted', text: publication.visibilidad ? 'Visible' : 'Borrador' }),
    ]);
    card.append(info, element('h3', { text: publication.titulo }), element('p', { className: 'small muted', text: new Date(publication.fechaPublicacion).toLocaleDateString('es-GT') }), element('p', { className: 'small', text: publication.resumen }));
    const actions = element('div', { className: 'actions' });
    actions.append(button('Editar', () => { state.editing = publication; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, true));
    actions.append(button(publication.visibilidad ? 'Retirar' : 'Publicar', async () => {
      if (!window.confirm(publication.visibilidad ? '¿Retirar esta publicación del portal público?' : '¿Publicar este contenido en el portal público?')) return;
      try {
        await api(`/admin/publicaciones/${publication.id}`, { method: 'PATCH', body: JSON.stringify({ visibilidad: !publication.visibilidad }) });
        state.publicaciones = await api('/admin/publicaciones');
        state.overview = await api('/admin/overview');
        showMessage('Visibilidad actualizada.');
      } catch (error) { showMessage(error.message, true); }
    }));
    if (publication.mediaRef) {
      const link = element('a', { className: 'button secondary', href: `/api/v1/admin/publicaciones/${publication.id}/media`, target: '_blank', rel: 'noopener noreferrer', text: 'Ver archivo' });
      actions.append(link);
    }
    card.append(actions); list.append(card);
  }
  area.append(renderPublicationForm(), list);
  return area;
}

function renderUsers() {
  const section = element('section', { className: 'panel' });
  section.append(element('h2', { text: 'Cuentas y sesiones' }), element('p', { className: 'small muted', text: 'Cree cuentas personales con claves únicas. El permiso de administración se configura fuera de este panel.' }));
  const form = element('form');
  const email = field('Correo de la nueva cuenta', 'nuevo-correo', 'input', { type: 'email', required: '', autocomplete: 'off' });
  const role = field('Rol institucional', 'nuevo-rol', 'select', { required: '' });
  role.control.append(element('option', { value: '', text: 'Seleccione un rol' }));
  for (const item of state.roles) role.control.append(element('option', { value: item.id, text: item.nombre }));
  const municipios = field('Municipios autorizados (varios si corresponde)', 'nuevos-municipios', 'select', { multiple: '', size: '3' });
  for (const value of state.municipios) municipios.control.append(element('option', { value, text: value }));
  const password = field('Contraseña inicial, mínimo 12 caracteres', 'nueva-clave', 'input', { type: 'password', required: '', minlength: '12', autocomplete: 'new-password' });
  const adminPassword = field('Su contraseña para confirmar', 'clave-admin', 'input', { type: 'password', required: '', autocomplete: 'current-password' });
  const create = element('button', { className: 'button', type: 'submit', text: 'Crear cuenta' });
  form.append(email.wrapper, role.wrapper, municipios.wrapper, password.wrapper, adminPassword.wrapper, create);
  form.addEventListener('submit', async event => {
    event.preventDefault(); create.disabled = true;
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify({ correo: email.control.value.trim(), rolId: Number(role.control.value), municipios: [...municipios.control.selectedOptions].map(option => option.value), contrasena: password.control.value, contrasenaAdministrador: adminPassword.control.value }) });
      state.usuarios = await api('/admin/users');
      state.overview = await api('/admin/overview');
      showMessage('Cuenta creada. Entregue la contraseña inicial a su titular por un canal privado. Tendrá que cambiarla al ingresar.');
    } catch (error) { showMessage(error.message, true); }
    finally { password.control.value = ''; adminPassword.control.value = ''; create.disabled = false; }
  });
  section.append(form);
  const table = element('table');
  const head = element('thead');
  head.append(element('tr', {}, ['Cuenta', 'Rol', 'Municipios', 'Acción'].map(text => element('th', { text }))));
  const body = element('tbody');
  for (const user of state.usuarios) {
    const row = element('tr');
    row.append(element('td', { text: user.correo }), element('td', { text: user.rol.nombre }), element('td', { text: user.municipios.map(item => item.municipio).join(', ') || 'Sin asignar' }));
    const action = element('td');
    if (user.id !== state.user.id) {
      action.append(button('Cambiar rol', () => renderRoleForm(section, user), true));
      action.append(button('Municipios', () => renderMunicipalityForm(section, user), true));
      action.append(button('Revocar sesiones', async () => {
      if (!window.confirm(`¿Cerrar todas las sesiones de ${user.correo}?`)) return;
      try { await api(`/admin/users/${user.id}/revoke-sessions`, { method: 'POST' }); showMessage('Sesiones revocadas.'); }
      catch (error) { showMessage(error.message, true); }
      }, true));
      action.append(button('Cambiar clave', () => renderRotationForm(section, user), true));
    }
    row.append(action); body.append(row);
  }
  table.append(head, body); section.append(element('div', { className: 'list' }, [table]));
  return section;
}

function renderMunicipalityForm(section, user) {
  section.querySelector('.municipality-change')?.remove();
  const form = element('form', { className: 'municipality-change' });
  form.append(element('h3', { text: `Municipios de ${user.correo}` }));
  const municipios = field('Municipios autorizados', 'cambiar-municipios', 'select', { multiple: '', size: '3' });
  const current = new Set(user.municipios.map(item => item.municipio));
  for (const value of state.municipios) {
    const option = element('option', { value, text: value });
    option.selected = current.has(value);
    municipios.control.append(option);
  }
  const adminPassword = field('Su contraseña para confirmar', 'cambiar-municipios-admin', 'input', { type: 'password', required: '', autocomplete: 'current-password' });
  const submit = element('button', { className: 'button', type: 'submit', text: 'Guardar municipios y cerrar sesiones' });
  form.append(municipios.wrapper, adminPassword.wrapper, submit);
  form.addEventListener('submit', async event => {
    event.preventDefault(); submit.disabled = true;
    try {
      await api(`/admin/users/${user.id}/municipalities`, { method: 'PATCH', body: JSON.stringify({ municipios: [...municipios.control.selectedOptions].map(option => option.value), contrasenaAdministrador: adminPassword.control.value }) });
      state.usuarios = await api('/admin/users');
      showMessage(`Municipios de ${user.correo} actualizados. Sus sesiones anteriores quedaron revocadas.`);
    } catch (error) { showMessage(error.message, true); }
    finally { adminPassword.control.value = ''; submit.disabled = false; }
  });
  section.prepend(form);
  municipios.control.focus();
}

function renderRoleForm(section, user) {
  section.querySelector('.role-change')?.remove();
  const form = element('form', { className: 'role-change' });
  form.append(element('h3', { text: `Cambiar rol de ${user.correo}` }));
  const role = field('Nuevo rol institucional', 'cambiar-rol', 'select', { required: '' });
  for (const item of state.roles) role.control.append(element('option', { value: item.id, text: item.nombre }));
  role.control.value = String(state.roles.find(item => item.codigo === user.rol.codigo)?.id || '');
  const adminPassword = field('Su contraseña para confirmar', 'cambiar-rol-admin', 'input', { type: 'password', required: '', autocomplete: 'current-password' });
  const submit = element('button', { className: 'button', type: 'submit', text: 'Guardar rol y cerrar sesiones' });
  form.append(role.wrapper, adminPassword.wrapper, submit);
  form.addEventListener('submit', async event => {
    event.preventDefault(); submit.disabled = true;
    try {
      await api(`/admin/users/${user.id}/role`, { method: 'PATCH', body: JSON.stringify({ rolId: Number(role.control.value), contrasenaAdministrador: adminPassword.control.value }) });
      state.usuarios = await api('/admin/users');
      showMessage(`Rol de ${user.correo} actualizado. Sus sesiones anteriores quedaron revocadas.`);
    } catch (error) { showMessage(error.message, true); }
    finally { adminPassword.control.value = ''; submit.disabled = false; }
  });
  section.prepend(form);
  role.control.focus();
}

function renderRotationForm(section, user) {
  section.querySelector('.rotation')?.remove();
  const form = element('form', { className: 'rotation' });
  form.append(element('h3', { text: `Cambiar clave de ${user.correo}` }));
  const password = field('Contraseña nueva, mínimo 12 caracteres', 'rotar-clave', 'input', { type: 'password', required: '', minlength: '12', autocomplete: 'new-password' });
  const adminPassword = field('Su contraseña para confirmar', 'rotar-admin', 'input', { type: 'password', required: '', autocomplete: 'current-password' });
  const submit = element('button', { className: 'button', type: 'submit', text: 'Cambiar clave y cerrar sesiones' });
  form.append(password.wrapper, adminPassword.wrapper, submit);
  form.addEventListener('submit', async event => {
    event.preventDefault(); submit.disabled = true;
    try {
      await api(`/admin/users/${user.id}/password`, { method: 'POST', body: JSON.stringify({ nuevaContrasena: password.control.value, contrasenaAdministrador: adminPassword.control.value }) });
      showMessage(`Contraseña de ${user.correo} cambiada y sesiones revocadas. La persona deberá establecer otra al ingresar.`);
    } catch (error) { showMessage(error.message, true); }
    finally { password.control.value = ''; adminPassword.control.value = ''; submit.disabled = false; }
  });
  section.prepend(form);
  password.control.focus();
}

function renderSecurity() {
  const section = element('section', { className: 'panel' });
  section.append(element('h2', { text: 'Mi contraseña' }), element('p', { className: 'small muted', text: 'Al cambiarla se cerrarán todas sus sesiones, incluida esta.' }));
  const form = element('form');
  const current = field('Contraseña actual', 'clave-actual', 'input', { type: 'password', required: '', autocomplete: 'current-password' });
  const next = field('Contraseña nueva, mínimo 12 caracteres', 'clave-nueva', 'input', { type: 'password', required: '', minlength: '12', autocomplete: 'new-password' });
  const confirm = field('Repita la contraseña nueva', 'clave-confirmar', 'input', { type: 'password', required: '', minlength: '12', autocomplete: 'new-password' });
  const submit = element('button', { className: 'button', type: 'submit', text: 'Cambiar contraseña' });
  form.append(current.wrapper, next.wrapper, confirm.wrapper, submit);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (next.control.value !== confirm.control.value) { showMessage('Las contraseñas nuevas no coinciden.', true); return; }
    submit.disabled = true;
    try {
      await api('/auth/password', { method: 'POST', body: JSON.stringify({ contrasenaActual: current.control.value, nuevaContrasena: next.control.value }) });
      state.user = null; state.overview = null; state.tab = 'publicaciones';
      state.message = 'Contraseña cambiada. Ingrese con la nueva clave.'; state.error = '';
      render();
    } catch (error) { showMessage(error.message, true); }
    finally { current.control.value = ''; next.control.value = ''; confirm.control.value = ''; submit.disabled = false; }
  });
  section.append(form);
  return section;
}

function renderDashboard() {
  const shell = element('main', { className: 'shell' });
  const top = element('header', { className: 'top' }, [
    element('div', {}, [element('div', { className: 'brand', text: 'MFN Digital · Administración' }), element('div', { className: 'small muted', text: state.user.correo })]),
    button('Cerrar sesión', async () => {
      try { await api('/auth/logout', { method: 'POST' }); state.user = null; state.overview = null; render(); }
      catch (error) { showMessage(error.message, true); }
    }, true),
  ]);
  shell.append(top, element('h1', { className: 'title', text: 'Administración de la aplicación' }), element('p', { className: 'muted', text: 'Publicaciones, cuentas y estado del sistema.' }));
  if (state.message) shell.append(element('p', { className: 'notice', text: state.message }));
  if (state.error) shell.append(element('p', { className: 'error', text: state.error }));
  const stats = element('div', { className: 'grid stats' });
  for (const [label, value] of [['Cuentas', state.overview.usuarios], ['Roles', state.overview.roles], ['Publicaciones', state.overview.publicaciones], ['Visibles', state.overview.visibles]]) {
    stats.append(element('div', { className: 'panel stat' }, [element('span', { className: 'small muted', text: label }), element('strong', { text: value })]));
  }
  shell.append(stats);
  const tabs = element('nav', { className: 'tabs', 'aria-label': 'Secciones de administración' });
  for (const [key, label] of [['publicaciones', 'Publicaciones'], ['usuarios', 'Cuentas'], ['seguridad', 'Mi contraseña']]) tabs.append(button(label, async () => {
    state.tab = key; state.editing = null; state.error = ''; state.message = '';
    try { await loadTab(); render(); } catch (error) { showMessage(error.message, true); }
  }, state.tab !== key));
  shell.append(tabs, state.tab === 'publicaciones' ? renderPublications() : state.tab === 'usuarios' ? renderUsers() : renderSecurity());
  return shell;
}

function render() {
  root.replaceChildren(state.user?.mustChangePassword ? renderRequiredPasswordChange() : state.overview ? renderDashboard() : state.user ? renderDenied() : renderLogin());
}

bootstrap();
