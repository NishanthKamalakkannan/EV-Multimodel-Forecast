import { TrendingUp, Activity, Percent } from "lucide-react";

export default function MetricsCards({ metrics }) {
  if (!metrics) return null;

  const cards = [
    {
      label: "MAE",
      value: metrics.MAE,
      icon: Activity,
      description: "Mean Absolute Error",
      accent: "border-blue-500",
      iconColor: "text-blue-600",
    },
    {
      label: "RMSE",
      value: metrics.RMSE,
      icon: TrendingUp,
      description: "Root Mean Squared Error",
      accent: "border-purple-500",
      iconColor: "text-purple-600",
    },
    {
      label: "MAPE (%)",
      value: metrics.MAPE,
      icon: Percent,
      description: "Mean Absolute Percentage Error",
      accent: "border-emerald-500",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className={`relative rounded-xl bg-white border-l-4 ${card.accent}
              shadow-sm hover:shadow-lg transition-all duration-200`}
          >
            <div className="p-6 flex flex-col gap-4">
              
              {/* Top Row */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>

              {/* KPI Value */}
              <div className="text-4xl font-bold text-slate-900 leading-none">
                {Number(card.value).toFixed(2)}
              </div>

              {/* Description */}
              <p className="text-sm text-slate-500">
                {card.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
