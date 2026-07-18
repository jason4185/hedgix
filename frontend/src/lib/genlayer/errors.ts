export type HedgixMappedError = {
  code: string;
  title: string;
  description: string;
  action?: string;
  severity: "info" | "warning" | "error";
  retryable: boolean;
  message: string;
  raw: string;
};

export const CONTRACT_ERROR_CODES = [
  "INVALID_PREMIUM",
  "INVALID_AMOUNT",
  "INSUFFICIENT_POOL_CAPACITY",
  "UNSUPPORTED_ASSET",
  "UNSUPPORTED_PROTECTION_TYPE",
  "UNSUPPORTED_EVENT_LEVEL",
  "UNSUPPORTED_DURATION",
  "REGISTRY_FETCH_FAILED",
  "INVALID_REGISTRY_RESPONSE",
  "REGISTRY_TERMS_MISMATCH",
  "INVALID_TRIGGER_RULE",
  "DEPEG_REFERENCE_PRICE_AT_OR_BELOW_TRIGGER",
  "BINANCE_TICKER_FETCH_FAILED",
  "INVALID_BINANCE_TICKER_RESPONSE",
  "BINANCE_TICKER_PRICE_MISMATCH",
  "BINANCE_TICKER_PRICE_MISSING",
  "BINANCE_FETCH_FAILED",
  "BINANCE_KLINE_MISSING",
  "INVALID_BINANCE_RESPONSE",
  "NONDETERMINISTIC_RESULT_REJECTED",
  "CONTRACT_PAUSED",
  "DAILY_CANDLE_NOT_CLOSED",
  "SETTLEMENT_DATE_NOT_SEQUENTIAL",
  "SETTLEMENT_DATE_BEFORE_COVERAGE_START",
  "SETTLEMENT_DATE_AFTER_COVERAGE_END",
  "PROTECTION_NOT_TRIGGERED",
  "PAYOUT_ALREADY_PAID",
  "NO_RESERVED_PAYOUT",
  "INSUFFICIENT_POOL_BALANCE",
  "PROTECTION_NOT_FOUND",
  "NOT_PROTECTION_OWNER",
  "UNAUTHORIZED_SETTLEMENT_CALLER",
  "WITHDRAW_EXCEEDS_AVAILABLE_BALANCE",
  "RESERVED_LIABILITY_UNDERFLOW",
  "PROTECTION_NOT_ACTIVE",
  "STATE_CONFIRMATION_FAILED",
  "WALLET_NOT_CONNECTED",
  "ACTIVE_CONNECTOR_UNAVAILABLE",
  "WALLET_PROVIDER_UNAVAILABLE",
  "WALLET_PROVIDER_CHAIN_UNAVAILABLE",
  "WALLET_ACCOUNT_MISMATCH",
  "NO_INJECTED_WALLET",
  "USER_REJECTED",
  "WRONG_NETWORK",
  "CHAIN_SWITCH_REJECTED",
  "RPC_UNAVAILABLE",
  "REGISTRY_UNAVAILABLE",
  "CONTRACT_ADDRESS_MISSING",
  "CONTRACT_RESPONSE_PARSE_FAILED",
  "TRANSACTION_CANCELLED",
  "TRANSACTION_REJECTED",
  "TRANSACTION_REVERTED",
  "TRANSACTION_TIMEOUT",
  "TRANSACTION_UNDETERMINED",
  "TRANSACTION_HASH_MISSING",
  "TRANSACTION_EXECUTION_RESULT_MISSING",
  "FINISHED_WITH_ERROR",
  "CONTRACT_ADDRESS_NOT_CONFIGURED",
  "INSUFFICIENT_GEN",
  "WALLET_METHOD_UNSUPPORTED",
] as const;

type ErrorCopy = Omit<HedgixMappedError, "code" | "message" | "raw">;

