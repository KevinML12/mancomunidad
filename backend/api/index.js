// Entry point serverless de Vercel — reusa la misma app Express de
// src/app.js (dev local usa src/server.js, que sí llama app.listen()).
import app from '../src/app.js';

export default app;
