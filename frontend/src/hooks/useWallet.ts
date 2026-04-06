import { useQuery } from "@tanstack/react-query";
import { walletApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

export function useWallet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: () => walletApi.get(),
    enabled: !!user,
  });
}

export function useWalletTransactions(walletId: string | undefined) {
  return useQuery({
    queryKey: ["wallet-transactions", walletId],
    queryFn: () => walletApi.transactions(),
    enabled: !!walletId,
  });
}
