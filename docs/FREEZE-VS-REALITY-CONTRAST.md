# Companion v0.1 — freeze vs. realidad

Fecha de contraste: 2026-09-02 (America/Costa_Rica)  
Repositorio principal: `release/webmcp-challenge` en `ff3e255` más cambios locales no integrados  
Repositorio de contraste: `experiment/adaptive-semantic-memory` en `bd2b1e8` más cambios locales no integrados

> Este documento conserva el diagnóstico anterior a la implementación del cierre dinámico. Para el estado candidato y las verificaciones posteriores, usar `docs/SUBMISSION-CLOSURE.md`.

## Alcance y criterio

Este informe ejecuta la misión del handoff `Companion_v0.1_Handoff_y_Architecture_Freeze.docx`: contrasta ADR-A/B/C e INV-01..12 contra código, pruebas, demo y requisitos oficiales. El documento se usa como fuente de requisitos arquitectónicos; el código y las pruebas determinan el estado real.

Estados:

- **IMPLEMENTED**: existe en la ruta candidata y tiene prueba proporcional.
- **PARTIAL**: existe una parte útil, pero falta una condición vinculante o integración.
- **MOCKED**: existe como fixture, dry-agent, harness o demostración no conectada al producto.
- **MISSING**: no se encontró implementación que satisfaga el contrato.

No se modificó la arquitectura ni el producto durante este contraste.

## Conclusión ejecutiva

El release candidate público demuestra bien el vertical slice de captura, confirmación explícita, memoria por sujeto, evidencia trazable y WebMCP. Sin embargo, **no implementa el freeze 3C completo**. En particular, el pipeline público ejecuta extracción antes de persistir la evidencia, no separa Stage A de Stage B, no conserva `candidateId` entre ambas etapas y no enruta `AGENT_INFERRED` fuera del grafo factual.

Lab B añade metamodelo, validación literal, vocabulary versionado, lookup determinista y recuperación incremental. Es evidencia útil, pero hoy es un **dry-agent no integrado** y tampoco implementa la clasificación epistemológica de ADR-A/B. Por tanto, el proyecto es defendible como submission WebMCP bajo las afirmaciones estrechas del README, pero no debe afirmar conformidad total con el handoff 3C.

El bloqueador externo más claro es documental/operativo: las reglas oficiales exigen video público de menos de tres minutos y campos de submission. No hay URL de video ni export/captura del formulario Devpost en las carpetas inspeccionadas.

## Matriz de contratos operativos

