import { parseEther } from "viem";
import { explorerAddressUrl, explorerTransactionUrl } from "@/config/chains";

const GEN_WEI = 1_000_000_000_000_000_000n;

export function decimalGenToWei(value: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("INVALID_AMOUNT");
  }
  const wei = parseEther(trimmed);
  if (wei <= 0n) {
    throw new Error("INVALID_AMOUNT");
  }
  return wei;
}

export function wholeGenToContractArg(value: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("INVALID_AMOUNT");
  }
  const amount = BigInt(trimmed);
  if (amount <= 0n) {
    throw new Error("INVALID_AMOUNT");
  }
  return amount;
}

export function weiToGenText(value: string | bigint | undefined): string {
  if (value === undefined || value === "") return "0 GEN";
  try {
    const wei = typeof value === "bigint" ? value : BigInt(value);
    const whole = wei / GEN_WEI;
    const fraction = wei % GEN_WEI;
    if (fraction === 0n) return `${whole} GEN`;
    return `${whole}.${fraction.toString().padStart(18, "0").replace(/0+$/, "")} GEN`;
  } catch {
    return `${String(value)} wei`;
  }
}

export function formatAddress(address?: string): string {
  if (!address) return "Not connected";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function txUrl(hash: string): string {
  return explorerTransactionUrl(hash);
}

export function addressUrl(address: string): string {
  return explorerAddressUrl(address);
}
