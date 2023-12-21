export default class OhWaitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OhWaitError';
  }
}