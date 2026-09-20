import { Link } from "react-router-dom";
import Background from "../../backgorund/backgorun";
import Nav from "../../navbar/navbar";

const FEATURES = [
  {
    icon: "📷",
    title: "Live Face Detection",
    description:
      "Detect faces and emotions in real time straight from your webcam.",
  },
  {
    icon: "🖼️",
    title: "Image Upload",
    description:
      "Upload any photo and instantly see the detected emotion breakdown.",
  },
  {
    icon: "⚡",
    title: "Fast & Accurate",
    description:
      "Powered by a CNN model trained on facial expression data.",
  },
];

const HomePage = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <Background />
      <div className="relative z-10">
        <Nav />
        <main className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-20 pt-16 text-center sm:pt-24">
          <span className="mb-4 inline-block rounded-full bg-emerald-500/10 px-4 py-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            AI-Powered Emotion Recognition
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            Welcome to <span className="text-emerald-500">Emotion Detection</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Real-time face and emotion recognition, right in your browser.
            Try it live with your webcam or upload a photo to see it in
            action.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              to="/face-detection"
              className="rounded-xl bg-emerald-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              Try Live Detection
            </Link>
            <Link
              to="/input-image"
              className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-base font-semibold text-slate-800 shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              Upload an Image
            </Link>
          </div>

          <div className="mt-20 grid w-full gap-6 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-left shadow-sm backdrop-blur transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="mb-3 text-3xl">{feature.icon}</div>
                <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
