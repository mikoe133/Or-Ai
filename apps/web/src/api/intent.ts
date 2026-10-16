export class MutationIntent {
  private key = "";
  private id = "";
  for<T extends object>(fields: T): T & { requestId: string } {
    const key = JSON.stringify(fields);
    if (key !== this.key || !this.id) {
      this.key = key;
      this.id = crypto.randomUUID();
    }
    return { ...fields, requestId: this.id };
  }
  reset() {
    this.key = "";
    this.id = "";
  }
}
