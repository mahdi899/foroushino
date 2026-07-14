export class FamilyApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'FamilyApiError';
    this.status = status;
  }
}
