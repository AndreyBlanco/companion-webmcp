export const SUBJECT_ID = 'vehicle_hyundai_accent_blue_2013';

export const records = [
  { id: 'r1', rawText: 'Inspección Visual y Olfativa Inicial del Área del Motor de un Hyundai Accent Blue 2013. Al levantar el cofre, el olor a combustible es sumamente penetrante. No se aprecian fugas visibles en las mangueras de alta presión ni en las conexiones del riel de inyectores. Se extrae la bayoneta de medición del aceite del motor. El nivel de aceite está notablemente por encima del nivel máximo y el fluido tiene una consistencia muy delgada. Al acercarlo, el aceite huele fuertemente a gasolina. Esto indica que el combustible está pasando directo a los cilindros y filtrándose hacia el cárter.' },
  { id: 'r2', rawText: 'Escaneo Electrónico de Diagnóstico. Conecto el escáner y abro el switch. El motor de arranque gira con buena velocidad, pero el motor no logra encender. Códigos de Falla P0172 Sistema demasiado rico, banco 1. P0300 y P0302 Fallo de encendido múltiple y cilindro 2 detectado.' },
  { id: 'r3', rawText: 'Pruebas de Presión y Retención de Combustible. Conecto el manómetro en la toma del riel de combustible. Abro el switch para que la bomba presurice el sistema. La presión sube instantáneamente a las 45 PSI que es la especificación de fábrica. Al cerrar el switch, la presión en el riel cae drásticamente a 0 PSI en menos de 5 segundos. Un sistema saludable debería mantener la presión por varios minutos. Como no hay fugas externas, el combustible se está desfogando hacia el interior de la cámara de combustión o regresando al tanque.' },
  { id: 'r4', rawText: 'Diagnóstico Físico de los Inyectores. Desmonto las bujías para revisar su estado físico. Bujías 1, 3 y 4: Salen secas, con depósitos normales de carbón. Bujía 2: Sale completamente empapada en gasolina viva. Desmonto el riel completo con los inyectores puestos y coloco recipientes debajo de cada uno. Al presurizar el sistema sin dar marcha, el inyector número 2 se queda completamente abierto, liberando un chorro continuo de gasolina en lugar de retenerla. Los inyectores 1, 3 y 4 se mantienen sellados y sin goteos.' }
];

export const questions = [
  { id: 'q1', mode: 'cold', text: '¿Qué aprendimos de extraer la bayoneta de aceite?' },
  { id: 'q2', mode: 'warm', text: '¿Qué evidencia tenemos de que hay exceso de combustible en el motor?' },
  { id: 'q3', mode: 'warm', text: '¿Cuál parece ser la causa principal de que el motor no encienda?' },
  { id: 'q4', mode: 'warm', text: '¿Qué pruebas posteriores confirmaron o refutaron la sospecha inicial de una fuga interna de combustible?' },
  { id: 'q5', mode: 'warm-negative-control', text: '¿Qué temperatura alcanzó el refrigerante durante las pruebas?' }
];

const findings = {
  r1: [
    ['fuel_odor_penetrating', 'assertion', 'observed', 'el olor a combustible es sumamente penetrante'],
    ['no_visible_external_leaks', 'assertion', 'observed', 'No se aprecian fugas visibles en las mangueras de alta presión ni en las conexiones del riel de inyectores'],
    ['oil_level_above_maximum', 'assertion', 'observed', 'El nivel de aceite está notablemente por encima del nivel máximo'],
    ['oil_consistency_very_thin', 'assertion', 'observed', 'el fluido tiene una consistencia muy delgada'],
    ['oil_smells_of_gasoline', 'assertion', 'observed', 'el aceite huele fuertemente a gasolina'],
    ['speaker_inference_fuel_to_cylinders_and_crankcase', 'inference', 'speaker_inference', 'Esto indica que el combustible está pasando directo a los cilindros y filtrándose hacia el cárter']
  ],
  r2: [
    ['starter_good_speed', 'assertion', 'observed', 'El motor de arranque gira con buena velocidad'],
    ['engine_no_start', 'assertion', 'observed', 'el motor no logra encender'],
    ['P0172_too_rich', 'assertion', 'reported', 'P0172 Sistema demasiado rico, banco 1'],
    ['P0300_multiple_misfire', 'assertion', 'reported', 'P0300'],
    ['P0302_cylinder_2_misfire', 'assertion', 'reported', 'P0302 Fallo de encendido múltiple y cilindro 2 detectado']
  ],
  r3: [
    ['pressure_45_psi_specification', 'assertion', 'measured', 'La presión sube instantáneamente a las 45 PSI que es la especificación de fábrica'],
    ['pressure_loss', 'assertion', 'measured', 'la presión en el riel cae drásticamente a 0 PSI en menos de 5 segundos'],
    ['healthy_retention_minutes', 'assertion', 'reported', 'Un sistema saludable debería mantener la presión por varios minutos'],
    ['no_external_leak_pressure_test', 'assertion', 'observed', 'no hay fugas externas'],
    ['internal_chamber_or_tank_alternatives', 'inference', 'speaker_inference', 'el combustible se está desfogando hacia el interior de la cámara de combustión o regresando al tanque']
  ],
  r4: [
    ['spark_plugs_1_3_4_dry_normal', 'assertion', 'observed', 'Bujías 1, 3 y 4: Salen secas, con depósitos normales de carbón'],
    ['spark_plug_2_soaked', 'assertion', 'observed', 'Bujía 2: Sale completamente empapada en gasolina viva'],
    ['injector_2_stuck_open', 'assertion', 'observed', 'el inyector número 2 se queda completamente abierto'],
    ['injector_2_continuous_flow', 'assertion', 'observed', 'liberando un chorro continuo de gasolina en lugar de retenerla'],
    ['injectors_1_3_4_sealed', 'assertion', 'observed', 'Los inyectores 1, 3 y 4 se mantienen sellados y sin goteos']
  ]
};

