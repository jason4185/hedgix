export function sameAddress(left?: string | null, right?: string | null): boolean {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

export function isOwner(address?: string | null, owner?: string | null): boolean {
  return sameAddress(address, owner);
}

export function isSettlementOperator(address?: string | null, operator?: string | null): boolean {
  return sameAddress(address, operator);
}
