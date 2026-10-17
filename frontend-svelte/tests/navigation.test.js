import test from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, navigationFor } from '../src/lib/navigation.js';
import { ROLE_PERMISSIONS } from '../../backend/src/lib/roles.js';
test('prioridad visual conserva todos los accesos autorizados sin ampliar permisos',()=>{
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const {primary,secondary}=navigationFor(role,permissions);
    const keys=[...primary,...secondary].map(x=>x.key);
    assert.equal(new Set(keys).size,keys.length,role);
    assert.deepEqual([...keys].sort(),AREAS.filter(x=>permissions.modulos.includes(x.key)).map(x=>x.key).sort(),role);
    assert.ok(primary.length<=4,role);
  }
  assert.deepEqual(navigationFor('JD',ROLE_PERMISSIONS.JD).primary.map(x=>x.key),['gobernanza','financiero','proyectos']);
  assert.deepEqual(navigationFor('JI',ROLE_PERMISSIONS.JI).primary.map(x=>x.key),['ausencias','evaluaciones','disciplina']);
  assert.deepEqual(navigationFor('EMP',ROLE_PERMISSIONS.EMP).primary.map(x=>x.key),['ausencias','evaluaciones','capacitacion']);
  assert.deepEqual(navigationFor('GE',{modulos:[]}),{primary:[],secondary:[]});
});
test('el menú sigue la configuración guardada del rol, no su código',()=>{
  const custom={...ROLE_PERMISSIONS.EMP,modulos:['dashboard','convenios','proyectos','ausencias'],prioritarios:['convenios','ausencias']};
  const result=navigationFor('EMP',custom);
  assert.deepEqual(result.primary.map(area=>area.key),['convenios','ausencias']);
  assert.deepEqual(result.secondary.map(area=>area.key),['proyectos']);
});
