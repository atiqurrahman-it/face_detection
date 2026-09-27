import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import Background from "../../backgorund/backgorun";
import Nav from "../../navbar/navbar";

const CAPABILITIES = [
  {
    icon: "🎯",
    title: "Face & Emotion Recognition Engine",
    description:
      "Real-time detection matches faces against records the moment a photo comes in.",
  },
  {
    icon: "🗂️",
    title: "Criminal Records Management",
    description:
      "Full case records with status, arresting officer, and multi-angle photos per record.",
  },
  {
    icon: "🏢",
    title: "Role-Based Station Network",
    description:
      "Super admins manage stations; station admins and officers see only their own station's cases.",
  },
  {
    icon: "🔒",
    title: "Secure Evidence Photos",
    description:
      "Uploaded photos are stored per record and served only to authenticated, authorized users.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Capture or upload a face",
    description: "From a live webcam feed or a single uploaded photo.",
  },
  {
    step: "2",
    title: "The engine matches it",
    description: "Faces are located and classified against the detection model.",
  },
  {
    step: "3",
    title: "It lands in the case record",
    description: "Matches and context attach to the right station's criminal record.",
  },
];

const HomePage = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) {
    return <Navigate to={user.role === "super_admin" ? "/admin" : "/station"} replace />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <Background />
      <div className="relative z-10">
        <Nav />
        <main className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-20 pt-16 text-center sm:pt-24">
          <span className="mb-4 inline-block rounded-full bg-emerald-500/10 px-4 py-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Facial Recognition for Law Enforcement
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            <span className="text-emerald-500">ArgusID</span> watches so your
            station doesn't have to
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Facial recognition and case records for police stations — match
            faces to records in seconds, and keep every station's data
            scoped to the people who are cleared to see it.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              to="/login"
              className="rounded-xl bg-emerald-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              Sign in to your station
            </Link>
          </div>

          <div className="mt-20 grid w-full gap-6 sm:grid-cols-2">
            {CAPABILITIES.map((capability) => (
              <div
                key={capability.title}
                className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-left shadow-sm backdrop-blur transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="mb-3 text-3xl">{capability.icon}</div>
                <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
                  {capability.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-20 w-full text-left">
            <h2 className="mb-8 text-center text-2xl font-bold text-slate-900 dark:text-white">
              How it works
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {STEPS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 w-full rounded-2xl border border-slate-200 bg-white/80 p-8 text-left dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
              Security & compliance
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              JWT-authenticated sign-in, role-based access for super admins,
              station admins, and officers, and per-station data scoping keep
              every station's records visible only to the people cleared to
              see them.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
