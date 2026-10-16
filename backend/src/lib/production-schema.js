// Compare the generated Prisma model with the actual PostgreSQL columns so
// new modules cannot silently deploy against an older database.
export function missingProductionColumns(rows, models) {
  const present = new Set(rows.map(({ table_name, column_name }) => `${table_name}.${column_name}`));
  return models.flatMap(model =>
    model.fields
      .filter(field => field.kind === 'scalar' || field.kind === 'enum')
      .map(field => `${model.dbName || model.name}.${field.dbName || field.name}`)
      .filter(column => !present.has(column)),
  );
}
