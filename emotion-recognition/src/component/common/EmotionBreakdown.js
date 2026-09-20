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
  const hasResult = Boolean(predictions);
  const topMeta = EMOTION_META[emotion] || { emoji: "🤔", bar: "bg-emerald-500" };

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-lg backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-2xl">
          {topMeta.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Detected Emotion
          </p>
          <p className="truncate text-xl font-bold text-slate-900 dark:text-white">
            {emotion} <span className="text-emerald-500">{percentage}%</span>
          </p>
        </div>
      </div>

      {hasResult ? (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${topMeta.bar}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {hint || "No face detected yet."}
        </p>
      )}
    </div>
  );
};

export default EmotionBreakdown;
