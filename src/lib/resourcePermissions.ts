export function canEditRepositoryResource(userId: string | undefined, creatorId: string | null, canEditAll: boolean): boolean {
  return Boolean(userId && (canEditAll || creatorId === userId));
}

export function withoutResourceCreator<T extends { created_by: string | null }>(payload: T): Omit<T, 'created_by'> {
  const { created_by: _creator, ...editable } = payload;
  return editable;
}