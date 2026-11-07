import { useEffect } from "react";
import gsap from "gsap";

export function RoomAtmosphere({ phase }: { phase: string }) {
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          ".app-page .intro",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45, clearProps: "all" },
        );
        gsap.to(".room-orbit", {
          rotation: 360,
          duration: 100,
          repeat: -1,
          ease: "none",
        });
        gsap.to(".room-paper", {
          y: -18,
          duration: 6,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      });
      return () => context.revert();
    });
    media.add(
      "(prefers-reduced-motion: no-preference) and (pointer: fine)",
      () => {
        const moveX = gsap.quickTo(".room-orbit", "x", { duration: 1.2 });
        const moveY = gsap.quickTo(".room-orbit", "y", { duration: 1.2 });
        function move(event: PointerEvent) {
          moveX((event.clientX / innerWidth - 0.5) * 20);
          moveY((event.clientY / innerHeight - 0.5) * 20);
        }
        window.addEventListener("pointermove", move, { passive: true });
        return () => window.removeEventListener("pointermove", move);
      },
    );
    return () => media.revert();
  }, [phase]);
  return (
    <div className="room-atmosphere" aria-hidden="true">
      <div className="room-orbit">
        <i />
        <i />
        <i />
      </div>
      <div className="room-paper" />
    </div>
  );
}
