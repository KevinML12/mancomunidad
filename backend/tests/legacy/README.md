# Pruebas históricas autocontenidas

Estos archivos definen dentro de cada prueba las funciones que evalúan. Documentan ejemplos de reglas del proyecto original, pero no importan los módulos de `src/` ni verifican las rutas o la persistencia actuales.

Se ejecutan por separado con `npm run test:legacy`. La validación predeterminada es `npm test`, que ejecuta las pruebas de integración contra una base temporal migrada.
