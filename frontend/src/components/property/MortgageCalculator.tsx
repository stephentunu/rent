import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator } from "lucide-react";

interface MortgageCalculatorProps {
  defaultPrice: number;
}

export function MortgageCalculator({ defaultPrice }: MortgageCalculatorProps) {
  const [price, setPrice] = useState(defaultPrice);
  const [deposit, setDeposit] = useState(20);
  const [rate, setRate] = useState(14);
  const [years, setYears] = useState(20);

  const loanAmount = price * (1 - deposit / 100);
  const monthlyRate = rate / 100 / 12;
  const numPayments = years * 12;
  const monthly = monthlyRate === 0 ? loanAmount / numPayments
    : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const totalPaid = monthly * numPayments;
  const totalInterest = totalPaid - loanAmount;

  const fmt = (n: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Mortgage Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Property Price</Label>
          <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <Label>Deposit</Label>
            <span className="font-medium text-primary">{deposit}% ({fmt(price * deposit / 100)})</span>
          </div>
          <Slider value={[deposit]} onValueChange={v => setDeposit(v[0])} min={5} max={50} step={1} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <Label>Interest Rate</Label>
            <span className="font-medium text-primary">{rate}% p.a.</span>
          </div>
          <Slider value={[rate]} onValueChange={v => setRate(v[0])} min={5} max={25} step={0.5} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <Label>Loan Term</Label>
            <span className="font-medium text-primary">{years} years</span>
          </div>
          <Slider value={[years]} onValueChange={v => setYears(v[0])} min={5} max={30} step={1} />
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Loan Amount</p>
            <p className="font-semibold">{fmt(loanAmount)}</p>
          </div>
          <div className="flex justify-between items-center border-t pt-3">
            <p className="text-sm font-medium">Monthly Payment</p>
            <p className="text-2xl font-bold text-primary">{fmt(monthly)}</p>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Total Interest</span>
            <span>{fmt(totalInterest)}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Total Paid</span>
            <span>{fmt(totalPaid)}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">* Estimate only. Consult a financial advisor for accurate figures.</p>
      </CardContent>
    </Card>
  );
}
