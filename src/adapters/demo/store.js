export class InMemoryObservationStore {
  #records = [];

  async save(record) {
    this.#records.push(structuredClone(record));
    return structuredClone(record);
  }

  async bySubject(subjectId) {
    return this.#records
      .filter((record) => record.subject.id === subjectId)
      .map((record) => structuredClone(record));
  }

  async count() {
    return this.#records.length;
  }
}
