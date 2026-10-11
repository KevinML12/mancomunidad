import { Router } from 'express';
import proyectosRoutes from '../routes/proyectos.routes.js';
import arcRoutes from '../routes/arc.routes.js';
import financieroRoutes from '../routes/financiero.routes.js';
import gobernanzaRoutes from '../routes/gobernanza.routes.js';
import conveniosRoutes from '../routes/convenios.routes.js';
import estadisticasRoutes from '../routes/estadisticas.routes.js';
import transparenciaRoutes from '../routes/transparencia.routes.js';
import inteligenciaRoutes from '../routes/inteligencia.routes.js';

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
