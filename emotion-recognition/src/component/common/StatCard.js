import Card from "./Card";

export default function StatCard({ label, value }) {
  return (
    <Card>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
    </Card>
  );
}