const compositions = { r1: [['abnormal_engine_oil_state', ['oil_level_above_maximum', 'oil_consistency_very_thin', 'oil_smells_of_gasoline']], ['internal_fuel_path', ['speaker_inference_fuel_to_cylinders_and_crankcase', 'no_visible_external_leaks']]], r2: [], r3: [['abnormal_pressure_retention', ['pressure_45_psi_specification', 'pressure_loss', 'healthy_retention_minutes']]], r4: [['abnormal_injector_2_behavior', ['injector_2_stuck_open', 'injector_2_continuous_flow']], ['injector_2_contrast', ['spark_plug_2_soaked', 'spark_plugs_1_3_4_dry_normal', 'injectors_1_3_4_sealed']]] };

export function dryIngest(record) {
  const subject = { id: SUBJECT_ID, type: 'concept', key: SUBJECT_ID, sourceRecordIds: [record.id] };
  const nodes = [subject]; const edges = [];
  for (const [key, type, provenance, quote] of findings[record.id]) {
    const predicateId = `predicate:${key}`; const itemId = `${record.id}:${key}`;
    nodes.push({ id: predicateId, type: 'concept', key, vocabularyRole: 'predicate', sourceRecordIds: [record.id] });
    nodes.push({ id: itemId, type, key, provenance, sourceRecordIds: [record.id], evidence: [{ recordId: record.id, quote }] });
    edges.push({ id: `${itemId}:about`, from: itemId, type: 'about', to: SUBJECT_ID });
    edges.push({ id: `${itemId}:predicate`, from: itemId, type: 'predicate', to: predicateId });
  }
  for (const [key, parts] of compositions[record.id]) {
    const id = `${record.id}:${key}`; nodes.push({ id, type: 'composition', key, provenance: 'system_inference', sourceRecordIds: [record.id] });
    for (const part of parts) edges.push({ id: `${id}:part:${part}`, from: id, type: 'composed_from', to: `${record.id}:${part}` });
  }
  return { nodes, edges };
}

export const needKeys = {
  q1: ['oil_level_above_maximum', 'oil_consistency_very_thin', 'oil_smells_of_gasoline', 'speaker_inference_fuel_to_cylinders_and_crankcase'],
  q2: ['oil_level_above_maximum', 'oil_smells_of_gasoline', 'P0172_too_rich', 'pressure_loss', 'spark_plug_2_soaked', 'injector_2_continuous_flow'],
  q3: ['engine_no_start', 'P0172_too_rich', 'P0302_cylinder_2_misfire', 'injector_2_stuck_open'],
  q4: ['speaker_inference_fuel_to_cylinders_and_crankcase', 'pressure_loss', 'spark_plug_2_soaked', 'injector_2_stuck_open'],
  q5: ['coolant_temperature']
};

export const answers = {
  q1: 'La bayoneta mostró tres observaciones: nivel por encima del máximo, consistencia muy delgada y olor fuerte a gasolina. El mecánico infirió —no observó directamente— que el combustible pasaba a los cilindros y al cárter.',
  q2: 'La evidencia acumulada incluye aceite alto y con olor a gasolina, el código reportado P0172 de mezcla rica, la caída medida de presión, la bujía 2 empapada y el flujo continuo observado del inyector 2.',
  q3: 'La causa principal parece ser el inyector 2 atascado abierto. La conclusión se apoya en que el motor no enciende, P0172, P0302 y la prueba física directa del inyector; la causa es una inferencia sustentada, no una observación anterior.',
  q4: 'La sospecha inicial surgió de la bayoneta. Después, la prueba de retención mostró caída a 0 PSI, la bujía 2 apareció empapada y la prueba del riel observó el inyector 2 abierto con flujo continuo. La sospecha quedó confirmada y localizada en el inyector 2.',
  q5: 'No hay evidencia disponible sobre la temperatura del refrigerante durante las pruebas.'
};
