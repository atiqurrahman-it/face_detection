const EMOTION_META = {
  Angry: { emoji: "😠", bar: "bg-rose-500" },
  Disgust: { emoji: "🤢", bar: "bg-lime-600" },
  Fear: { emoji: "😨", bar: "bg-purple-500" },
  Happy: { emoji: "😄", bar: "bg-amber-400" },
  Neutral: { emoji: "😐", bar: "bg-slate-400" },
  Sad: { emoji: "😢", bar: "bg-blue-500" },
  Surprise: { emoji: "😲", bar: "bg-pink-500" },
};

const EmotionBreakdown = ({ emotion, percentage, predictions, hint }) => {
  const entries = predictions
    ? Object.entries(predictions)
        .map(([name, value]) => [name, Math.round(value * 100)])
        .sort((a, b) => b[1] - a[1])
    : [];

  const topMeta = EMOTION_META[emotion] || { emoji: "🤔", bar: "bg-emerald-500" };

  return (
    <div className="w-full max-w-sm shrink-0 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-3xl">
          {topMeta.emoji}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Detected Emotion
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {emotion} <span className="text-emerald-500">{percentage}%</span>
          </p>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map(([name, value]) => (
            <div key={name}>
              <div className="mb-1 flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>
                  {EMOTION_META[name]?.emoji} {name}
                </span>
                <span>{value}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    EMOTION_META[name]?.bar || "bg-emerald-500"
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {hint || "No face detected yet."}
        </p>
      )}
    </div>
  );
};

export default EmotionBreakdown;
