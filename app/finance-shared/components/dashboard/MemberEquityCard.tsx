import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils' // Asumo que tienes esto
import { SharedMember } from '@/types/finance-shared'
import { cn } from '@/lib/utils'

export function MemberEquityCard({ member }: { member: SharedMember }) {
  const equity = member.current_equity || 0
  const isPositive = equity >= 0

  return (
    <Card className={cn(
      "transition-all",
      !isPositive && "border-red-200 bg-red-50/30"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>{member.name}</span>
          <span className={cn(
            "text-base font-bold",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(equity)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span>Aportado:</span>
            <span className="font-medium text-foreground">
              {formatCurrency((member as any).total_paid || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Gastado:</span>
            <span className="font-medium text-foreground">
              {formatCurrency((member as any).total_consumed || 0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}