const copies: Record<string, ErrorCopy> = {
  INVALID_PREMIUM: {
    title: "Premium amount does not match",
    description: "The wallet payment does not match the exact premium in the registry.",
    action: "Refresh the product terms and review the purchase again.",
    severity: "error",
    retryable: true,
  },
  INVALID_AMOUNT: {
    title: "Amount is invalid",
    description: "Enter a positive GEN amount with no more than 18 decimal places.",
    action: "Review the amount before submitting again.",
    severity: "error",
    retryable: false,
  },
  INSUFFICIENT_POOL_CAPACITY: {
    title: "Protection is temporarily unavailable",
    description:
      "The underwriting pool does not currently have enough available capacity to reserve this payout.",
    action: "Choose a lower payout level or try again after additional pool funds are available.",
    severity: "warning",
    retryable: true,
  },
  UNSUPPORTED_ASSET: {
    title: "Asset is not supported",
    description: "This asset is not supported by the current Hedgix registry.",
    action: "Choose one of the assets listed in the registry.",
    severity: "error",
    retryable: false,
  },
  UNSUPPORTED_PROTECTION_TYPE: {
    title: "Protection type is not supported",
    description: "This protection type is not supported by the current Hedgix registry.",
    action: "Select Price Drop Protection or Stablecoin Depeg Protection.",
    severity: "error",
    retryable: false,
  },
  UNSUPPORTED_EVENT_LEVEL: {
    title: "Event level is not supported",
    description: "This event level is not available for the selected product.",
    action: "Choose an event level shown in the registry.",
    severity: "error",
    retryable: false,
  },
  UNSUPPORTED_DURATION: {
    title: "Duration is not supported",
    description: "This coverage duration is not supported by the current registry.",
    action: "Choose 7, 14, or 30 days from the registry-backed options.",
    severity: "error",
    retryable: false,
  },
  REGISTRY_FETCH_FAILED: {
    title: "Product terms are temporarily unavailable",
    description: "The contract could not retrieve the official Hedgix registry.",
    action: "Existing protections remain accessible. Try the purchase again later.",
    severity: "warning",
    retryable: true,
  },
  REGISTRY_UNAVAILABLE: {
    title: "Product terms are temporarily unavailable",
    description: "Hedgix could not retrieve the official protection registry.",
    action: "Existing protections remain accessible, but new purchases are disabled.",
    severity: "warning",
    retryable: true,
  },
  INVALID_REGISTRY_RESPONSE: {
    title: "Registry response could not be validated",
    description: "The registry response did not match the contract’s expected schema.",
    action: "Do not submit a purchase until the registry is available and valid.",
    severity: "error",
    retryable: true,
  },
  REGISTRY_TERMS_MISMATCH: {
    title: "Registry terms changed before execution",
    description: "The selected product terms did not match the contract’s verification.",
    action: "Refresh the page and review the latest registry terms.",
    severity: "warning",
    retryable: true,
  },
  INVALID_TRIGGER_RULE: {
    title: "Trigger rule is invalid",
    description: "The selected trigger rule is not valid for this protection type.",
    action: "Choose another registry-backed event level.",
    severity: "error",
    retryable: false,
  },
  DEPEG_REFERENCE_PRICE_AT_OR_BELOW_TRIGGER: {
    title: "This protection cannot be opened at the selected threshold",
    description:
      "The stablecoin is already trading at or below the selected trigger level, so the contract cannot create new protection for this event level.",
    action: "Choose another event level or wait until the market price moves above the threshold.",
    severity: "warning",
    retryable: true,
  },
  BINANCE_TICKER_FETCH_FAILED: {
    title: "Market data is temporarily unavailable",
    description:
      "The contract could not retrieve the Binance ticker required to create this protection.",
    action: "No protection was created. Wait briefly and try again.",
    severity: "warning",
    retryable: true,
  },
  INVALID_BINANCE_TICKER_RESPONSE: {
    title: "Ticker response could not be validated",
    description: "Binance returned a ticker response the contract could not validate.",
    action: "Wait briefly and retry the action.",
    severity: "warning",
    retryable: true,
  },
  BINANCE_TICKER_PRICE_MISMATCH: {
    title: "Ticker symbol did not match",
    description: "The Binance ticker response did not match the requested market.",
    action: "Refresh the registry terms and retry.",
    severity: "error",
    retryable: true,
  },
  BINANCE_TICKER_PRICE_MISSING: {
    title: "Ticker price is missing",
    description: "The Binance ticker response did not include a usable price.",
    action: "Wait briefly and retry the purchase.",
    severity: "warning",
    retryable: true,
  },
  BINANCE_FETCH_FAILED: {
    title: "Market data is temporarily unavailable",
    description: "The contract could not fetch Binance market data.",
    action: "Try again when the Binance endpoint is reachable.",
    severity: "warning",
    retryable: true,
  },
  BINANCE_KLINE_MISSING: {
    title: "Daily market data is unavailable",
    description:
      "Binance did not return the required closed daily candle for this settlement date.",
    action: "Confirm that the expected candle is available, then try again.",
    severity: "warning",
    retryable: true,
  },
  INVALID_BINANCE_RESPONSE: {
    title: "Binance response could not be validated",
    description: "Binance returned a response the contract could not validate.",
    action: "Try again after the market-data endpoint is stable.",
    severity: "warning",
    retryable: true,
  },
  NONDETERMINISTIC_RESULT_REJECTED: {
    title: "Validator agreement was not reached",
    description: "GenLayer validators rejected the nondeterministic market-data result.",
    action: "Do not assume the action succeeded. Review the transaction and try again later.",
    severity: "error",
    retryable: true,
  },
  CONTRACT_PAUSED: {
    title: "Contract actions are temporarily paused",
    description: "New write actions are currently disabled by the contract owner.",
    action:
      "Existing policy information remains available. Try again after the contract is resumed.",
    severity: "warning",
    retryable: true,
  },
  DAILY_CANDLE_NOT_CLOSED: {
    title: "Settlement is not ready yet",
    description: "The required UTC daily candle is still open.",
    action: "Settlement will become available after the candle closes.",
    severity: "info",
    retryable: true,
  },
  SETTLEMENT_DATE_NOT_SEQUENTIAL: {
    title: "The next settlement date must be processed first",
    description: "This protection must be settled in chronological order.",
    action: "Use the expected settlement date shown by the contract.",
    severity: "warning",
    retryable: false,
  },
  SETTLEMENT_DATE_BEFORE_COVERAGE_START: {
    title: "Settlement date is before coverage",
    description: "The selected settlement date is before this protection’s coverage period.",
    action: "Use the expected settlement date returned by the contract.",
    severity: "error",
    retryable: false,
  },
  SETTLEMENT_DATE_AFTER_COVERAGE_END: {
    title: "Settlement date is after coverage",
    description: "The selected settlement date is after this protection’s coverage period.",
    action: "Use the expected settlement date returned by the contract.",
    severity: "error",
    retryable: false,
  },
  PROTECTION_NOT_TRIGGERED: {
    title: "Payout is not available",
    description: "This protection has not reached its trigger condition.",
    action: "Continue monitoring the policy’s settlement status.",
    severity: "info",
    retryable: false,
  },
  PAYOUT_ALREADY_PAID: {
    title: "Payout already claimed",
    description: "The payout for this protection has already been transferred.",
    severity: "info",
    retryable: false,
  },
  NO_RESERVED_PAYOUT: {
    title: "No reserved payout remains",
    description: "There is no reserved payout remaining for this policy.",
    action: "Review the policy status and financial terms.",
    severity: "warning",
    retryable: false,
  },
  INSUFFICIENT_POOL_BALANCE: {
    title: "Pool balance is insufficient",
    description: "The underwriting pool does not currently have enough balance for this payout.",
    action: "Do not retry until the pool has sufficient balance.",
    severity: "error",
    retryable: true,
  },
  PROTECTION_NOT_FOUND: {
    title: "Protection was not found",
    description: "The contract did not return a policy for this ID.",
    action: "Check the policy ID and connected wallet.",
    severity: "error",
    retryable: false,
  },
  NOT_PROTECTION_OWNER: {
    title: "Policyholder wallet required",
    description: "Only the policyholder can perform this action.",
    action: "Connect the wallet that owns this protection.",
    severity: "error",
    retryable: false,
  },
  UNAUTHORIZED_SETTLEMENT_CALLER: {
    title: "Settlement permission required",
    description: "Only the owner, settlement operator, or policyholder can settle this protection.",
    action: "Connect an authorized wallet.",
    severity: "error",
    retryable: false,
  },
  WITHDRAW_EXCEEDS_AVAILABLE_BALANCE: {
    title: "Withdrawal exceeds available balance",
    description: "The withdrawal exceeds the pool balance after reserved liability.",
    action: "Withdraw a lower whole-GEN amount.",
    severity: "error",
    retryable: false,
  },
  RESERVED_LIABILITY_UNDERFLOW: {
    title: "Reserved liability could not be released",
    description: "The contract detected inconsistent reserved-liability accounting.",
    action: "Do not retry automatically. Review the policy and pool status.",
    severity: "error",
    retryable: false,
  },
  PROTECTION_NOT_ACTIVE: {
    title: "This protection is not active",
    description: "Only active protections can be cancelled or settled.",
    action: "Refresh the policy and review its current status.",
    severity: "warning",
    retryable: true,
  },
  STATE_CONFIRMATION_FAILED: {
    title: "On-chain confirmation did not complete",
    description:
      "GenLayer accepted the transaction, but Hedgix could not confirm the expected contract state afterward.",
    action: "Refresh the policy or dashboard before submitting another transaction.",
    severity: "warning",
    retryable: true,
  },
  WALLET_NOT_CONNECTED: {
    title: "Connect your wallet",
    description: "Connect a supported wallet to submit contract actions.",
    action: "Connect a supported wallet and retry the action.",
    severity: "info",
    retryable: true,
  },
  ACTIVE_CONNECTOR_UNAVAILABLE: {
    title: "Wallet connector is unavailable",
    description: "Hedgix could not access the currently connected wallet connector.",
    action: "Reconnect your wallet, then submit the action again.",
    severity: "warning",
    retryable: true,
  },
  WALLET_PROVIDER_UNAVAILABLE: {
    title: "Wallet provider is unavailable",
    description: "The active wallet connector did not expose a usable signing provider.",
    action: "Reconnect your supported wallet before submitting this contract action.",
    severity: "warning",
    retryable: true,
  },
  WALLET_PROVIDER_CHAIN_UNAVAILABLE: {
    title: "Wallet network could not be verified",
    description: "The active wallet provider did not return a usable chain identifier.",
    action: "Check the wallet network and reconnect before submitting the action.",
    severity: "warning",
    retryable: true,
  },
  WALLET_ACCOUNT_MISMATCH: {
    title: "Wallet account changed",
    description:
      "The account shown in Hedgix does not match the account currently selected by the active wallet provider.",
    action: "Reconnect or switch back to the displayed account before submitting.",
    severity: "error",
    retryable: false,
  },
  NO_INJECTED_WALLET: {
    title: "No supported browser wallet detected",
    description: "Hedgix requires a supported wallet that can use custom EVM networks.",
    action: "Install a supported wallet, then reload the application.",
    severity: "warning",
    retryable: false,
  },
  USER_REJECTED: {
    title: "Transaction cancelled",
    description:
      "You declined the request in your wallet. No transaction was submitted and no GEN was transferred.",
    severity: "info",
    retryable: true,
  },
  WRONG_NETWORK: {
    title: "Switch to GenLayer Bradbury",
    description: "Hedgix is connected to a different network.",
    action: "Switch your wallet to GenLayer Bradbury to continue.",
    severity: "warning",
    retryable: true,
  },
  CHAIN_SWITCH_REJECTED: {
    title: "Network switch was cancelled",
    description: "The wallet did not switch to GenLayer Bradbury.",
    action: "Switch networks in your wallet and try again.",
    severity: "warning",
    retryable: true,
  },
  RPC_UNAVAILABLE: {
    title: "Bradbury RPC is unavailable",
    description: "The GenLayer RPC is unavailable or returned an unexpected response.",
    action: "Wait briefly and retry the read or transaction.",
    severity: "warning",
    retryable: true,
  },
  CONTRACT_ADDRESS_MISSING: {
    title: "Contract address is missing",
    description: "The deployed Hedgix contract address is not configured in this frontend.",
    action: "Set VITE_HEDGIX_CONTRACT_ADDRESS and restart the app.",
    severity: "error",
    retryable: false,
  },
  CONTRACT_ADDRESS_NOT_CONFIGURED: {
    title: "Contract address is missing",
    description: "The deployed Hedgix contract address is not configured in this frontend.",
    action: "Set VITE_HEDGIX_CONTRACT_ADDRESS and restart the app.",
    severity: "error",
    retryable: false,
  },
  CONTRACT_RESPONSE_PARSE_FAILED: {
    title: "Contract response could not be read",
    description: "Hedgix received a contract response that did not match the expected JSON shape.",
    action:
      "Refresh the page. If this persists, compare the deployed schema with the frontend types.",
    severity: "error",
    retryable: true,
  },
  TRANSACTION_CANCELLED: {
    title: "Transaction cancelled",
    description: "No transaction was submitted.",
    severity: "info",
    retryable: true,
  },
  TRANSACTION_REJECTED: {
    title: "Transaction was rejected",
    description: "The wallet or RPC rejected the transaction before Hedgix could track it.",
    action: "Review the wallet message before submitting again.",
    severity: "error",
    retryable: true,
  },
  TRANSACTION_REVERTED: {
    title: "Transaction reverted",
    description: "The contract rejected the submitted transaction.",
    action: "Review the contract error details before trying again.",
    severity: "error",
    retryable: true,
  },
  TRANSACTION_TIMEOUT: {
    title: "Transaction still being resolved",
    description: "GenLayer has not reached a final result yet.",
    action: "Do not submit the action again. Continue checking the existing transaction.",
    severity: "warning",
    retryable: true,
  },
  TRANSACTION_UNDETERMINED: {
    title: "Transaction result is undetermined",
    description: "GenLayer could not determine this transaction result.",
    action: "Do not resubmit automatically. Continue checking the existing transaction.",
    severity: "warning",
    retryable: true,
  },
  TRANSACTION_HASH_MISSING: {
    title: "Transaction hash was not returned",
    description:
      "The wallet or GenLayer SDK did not return a transaction identifier that Hedgix can track.",
    action: "Check your wallet activity before submitting again.",
    severity: "warning",
    retryable: true,
  },
  TRANSACTION_EXECUTION_RESULT_MISSING: {
    title: "Execution result is not available yet",
    description:
      "GenLayer returned a decided transaction status, but the execution result was not available in the response.",
    action: "Continue checking the transaction status before retrying.",
    severity: "warning",
    retryable: true,
  },
  FINISHED_WITH_ERROR: {
    title: "The contract execution did not complete",
    description: "Validator consensus was reached, but the contract execution ended with an error.",
    action: "Review the technical details before trying again.",
    severity: "error",
    retryable: true,
  },
  INSUFFICIENT_GEN: {
    title: "Not enough GEN",
    description: "The connected wallet does not have enough GEN for the premium and network fees.",
    action: "Add GEN to the wallet or choose a lower premium protection level.",
    severity: "warning",
    retryable: true,
  },
  WALLET_METHOD_UNSUPPORTED: {
    title: "Wallet method is not supported",
    description:
      "The connected wallet does not support one of the requested browser-wallet methods.",
    action: "Use a supported injected wallet on GenLayer Bradbury.",
    severity: "warning",
    retryable: true,
  },
};

