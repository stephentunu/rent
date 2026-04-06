import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { paymentsApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, CreditCard } from "lucide-react";

interface MpesaPaymentProps {
  propertyId: string;
  propertyTitle: string;
  amount: number;
}

export function MpesaPayment({ propertyId, propertyTitle, amount }: MpesaPaymentProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");

  const formatPhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) cleaned = "254" + cleaned.substring(1);
    if (!cleaned.startsWith("254")) cleaned = "254" + cleaned;
    return cleaned;
  };

  const handlePayment = async () => {
    if (!user) { toast({ title: "Please sign in to make a payment", variant: "destructive" }); return; }
    if (!phone || phone.length < 9) { toast({ title: "Please enter a valid phone number", variant: "destructive" }); return; }

    setIsProcessing(true);
    setPaymentStatus("pending");

    try {
      const data = await paymentsApi.stkPush({
        phone: formatPhone(phone),
        amount: Math.ceil(amount),
        propertyId,
        accountReference: `RENT-${propertyId.slice(0, 8)}`,
      });

      if (data?.success) {
        toast({ title: "STK Push Sent!", description: "Check your phone and enter your M-Pesa PIN to complete the payment." });
        setPaymentStatus("success");
      } else {
        throw new Error(data?.message || "Failed to initiate payment");
      }
    } catch (err: any) {
      toast({ title: "Payment Failed", description: err.message || "Failed to initiate M-Pesa payment", variant: "destructive" });
      setPaymentStatus("failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(price);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPaymentStatus("idle"); }}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="default">
          <CreditCard className="mr-2 h-4 w-4" />
          Pay with M-Pesa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>M-Pesa Payment</DialogTitle>
          <DialogDescription>Pay for &quot;{propertyTitle}&quot; via M-Pesa STK Push</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold text-primary">{formatPrice(amount)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="mpesa-phone" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" disabled={isProcessing} />
            </div>
            <p className="text-xs text-muted-foreground">Enter the phone number registered with M-Pesa</p>
          </div>
          {paymentStatus === "success" && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
              ✅ STK Push sent! Check your phone and enter your M-Pesa PIN.
            </div>
          )}
          {paymentStatus === "failed" && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              ❌ Payment initiation failed. Please try again.
            </div>
          )}
          <Button onClick={handlePayment} disabled={isProcessing || !phone} className="w-full">
            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : <><CreditCard className="mr-2 h-4 w-4" />Pay {formatPrice(amount)}</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
