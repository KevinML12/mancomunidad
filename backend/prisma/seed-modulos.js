import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Carga de Datos Oficiales de los 7 Módulos Institucionales ---');

  // 1. MÓDULO 1: PROYECTOS
  console.log('1. Sembrando Proyectos Intermunicipales y Evidencias Fotográficas...');
  const p1 = await prisma.proyecto.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nombre: 'Sistema de Agua Potable y Conducción por Gravedad Santa Eulalia',
      agenciaFinanciadora: 'USAID / DAI',
      fechaInicioPlanificada: new Date('2024-01-15'),
      fechaFinPlanificada: new Date('2024-12-20'),
      presupuestoMunicipal: 9672000,
      presupuestoCooperacion: 9672000,
      estado: 'Ejecución',
      porcentajeAvanceFisico: 78.5,
      evidencias: {
        create: [
          {
            urlArchivo: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=1200&q=80',
            latitud: 15.7333,
            longitud: -91.3333,
            descripcion: 'Captación en manantial Ixtapoc y colocación de tubería HG de 4 pulgadas',
            fechaCaptura: new Date('2024-03-10')
          },
          {
            urlArchivo: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=1200&q=80',
            latitud: 15.7350,
            longitud: -91.3320,
            descripcion: 'Armado de tanque de almacenamiento de 100m3 y caseta de cloración',
            fechaCaptura: new Date('2024-04-02')
          }
        ]
      }
    }
  });

  const p2 = await prisma.proyecto.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      nombre: 'Puente Biregional San Mateo - Conexión Corredor Norte San Mateo Ixtatán',
      agenciaFinanciadora: 'AECID España',
      fechaInicioPlanificada: new Date('2024-02-01'),
      fechaFinPlanificada: new Date('2025-03-30'),
      presupuestoMunicipal: 22230000,
      presupuestoCooperacion: 22230000,
      estado: 'Ejecución',
      porcentajeAvanceFisico: 42.0,
      evidencias: {
        create: [
          {
            urlArchivo: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=1200&q=80',
            latitud: 15.8333,
            longitud: -91.4833,
            descripcion: 'Vaciado de estribos de concreto reforzado en margen norte del Río Yolcultec',
            fechaCaptura: new Date('2024-03-22')
          }
        ]
      }
    }
  });

  const p3 = await prisma.proyecto.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      nombre: 'Planta de Tratamiento de Aguas Residuales Macro-Soloma',
      agenciaFinanciadora: 'BID / IADB',
      fechaInicioPlanificada: new Date('2023-08-01'),
      fechaFinPlanificada: new Date('2024-06-30'),
      presupuestoMunicipal: 26910000,
      presupuestoCooperacion: 26910000,
      estado: 'Ejecución',
      porcentajeAvanceFisico: 96.0
    }
  });

  // 2. MÓDULO 2: ARC (PLAN DE MEJORAS)
  console.log('2. Sembrando Tareas del Tablero Kanban ARC...');
  const tareasArc = [
    {
      codigo: 'ARC-2024-001',
      titulo: 'Implementar Sistema Integrado SIRH-MFN en los 6 Municipios',
      descripcion: 'Despliegue de módulos de proyectos, gobernanza, finanzas y transparencia conforme recomendación del Informe Final ARC 2023.',
      dimension: 'Planificación y Monitoreo',
      prioridad: 'Alta',
      estado: 'En Proceso',
      municipio: 'Regional',
      responsable: 'Ing. Carlos Méndez',
      fechaLimite: new Date(Date.now() + 15 * 86400000)
    },
    {
      codigo: 'ARC-2024-002',
      titulo: 'Actualizar Manual de Funciones y Catálogo de 28 Puestos',
      descripcion: 'Aprobación en asamblea ordinaria de la nueva escala de puestos técnicos y perfiles de competencias.',
      dimension: 'Gestión de Proyectos e Inversión',
      prioridad: 'Media',
      estado: 'Finalizado',
      municipio: 'Santa Eulalia',
      responsable: 'Licda. Ana Sofía Morales',
      fechaLimite: new Date(Date.now() - 5 * 86400000),
      fechaFinalizada: new Date(Date.now() - 3 * 86400000)
    },
    {
      codigo: 'ARC-2024-003',
      titulo: 'Auditoría Preventiva y Digitalización de Libros Hojas Movibles CGC',
      descripcion: 'Escanear y vincular cada acuerdo resolutivo de asamblea con su respectivo folio de autorización CGC.',
      dimension: 'Probidad, Transparencia y Eficiencia',
      prioridad: 'Alta',
      estado: 'En Revisión',
      municipio: 'San Pedro Soloma',
      responsable: 'Lic. Marvin Ramírez',
      fechaLimite: new Date(Date.now() + 2 * 86400000) // Alerta preventiva
    },
    {
      codigo: 'ARC-2024-004',
      titulo: 'Capacitación a OMAS Municipales en Cloración y Dosificación ASH',
      descripcion: 'Taller práctico intermunicipal con técnicos OMAS sobre uso de comparadores colorimétricos DPD y norma COGUANOR.',
      dimension: 'Planificación y Monitoreo',
      prioridad: 'Media',
      estado: 'Pendiente',
      municipio: 'Regional',
      responsable: 'Ing. Marco Aurelio Gómez',
      fechaLimite: new Date(Date.now() + 30 * 86400000)
    }
  ];

  for (const t of tareasArc) {
    await prisma.tareaARC.upsert({
      where: { codigo: t.codigo },
      update: {},
      create: t
    });
  }

  // 3. MÓDULO 3: CONTROL FINANCIERO Y CUOTAS
  console.log('3. Sembrando Transacciones Financieras y Cuotas Municipales...');
  const txs = [
    {
      codigo: 'FIN-2024-ING001',
      tipo: 'Ingreso',
      cuentaBancaria: 'Fondos Públicos',
      categoria: 'Cuota Ordinaria',
      municipio: 'Santa Eulalia',
      monto: 15000.0,
      comprobanteTipo: 'Recibo CGC 63-A2',
      comprobanteNumero: 'Serie AG-88921',
      descripcion: 'Pago cuota ordinaria estatutaria correspondiente al mes de Enero 2024',
      fecha: new Date('2024-01-10')
    },
    {
      codigo: 'FIN-2024-ING002',
      tipo: 'Ingreso',
      cuentaBancaria: 'Fondos Públicos',
      categoria: 'Cuota Ordinaria',
      municipio: 'San Pedro Soloma',
      monto: 15000.0,
      comprobanteTipo: 'Recibo CGC 63-A2',
      comprobanteNumero: 'Serie AG-88922',
      descripcion: 'Pago cuota ordinaria estatutaria correspondiente al mes de Enero 2024',
      fecha: new Date('2024-01-12')
    },
    {
      codigo: 'FIN-2024-ING003',
      tipo: 'Ingreso',
      cuentaBancaria: 'Fondos Públicos',
      categoria: 'Cuota Ordinaria',
      municipio: 'San Juan Ixcoy',
      monto: 15000.0,
      comprobanteTipo: 'Recibo CGC 63-A2',
      comprobanteNumero: 'Serie AG-88923',
      descripcion: 'Pago cuota ordinaria estatutaria correspondiente al mes de Enero 2024',
      fecha: new Date('2024-01-15')
    },
    {
      codigo: 'FIN-2024-ING004',
      tipo: 'Ingreso',
      cuentaBancaria: 'Cooperación Internacional',
      categoria: 'Donación',
      municipio: 'Regional',
      monto: 750000.0,
      comprobanteTipo: 'Factura SAT FEL',
      comprobanteNumero: 'FEL-US-109283-A',
      descripcion: 'Primer desembolso de fondos no reembolsables convenio USAID / DAI para agua potable',
      fecha: new Date('2024-02-01')
    },
    {
      codigo: 'FIN-2024-EGR001',
      tipo: 'Egreso',
      cuentaBancaria: 'Fondos Públicos',
      categoria: 'Caja Chica',
      municipio: 'Santa Eulalia',
      monto: 1850.0,
      comprobanteTipo: 'Factura SAT FEL',
      comprobanteNumero: 'FEL-LBR-88231',
      urlComprobante: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      descripcion: 'Adquisición de suministros y tóner para actas de asamblea general (CGC)',
      fecha: new Date('2024-02-05')
    },
    {
      codigo: 'FIN-2024-EGR002',
      tipo: 'Egreso',
      cuentaBancaria: 'Fondos Públicos',
      categoria: 'Operativo',
      municipio: 'Regional',
      monto: 18400.0,
      comprobanteTipo: 'Factura SAT FEL',
      comprobanteNumero: 'FEL-COM-44012',
      urlComprobante: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80',
      descripcion: 'Servicio de mantenimiento preventivo y combustible para vehículos de campo intermunicipales',
      fecha: new Date('2024-02-20')
    }
  ];

  for (const tx of txs) {
    await prisma.transaccionFinanciera.upsert({
      where: { codigo: tx.codigo },
      update: {},
      create: tx
    });
  }

  // 4. MÓDULO 4: GOBERNANZA Y ACTAS
  console.log('4. Sembrando Actas de Asamblea y Acuerdos de Gobernanza...');
  await prisma.actaAsamblea.upsert({
    where: { numeroActa: 'ACTA-01-2024' },
    update: {},
    create: {
      numeroActa: 'ACTA-01-2024',
      numeroSesion: 1,
      tipoSesion: 'Ordinaria',
      fecha: new Date('2024-01-18'),
      municipioSede: 'Santa Eulalia',
      lugarReunion: 'Salón de Honor Municipal de Santa Eulalia',
      libroCGCFolio: 'Libro No. 04 · Folio 132',
      urlPdfEscaneado: 'https://storage.mfn.gob.gt/actas/ACTA-01-2024-FIRMADA.pdf',
      acuerdos: {
        create: [
          {
            codigo: 'ACU-2024-001',
            titulo: 'Aprobación del Plan Operativo Anual (POA 2024) y Presupuesto Maestro MFN',
            descripcion: 'Se aprueba por unanimidad de los 6 alcaldes el presupuesto de funcionamiento e inversión 2024.',
            responsable: 'Gerente Ejecutivo Marvin Ramírez',
            estado: 'Cumplido',
            fechaCumplimiento: new Date('2024-01-25'),
            evidenciaUrl: 'https://storage.mfn.gob.gt/evidencias/POA-2024-APROBADO.pdf'
          },
          {
            codigo: 'ACU-2024-002',
            titulo: 'Ratificación del aporte ordinario mensual de Q15,000 por municipio',
            descripcion: 'Compromiso formal de depósito dentro de los primeros 10 días de cada mes en Banrural.',
            responsable: 'Dirección Administrativa y Financiera',
            estado: 'En Proceso'
          }
        ]
      }
    }
  });

  await prisma.actaAsamblea.upsert({
    where: { numeroActa: 'ACTA-02-2024' },
    update: {},
    create: {
      numeroActa: 'ACTA-02-2024',
      numeroSesion: 2,
      tipoSesion: 'Extraordinaria',
      fecha: new Date('2024-02-14'),
      municipioSede: 'San Pedro Soloma',
      lugarReunion: 'Sede Mancomunidad Frontera del Norte, Soloma',
      libroCGCFolio: 'Libro No. 04 · Folio 148',
      urlPdfEscaneado: 'https://storage.mfn.gob.gt/actas/ACTA-02-2024-EXTRAORDINARIA.pdf',
      acuerdos: {
        create: [
          {
            codigo: 'ACU-2024-003',
            titulo: 'Autorización para suscribir adenda de cooperación no reembolsable con AECID España',
            descripcion: 'Ampliación de recursos para el puente biregional de San Mateo Ixtatán.',
            responsable: 'Ing. Carlos Méndez',
            estado: 'En Proceso'
          }
        ]
      }
    }
  });

  // 5. MÓDULO 5: CONVENIOS INSTITUCIONALES
  console.log('5. Sembrando Convenios y Motor Cronológico 90D...');
  const convenios = [
    {
      codigo: 'CONV-2024-001',
      nombre: 'Convenio de Cooperación No Reembolsable para Fortalecimiento Institucional y ASH',
      tipoOrganizacion: 'Cooperación Internacional',
      entidadCooperante: 'USAID / DAI',
      montoCooperacion: 1200000.0,
      contrapartidaMFN: 800000.0,
      fechaSuscripcion: new Date('2023-06-01'),
      fechaVencimiento: new Date(Date.now() + 250 * 86400000), // Vigente
      estado: 'Vigente',
      urlDocumento: 'https://storage.mfn.gob.gt/convenios/CONVENIO-USAID-2023.pdf',
      coordinadorMFN: 'Ing. Carlos Méndez'
    },
    {
      codigo: 'CONV-2024-002',
      nombre: 'Proyecto de Infraestructura Vial de Conexión Fronteriza Norte',
      tipoOrganizacion: 'Cooperación Internacional',
      entidadCooperante: 'AECID España',
      montoCooperacion: 2850000.0,
      contrapartidaMFN: 1500000.0,
      fechaSuscripcion: new Date('2023-04-15'),
      fechaVencimiento: new Date(Date.now() + 45 * 86400000), // <90 días -> Alerta Próximo a Vencer
      estado: 'Próximo a Vencer',
      urlDocumento: 'https://storage.mfn.gob.gt/convenios/AECID-VIAL-2023.pdf',
      coordinadorMFN: 'Lic. Marvin Ramírez'
    },
    {
      codigo: 'CONV-2024-003',
      nombre: 'Mesa Técnica Intermunicipal para Conservación de Cuencas Compartidas',
      tipoOrganizacion: 'Sector Público',
      entidadCooperante: 'MARN Guatemala',
      montoCooperacion: 0.0,
      contrapartidaMFN: 120000.0,
      fechaSuscripcion: new Date('2023-09-01'),
      fechaVencimiento: new Date(Date.now() + 320 * 86400000),
      estado: 'Vigente',
      urlDocumento: 'https://storage.mfn.gob.gt/convenios/MARN-CUENCAS.pdf',
      coordinadorMFN: 'Ing. Marco Aurelio Gómez'
    }
  ];

  for (const c of convenios) {
    await prisma.convenioInstitucional.upsert({
      where: { codigo: c.codigo },
      update: {},
      create: c
    });
  }

  // 6. MÓDULO 6: ESTADÍSTICAS ASH (AGUA Y SANEAMIENTO)
  console.log('6. Sembrando Censo Comunitario OMAS y Calidad de Cloro Residual...');
  const censos = [
    {
      codigo: 'ASH-2024-001',
      municipio: 'Santa Eulalia',
      comunidad: 'Aldea Ixcanac',
      viviendasTotales: 340,
      viviendasConAgua: 285,
      sistemaCloracion: true,
      ppmCloroResidual: 0.9,
      viviendasConSaneamiento: 240,
      tecnicoResponsable: 'Téc. Pedro Mateo (OMAS Santa Eulalia)',
      fechaLevantamiento: new Date('2024-02-10')
    },
    {
      codigo: 'ASH-2024-002',
      municipio: 'San Pedro Soloma',
      comunidad: 'Caserío El Triunfo',
      viviendasTotales: 180,
      viviendasConAgua: 165,
      sistemaCloracion: true,
      ppmCloroResidual: 1.1,
      viviendasConSaneamiento: 150,
      tecnicoResponsable: 'Ing. Juan Carlos Díaz (OMAS Soloma)',
      fechaLevantamiento: new Date('2024-02-12')
    },
    {
      codigo: 'ASH-2024-003',
      municipio: 'San Mateo Ixtatán',
      comunidad: 'Aldea Bulej',
      viviendasTotales: 420,
      viviendasConAgua: 210,
      sistemaCloracion: false,
      ppmCloroResidual: 0.0,
      viviendasConSaneamiento: 120,
      tecnicoResponsable: 'Téc. Mateo Francisco (OMAS San Mateo)',
      fechaLevantamiento: new Date('2024-02-15')
    },
    {
      codigo: 'ASH-2024-004',
      municipio: 'Barillas',
      comunidad: 'Aldea San Ramón',
      viviendasTotales: 510,
      viviendasConAgua: 390,
      sistemaCloracion: true,
      ppmCloroResidual: 0.4, // Alerta: Subclorado (<0.5 ppm)
      viviendasConSaneamiento: 310,
      tecnicoResponsable: 'Téc. Alberto Ramos (OMAS Barillas)',
      fechaLevantamiento: new Date('2024-02-18')
    },
    {
      codigo: 'ASH-2024-005',
      municipio: 'San Juan Ixcoy',
      comunidad: 'Caserío Buena Vista',
      viviendasTotales: 160,
      viviendasConAgua: 145,
      sistemaCloracion: true,
      ppmCloroResidual: 0.8,
      viviendasConSaneamiento: 130,
      tecnicoResponsable: 'Téc. Luis Mendoza (OMAS Ixcoy)',
      fechaLevantamiento: new Date('2024-02-22')
    }
  ];

  for (const c of censos) {
    await prisma.censoComunitarioASH.upsert({
      where: { codigo: c.codigo },
      update: {},
      create: c
    });
  }

  // 7. MÓDULO 7: TRANSPARENCIA (RF5)
  console.log('7. Sembrando Publicaciones para el Portal Ciudadano...');
  const publicaciones = [
    {
      codigo: 'PUB-2024-001',
      tipo: 'Proyecto',
      titulo: 'Avance Físico-Financiero de Proyectos Intermunicipales MFN 2024',
      resumen: 'Informe consolidado de ejecución de obras en los 6 municipios con financiamiento de cooperación y aportes locales.',
      referenciaId: 1,
      visibilidad: true,
      autorizadoPor: 'Gerencia Ejecutiva'
    },
    {
      codigo: 'PUB-2024-002',
      tipo: 'Acta',
      titulo: 'Acta No. 01-2024: Sesión Ordinaria de Asamblea General de Alcaldes',
      resumen: 'Acuerdos aprobados sobre el POA 2024, cuotas institucionales y priorización de inversión en agua y saneamiento.',
      referenciaId: 1,
      visibilidad: true,
      autorizadoPor: 'Junta Directiva'
    },
    {
      codigo: 'PUB-2024-003',
      tipo: 'Finanzas',
      titulo: 'Rendición de Cuentas: Estado de Ingresos y Egresos Primer Trimestre 2024',
      resumen: 'Detalle de cuotas ordinarias recibidas de las municipalidades y ejecución presupuestaria auditada.',
      referenciaId: null,
      visibilidad: true,
      autorizadoPor: 'Dirección Administrativa y Financiera'
    },
    {
      codigo: 'PUB-2024-004',
      tipo: 'Estadística',
      titulo: 'Diagnóstico Territorial ASH: Calidad de Agua y Niveles de Cloración Rural',
      resumen: 'Monitoreo de cloro residual en 1,610 hogares de comunidades de la región Norte de Huehuetenango.',
      referenciaId: null,
      visibilidad: true,
      autorizadoPor: 'Gerencia Ejecutiva'
    }
  ];

  for (const p of publicaciones) {
    await prisma.publicacionTransparencia.upsert({
      where: { codigo: p.codigo },
      update: {},
      create: p
    });
  }

  console.log('✅ Carga completa y exitosa de los 7 Módulos en Neon PostgreSQL!');
}

main()
  .catch((e) => {
    console.error('Error durante la siembra de módulos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