function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, child) => {
        if (typeof child === "bigint") return child.toString();
        if (typeof child === "object" && child !== null) {
          if (seen.has(child)) return "[Circular]";
          seen.add(child);
        }
        return child;
      },
      2,
    );
  } catch {
    return String(value);
  }
}

function errorText(raw: unknown): string {
  if (raw instanceof Error) {
    const extended = raw as Error & {
      cause?: unknown;
      shortMessage?: string;
      details?: string;
      code?: string | number;
    };
    return [
      raw.name,
      raw.message,
      extended.shortMessage,
      extended.details,
      extended.code ? String(extended.code) : "",
      extended.cause ? errorText(extended.cause) : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (raw && typeof raw === "object") return safeStringify(raw);
  return String(raw);
}

export function extractErrorCode(raw: unknown): string {
  const text = errorText(raw);
  const userRejected = /user rejected|rejected request|denied transaction|\b4001\b/i.test(text);
  if (userRejected) return "USER_REJECTED";
  if (
    /insufficient funds|insufficient balance|exceeds the balance|not enough funds|not enough gen|insufficient gas|intrinsic gas/i.test(
      text,
    )
  ) {
    return "INSUFFICIENT_GEN";
  }
  if (/wallet_getSnaps|wallet_requestSnaps|method not supported|unsupported method/i.test(text)) {
    return "WALLET_METHOD_UNSUPPORTED";
  }
  if (/MetaMask is not installed/i.test(text)) return "NO_INJECTED_WALLET";
  if (/switch chain|wallet_addEthereumChain|wallet_switchEthereumChain/i.test(text)) {
    return "CHAIN_SWITCH_REJECTED";
  }
  if (/transaction reverted|execution reverted|revert/i.test(text)) return "TRANSACTION_REVERTED";
  if (/transaction rejected|nonce too low|replacement transaction underpriced/i.test(text)) {
    return "TRANSACTION_REJECTED";
  }
  if (/fetch failed|network error|failed to fetch|ECONNREFUSED|timeout|502|503|504/i.test(text)) {
    return "RPC_UNAVAILABLE";
  }
  return CONTRACT_ERROR_CODES.find((code) => text.includes(code)) ?? text;
}

export function mapHedgixError(raw: unknown): HedgixMappedError {
  const code = extractErrorCode(raw);
  const copy =
    copies[code] ??
    ({
      title: "Contract action failed",
      description: "The Hedgix contract action did not complete.",
      action: "Review the technical details before retrying.",
      severity: "error",
      retryable: true,
    } satisfies ErrorCopy);
  return {
    code,
    ...copy,
    message: copy.description,
    raw: errorText(raw),
  };
}
