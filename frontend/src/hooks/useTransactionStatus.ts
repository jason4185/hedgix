import { useQuery } from "@tanstack/react-query";
import type { Hash } from "genlayer-js/types";
import { createHedgixReadClient } from "@/lib/genlayer/client";
import { assertAcceptedExecution } from "@/lib/genlayer/transactions";
import type { GenLayerReceiptResult } from "@/lib/genlayer/types";

export function useTransactionStatus(hash?: Hash) {
  return useQuery({
    queryKey: ["genlayer-transaction", hash],
    queryFn: async () => {
      if (!hash) throw new Error("TRANSACTION_HASH_MISSING");
      const client = createHedgixReadClient();
      const receipt = (await client.getTransaction({ hash })) as GenLayerReceiptResult;
      return {
        receipt,
        successfulExecution: Boolean(assertAcceptedExecution(receipt)),
      };
    },
    enabled: Boolean(hash),
    refetchInterval: (query) => {
      const status = query.state.data?.receipt.statusName ?? query.state.data?.receipt.status;
      return status === "ACCEPTED" || status === "FINALIZED" ? false : 3000;
    },
    retry: 1,
  });
}
