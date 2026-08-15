import app from './app.js';

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`SIRH-MFN backend escuchando en http://localhost:${PORT}`);
});