| Contrato del freeze | Principal / RC público | Carpeta HTTPS / laboratorio | Veredicto consolidado | Evidencia y gap |
|---|---|---|---|---|
| Entrada `subjectId + rawText` confirmado | La UI acepta `rawText`; el sujeto lo resuelve el adaptador y la confirmación ocurre después del draft | Los caminos experimentales aceptan texto y subject resolution; Lab B usa registros sintéticos prefijados | PARTIAL | `src/core/semantic-memory.js:46-60`; el contrato exacto de entrada no es el congelado |
| Persistir `rawText` antes de procesamiento semántico | `prepare()` propone solo el sujeto; `confirm()` guarda texto+sujeto con estado `processing` antes de llamar al builder | Lab B conserva evidencia adicional del dry ingestion | IMPLEMENTED en memoria de sesión | `src/core/semantic-memory.js`; la evidencia permanece con estado `failed` si el builder falla |
| Stage A produce nodos + `RelationCandidate` | No existe `RelationCandidate` ni `candidateId` | Dry ingestion produce nodos/aristas ya formados | MISSING | No hay contrato Stage A observable |
| Stage B clasifica cada candidato en tres estados | No existen `SOURCE_EXPLICIT`, `SOURCE_STRONGLY_IMPLIED`, `AGENT_INFERRED` | No aparecen en runtime ni pruebas del laboratorio | MISSING | Provenance humana (`observed`, `speaker_inference`, etc.) no sustituye grounding epistemológico |
| Supervivencia Stage A = Stage B | Sin candidate sets | Sin etapa B | MISSING | No hay prueba no-deletion ni correspondencia por `candidateId` |
| Validación mecánica de IDs, tipos, boundaries, evidencia, schema y routing | Valida kinds, provenance, subject resolution y presencia de evidence; filtra IDs de retrieval al sujeto | Lab B valida tipos, IDs de nodos, refs de edges y citas literales | PARTIAL | `src/core/semantic-memory.js:17-34,62-69`; `src/lab-b/index.js:21-41`. Faltan boundaries/candidate survival/status/routing en producto |
| `sourceEvidence` literal dentro de `rawText` | Se exige evidence no vacío, pero no se comprueba substring literal | `validateIngestion` sí exige `record.rawText.includes(evidence.quote)` y tiene prueba negativa | PARTIAL / MOCKED | `tests/lab-b.test.js:15-19`; falta promover el hard gate a la ruta pública |
| Solo source-grounded persiste factual | Todo item validado del draft se persiste; no existe status epistemológico | Lab B mezcla assertions/inferences en el mismo grafo | MISSING | Riesgo de contradicción con ADR-B e INV-03/04/05/11 |
| `AGENT_INFERRED` se enruta a capa externa | No existe capa/routing | Los nodos `inference` permanecen en el mismo grafo | MISSING | El schema persistente puede seguir diferido, pero la separación conceptual debe demostrarse |
| Lookup determinista por vocabulary IDs | El RC selecciona registros mediante adaptador determinista basado en pregunta/predicados, no por IDs solicitados | Lab B proyecta vocabulary y ejecuta NeedPackage determinista por keys/IDs | PARTIAL / MOCKED | `src/lab-b/index.js:54-125`; no está expuesto por el WebMCP público |
| Agente externo planifica retrieval y evalúa suficiencia | El payload no contiene `answer`, lo cual preserva la responsabilidad del agente; Companion todavía recibe `question` y selecciona evidencia | `planQuestion` y warm context simulan necesidades faltantes con fixtures | PARTIAL / MOCKED | ADR-C está respetado en espíritu, no en el contrato `relevantVocabularyIds` + loop externo real |
| Misma capability interna para app y WebMCP | `registerWebMcp` delega directamente a `capabilities.queryMemory` | También hay harnesses experimentales | IMPLEMENTED | `src/webmcp/register.js:21-28`; prueba en `tests/semantic-memory.test.js:56-60` |
| Confirmación explícita antes de memoria semántica | Draft separado, token single-use y `confirmed: true` obligatorio; texto y sujeto son editables | Cubierto también por experimentos | IMPLEMENTED | `src/core/semantic-memory.js`; el Builder recibe el sujeto ya confirmado y no lo resuelve de nuevo |
| Filtro por sujeto antes de selección/modelo | `store.bySubject(subjectId)` precede `selectEvidence` | Cubierto por experimentos | IMPLEMENTED | `src/core/semantic-memory.js:62-69` y pruebas positivas/negativas |

## ADR e invariantes

