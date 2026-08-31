const HYUNDAI = Object.freeze({ id: 'hyundai-accent-blue-2013', type: 'vehicle', label: 'Hyundai Accent Blue 2013' });
const normalized = (text) => text.toLocaleLowerCase();
const item = (id, kind, predicate, value, provenance, evidence, unit = null, condition = null) => ({ id, kind, subject: HYUNDAI.id, predicate, value, unit, condition, provenance, evidence });

export async function extractSyntheticDemo({ rawText, activeSubject }) {
  const text = normalized(rawText); const explicit = text.includes('hyundai accent blue 2013'); const compatible = activeSubject?.id === HYUNDAI.id && !text.includes('otro vehículo');
  if (!explicit && !compatible) return { subjectResolution: { status: 'ambiguous', subject: null, reason: 'The synthetic demo cannot resolve this input to exactly one subject.' }, items: [] };
  const items = [];
  if (text.includes('cilindro 2') && text.includes('chispa')) items.push(item('cylinder-2-spark', 'claim', 'spark_status', 'absent', 'observed', ['cilindro 2 no tiene chispa']));
  if (text.includes('12.4') && text.includes('volt')) items.push(item('battery-voltage', 'measurement', 'battery_voltage', 12.4, 'measured', ['12.4 voltios'], 'V', 'engine_off'));
  if (text.includes('bobina') && (text.includes('parece') || text.includes('creo'))) items.push(item('coil-hypothesis', 'hypothesis', 'probable_cause', 'ignition coil', 'speaker_inference', [rawText.match(/[^.]*bobina[^.]*/i)?.[0]?.trim() || 'bobina']));
  if (!items.length) items.push(item('identified-subject', 'entity', 'identified_as', HYUNDAI.label, 'reported', [explicit ? 'Hyundai Accent Blue 2013' : rawText]));
  return { subjectResolution: { status: explicit ? 'resolved' : 'probable', subject: HYUNDAI, reason: explicit ? 'The subject is explicitly named.' : 'The entry is compatible with the active synthetic subject.' }, items };
}

export async function selectSyntheticEvidence({ question, records, evidenceTypes }) {
  const query = normalized(question); const asksCompression = query.includes('compresión') || query.includes('compresion');
  const predicates = asksCompression ? [] : [...(query.includes('cilindro 2') || query.includes('chispa') ? ['spark_status'] : []), ...(query.includes('causa') || query.includes('bobina') ? ['probable_cause', 'spark_status'] : []), ...(query.includes('volt') || query.includes('batería') || query.includes('bateria') ? ['battery_voltage'] : [])];
  const recordIds = records.filter((record) => record.semanticItems.some((candidate) => predicates.includes(candidate.predicate) && (!evidenceTypes || evidenceTypes.includes(candidate.kind)))).map((record) => record.recordId);
  return { interpretation: asksCompression ? 'No compression-test evidence is present.' : 'Synthetic predicate-based evidence selection.', recordIds };
}

export const SYNTHETIC_DEMO_ENTRIES = Object.freeze(['Hyundai Accent Blue 2013: el cilindro 2 no tiene chispa.', 'La batería mide 12.4 voltios con el motor apagado.', 'Creo que la causa parece ser la bobina de encendido.']);
