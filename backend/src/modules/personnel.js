import { Router } from 'express';
import dashboardRoutes from '../routes/dashboard.routes.js';
import puestosRoutes from '../routes/puestos.routes.js';
import colaboradoresRoutes from '../routes/colaboradores.routes.js';
import convocatoriasRoutes from '../routes/convocatorias.routes.js';
import evaluacionesRoutes from '../routes/evaluaciones.routes.js';
import ausenciasRoutes from '../routes/ausencias.routes.js';
import disciplinaRoutes from '../routes/disciplina.routes.js';
import capacitacionesRoutes from '../routes/capacitaciones.routes.js';

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