| Decisión / grupo | Estado | Lectura |
|---|---|---|
| ADR-A — discovery separado de classification | MISSING | No hay dos etapas ni contrato de candidatos; no debe presentarse como implementado |
| ADR-B — frontera factual/inferencia externa | MISSING | `speaker_inference` preserva lo dicho por el humano, pero no hay status para inferencias nuevas del agente ni routing separado |
| ADR-C — retrieval del agente + lookup determinista | PARTIAL | El agente conserva la síntesis final y Lab B demuestra lookup incremental, pero el tool público todavía hace selección desde una pregunta libre |
| INV-01 raw authoritative | IMPLEMENTED | `rawText` exacto se conserva en el record y vuelve en retrieval |
| INV-02 raw persisted before semantic processing | MISSING | `extract()` corre antes de cualquier save |
| INV-03 AI output not automatically factual | PARTIAL | Requiere confirmación humana, pero después todo item se guarda sin clasificación epistemológica |
| INV-04 inferred never silently factual | MISSING | No hay enforcement de `AGENT_INFERRED` |
| INV-05 fact vs generated knowledge distinguishable | MISSING | Provenance disponible no modela la frontera Stage B |
| INV-06 Entry boundaries traceable | PARTIAL | `sourceRecordId` enlaza items al record; Lab B reutiliza nodos entre records y agrega `sourceRecordIds`, pero no existe `SemanticEntry` congelada |
| INV-07 persistent IDs belong to Companion | PARTIAL | El core crea record IDs; IDs semánticos proceden del adaptador/model output |
| INV-08 deterministic mechanical validation | PARTIAL | Buena base en Lab B, incompleta en el producto |
| INV-09 retrieval planning belongs to agent | PARTIAL | Sí para respuesta/síntesis; no completamente para selección inicial |
| INV-10 no AI for deterministic lookup | IMPLEMENTED en demo / MOCKED en Lab B | El demo usa selector determinista; Lab B replay es determinista |
| INV-11 candidate graph != factual graph | MISSING | No existe candidate graph separado |
| INV-12 semantic vs epistemic evaluation separate | MISSING | No hay métricas/tests separados por ambas dimensiones |

## Requisitos oficiales de la hackathon

Fuentes consultadas el 2026-09-02:

- OpenAI: <https://openai.com/webmcp-challenge/>
- Reglas oficiales Devpost: <https://webmcp.devpost.com/rules>

| Requisito | Estado observado | Evidencia / acción |
|---|---|---|
| Web app impulsada por WebMCP | IMPLEMENTED | Tool real `query_companion_memory` y registro con `document.modelContext.registerTool` |
| URL viva accesible a jueces | DOCUMENTED / evidencia histórica PASS | README y release evidence apuntan a `https://companion-webmcp-challenge.netlify.app`; conviene revalidar inmediatamente antes de submit |
| Repositorio público con código, assets e instrucciones | DOCUMENTED | URL GitHub, README y build dependency-free presentes |
| Licencia open source visible | PARTIAL | `LICENSE` MIT existe; no se verificó que GitHub la muestre en el bloque About como exigen las reglas |
| Descripción: fit WebMCP, UX, colaboración humano-agente e implementación | SUBSTANTIALLY PRESENT | README cubre los cuatro temas; debe copiarse/adaptarse al formulario Devpost |
| Video YouTube público, con audio, demo clara, menos de 3 minutos | NOT EVALUATED / probable MISSING | No se encontró URL, guion final, archivo ni evidencia de carga en ambas carpetas |
| App funciona como se representa en texto/video | PARTIAL | Test/build pasan; falta contraste contra el video final, que no está disponible |
| Si era preexistente, distinguir trabajo previo y extensión WebMCP durante el período | PARTIAL | Historial y release evidence existen, pero falta una narrativa de submission que marque fechas y cambios elegibles |
| Originalidad, derechos y licencias de terceros | PARTIAL | Fixtures se declaran sintéticos y no hay paquetes; falta confirmación humana final sobre propiedad de todo material del video/submission |
| Deadline | EXTERNAL FACT | 2026-09-03 13:00 PDT (2026-09-03 14:00 en Costa Rica) |

## Gates del repositorio (evidencia actual)

Comandos ejecutados con el runtime empaquetado de Node 24:

- Principal: `node --test` → **15/15 PASS**; `pnpm run check` → **PASS**; `node scripts/build.js` → **PASS**.
- HTTPS: `node --test` → **30/30 PASS**; `pnpm run check` → **PASS**; `node scripts/build.js` → **PASS**.

Estado de hard gates:

