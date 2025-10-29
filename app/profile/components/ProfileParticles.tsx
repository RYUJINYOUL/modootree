'use client';

import { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

export default function ProfileParticles() {
  const particlesInit = useCallback(async (engine: any) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      className="fixed inset-0 z-0"
      init={particlesInit}
      options={{
        fpsLimit: 60,
        particles: {
          color: {
            value: "#3b82f6"
          },
          links: {
            color: "#3b82f6",
            distance: 200,
            enable: true,
            opacity: 0.05,
            width: 1
          },
          move: {
            enable: true,
            speed: 0.3,
            direction: "none",
            random: false,
            straight: false,
            outModes: "out"
          },
          number: {
            density: {
              enable: true,
              area: 1000
            },
            value: 50
          },
          opacity: {
            value: 0.05,
            animation: {
              enable: false
            }
          },
          size: {
            value: 1,
            animation: {
              enable: false
            }
          },
          shape: {
            type: "circle"
          }
        },
        detectRetina: true,
        background: {
          color: "transparent"
        }
      }}
    />
  );
}
