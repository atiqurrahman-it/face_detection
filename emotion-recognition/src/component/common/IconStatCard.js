import Card from "./Card";

const TINTS = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
};

export default function IconStatCard({ icon: Icon, label, value, tint = "blue" }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TINTS[tint]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </Card>
  );
}
