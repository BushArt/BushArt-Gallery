let indexesVerified = false;

export function setIndexesVerified(): void {
  indexesVerified = true;
}

export function areIndexesVerified(): boolean {
  return indexesVerified;
}
