import Particles, { initParticlesEngine } from "@tsparticles/react";
import { useEffect, useMemo, useState } from "react";
import { loadSlim } from "@tsparticles/slim";
import { useTheme } from "../../context/ThemeContext";

const Background = () => {
  const [init, setInit] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const options = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: { value: "transparent" } },
      fpsLimit: 60,
      interactivity: { events: {}, modes: {} },
      particles: {
        color: { value: isDark ? "#94a3b8" : "#10b981" },
        links: {
          color: isDark ? "#475569" : "#94a3b8",
          distance: 150,
          enable: true,
          opacity: isDark ? 0.35 : 0.25,
          width: 1,
        },
        move: {
          enable: true,
          direction: "none",
          outModes: { default: "bounce" },
          random: false,
          speed: 1.5,
          straight: false,
        },
        number: { value: 50, density: { enable: true } },
        opacity: { value: 0.4 },
        shape: { type: "circle" },
        size: { value: { min: 1, max: 3 } },
      },
      detectRetina: true,
    }),
    [isDark]
  );

  if (!init) return null;

  return (
    <Particles
      id="tsparticles"
      options={options}
      className="pointer-events-none absolute inset-0"
    />
  );
};

export default Background;
