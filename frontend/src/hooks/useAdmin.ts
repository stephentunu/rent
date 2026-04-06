import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const res = await adminApi.isAdmin();
      return res.isAdmin;
    },
    enabled: !!user,
  });
}

export function useAdminProfiles() {
  return useQuery({ queryKey: ["admin-profiles"], queryFn: () => adminApi.profiles() });
}

export function useAdminAgents() {
  return useQuery({ queryKey: ["admin-agents"], queryFn: () => adminApi.agents() });
}

export function useAdminProperties() {
  return useQuery({ queryKey: ["admin-properties"], queryFn: () => adminApi.properties() });
}

export function useAdminPayments() {
  return useQuery({ queryKey: ["admin-payments"], queryFn: () => adminApi.payments() });
}

export function useAdminInquiries() {
  return useQuery({ queryKey: ["admin-inquiries"], queryFn: () => adminApi.inquiries() });
}

export function useAdminUserRoles() {
  return useQuery({ queryKey: ["admin-user-roles"], queryFn: () => adminApi.userRoles() });
}

export function useAdminWallets() {
  return useQuery({ queryKey: ["admin-wallets"], queryFn: () => adminApi.wallets() });
}

export function useAdminWalletTransactions() {
  return useQuery({ queryKey: ["admin-wallet-transactions"], queryFn: () => adminApi.walletTransactions() });
}

export function useAdminCommissionConfig() {
  return useQuery({ queryKey: ["admin-commission-config"], queryFn: () => adminApi.commissionConfig() });
}
