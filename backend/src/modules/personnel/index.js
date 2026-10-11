import { Router } from 'express';
import dashboardRoutes from './dashboard.routes.js';
import puestosRoutes from './puestos.routes.js';
import colaboradoresRoutes from './colaboradores.routes.js';
import convocatoriasRoutes from './convocatorias.routes.js';
import evaluacionesRoutes from './evaluaciones.routes.js';
import ausenciasRoutes from './ausencias.routes.js';
import disciplinaRoutes from './disciplina.routes.js';
import capacitacionesRoutes from './capacitaciones.routes.js';

const router = Router();

// Personnel remains a separate extension of the institutional workflow.
router.use('/dashboard', dashboardRoutes);
router.use('/puestos', puestosRoutes);
router.use('/colaboradores', colaboradoresRoutes);
router.use('/convocatorias', convocatoriasRoutes);
router.use('/evaluaciones', evaluacionesRoutes);
router.use('/ausencias', ausenciasRoutes);
router.use('/disciplina', disciplinaRoutes);
router.use('/capacitaciones', capacitacionesRoutes);

export default router;
