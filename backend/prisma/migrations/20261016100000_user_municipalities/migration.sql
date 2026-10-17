CREATE TABLE "UsuarioMunicipio" (
    "usuarioId" INTEGER NOT NULL,
    "municipio" TEXT NOT NULL,
    CONSTRAINT "UsuarioMunicipio_usuarioId_municipio_pkey" PRIMARY KEY ("usuarioId","municipio"),
    CONSTRAINT "UsuarioMunicipio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
