import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Lock, ArrowUpDown, Loader2 } from "lucide-react";
import { useWallet, useWalletTransactions } from "@/hooks/useWallet";

const formatKES = (amount: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);

const txTypeLabel: Record<string, string> = {
  credit: "Credit", debit: "Debit",
  escrow_hold: "Escrow Hold", escrow_release: "Escrow Release",
};
const txTypeColor: Record<string, string> = {
  credit: "bg-green-100 text-green-800", debit: "bg-red-100 text-red-800",
  escrow_hold: "bg-yellow-100 text-yellow-800", escrow_release: "bg-blue-100 text-blue-800",
};

export function WalletCard() {
  const { data: wallet, isLoading } = useWallet();
  const { data: transactions } = useWalletTransactions(wallet?.id);

  if (isLoading) return <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>;
  if (!wallet) return <Card><CardContent className="py-8 text-center text-muted-foreground">No wallet found. Please contact support.</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Available Balance</p><p className="text-2xl font-bold">{formatKES(Number(wallet.balance))}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100"><Lock className="h-5 w-5 text-yellow-700" /></div>
            <div><p className="text-sm text-muted-foreground">Locked (Escrow)</p><p className="text-2xl font-bold">{formatKES(Number(wallet.locked_balance))}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary"><ArrowUpDown className="h-5 w-5 text-secondary-foreground" /></div>
            <div><p className="text-sm text-muted-foreground">Total Balance</p><p className="text-2xl font-bold">{formatKES(Number(wallet.balance) + Number(wallet.locked_balance))}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Transaction History</CardTitle></CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge className={txTypeColor[tx.transaction_type] || ""} variant="secondary">
                      {txTypeLabel[tx.transaction_type] || tx.transaction_type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{tx.description || "Transaction"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <p className={`font-semibold ${tx.transaction_type === "credit" || tx.transaction_type === "escrow_release" ? "text-green-600" : "text-red-600"}`}>
                    {tx.transaction_type === "credit" || tx.transaction_type === "escrow_release" ? "+" : "-"}{formatKES(Number(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