| Gate | Estado defendible ahora | Limitación |
|---|---|---|
| HG-01 Fidelity | PASS para el RC estrecho; NOT EVALUATED para 3C completo | Las pruebas preservan raw/evidence y ausencia; no prueban Stage A/B |
| HG-02 Low friction | Evidencia histórica mixta; no elevar sin el reporte final | `SPRINT-EVIDENCE.md` contiene un FAIL inicial y evidencia posterior; requiere decidir cuál ensayo es autoritativo |
| HG-03 WebMCP viability | PASS para el commit RC `ff3e255` | La prueba local actual pasa; la evidencia de navegador público es histórica y debe revalidarse para el submit final |
| HG-04 Publishable isolation | PASS histórico para `ff3e255`; NOT EVALUATED para el árbol actual | El árbol principal está sucio y Lab B está sin trackear; el scan encontró solo placeholders/terminología esperada, pero no se hizo clean-checkout del estado no committeado |

## Gaps que bloquean o ponen en riesgo el delivery

### P0 — antes de submission

1. Obtener/verificar el enlace del video YouTube público (<3 min, audio, funcionamiento y WebMCP visibles).
2. Obtener un export/captura o checklist de los campos Devpost para confirmar que descripción, URL viva, repo, licencia y credenciales opcionales están completos.
3. Revalidar desde un navegador compatible la URL pública, discovery e invocation contra el mismo commit que se vaya a presentar.
4. Congelar qué commit se somete. El RC publicado es `ff3e255`; el árbol actual incluye Lab B no committeado y cambios de README/package.
5. Evitar afirmar cumplimiento de ADR-A/B. Presentar el RC como vertical slice confirmado y Lab B, si se menciona, como experimento dry-agent.

### P0 arquitectónico solo si se exige conformidad con el handoff 3C

1. Introducir persistencia raw-first anterior al Builder y una prueba de fallo del Builder sin pérdida de evidencia.
2. Implementar contratos explícitos Stage A y Stage B con `candidateId` y prueba de no-deletion.
3. Validar evidencia literal en la ruta pública.
4. Separar y enrutar `AGENT_INFERRED` fuera de memoria factual, aun con schema provisional.
5. Exponer lookup por vocabulary IDs/NeedPackage reutilizando capability interna y dejar la suficiencia al agente externo.

Estos cambios son mayores que un cierre de submission de un día. Bajo las reglas de reapertura del propio freeze, solo deben intentarse ahora si la demo/submission afirma o requiere el pipeline 3C; las reglas oficiales no lo exigen.

### P1 — fortalece la evaluación, no bloquea elegibilidad

1. Convertir la historia del README en texto Devpost centrado en WebMCP Leverage, Execution, Potential Impact y Creativity & Ambition.
2. Resolver la discrepancia HG-02 con una conclusión única y evidencia comparable.
3. Documentar exactamente qué trabajo ocurrió dentro del período de la hackathon.
4. Añadir un documento breve de demo runbook con positivo, negativo y payload sin `answer`.

## Camino mínimo recomendado

1. **Congelar submission en el RC público** (`ff3e255`) salvo que exista una razón verificable para promover cambios actuales.
2. **Cerrar materiales externos**: video, formulario Devpost, About/license y URLs.
3. **Ejecutar smoke test final** en live URL: carga, tres confirmaciones, discovery, invocation, positivo, negativo, ausencia de `answer`.
4. **Alinear claims**: vertical slice WebMCP auditable, no implementación completa de 3C ni production readiness.
5. **Mover el cierre 3C a post-hackathon**, manteniendo como P0 de integridad raw-first, Stage A/B, no-deletion y inference routing.

## Documentación adicional necesaria

No hace falta otra documentación arquitectónica para completar el contraste técnico. Sí faltan, para cerrar el contraste de submission:

1. URL o archivo del **video final**.
2. Export, captura o contenido actual del **draft de Devpost**.
3. Identidad exacta del **commit/URL desplegado** que se presentará si ya no es `ff3e255`.
4. Confirmación del participante sobre **elegibilidad, propiedad de materiales y trabajo previo vs. trabajo realizado durante el período**; son hechos que no pueden inferirse del código.

Sin esos cuatro elementos puede cerrarse la auditoría técnica, pero no declarar que la submission completa cumple todas las reglas oficiales.
