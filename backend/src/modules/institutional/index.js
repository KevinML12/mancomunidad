import { Router } from 'express';
import proyectosRoutes from './proyectos.routes.js';
import arcRoutes from './arc.routes.js';
import financieroRoutes from './financiero.routes.js';
import gobernanzaRoutes from './gobernanza.routes.js';
import conveniosRoutes from './convenios.routes.js';
import estadisticasRoutes from './estadisticas.routes.js';
import transparenciaRoutes from './transparencia.routes.js';
import inteligenciaRoutes from './inteligencia.routes.js';

const router = Router();

// Seven institutional modules plus the territorial intelligence extension.
router.use('/proyectos', proyectosRoutes);
router.use('/arc', arcRoutes);
router.use('/financiero', financieroRoutes);
router.use('/gobernanza', gobernanzaRoutes);
router.use('/convenios', conveniosRoutes);
router.use('/estadisticas', estadisticasRoutes);
router.use('/transparencia', transparenciaRoutes);
router.use('/inteligencia', inteligenciaRoutes);

export default router;
