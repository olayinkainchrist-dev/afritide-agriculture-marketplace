"use client";
import { useEffect, useState, useRef } from "react";

const IMAGES = [
  "/images/hero/agriculture-01.webp",
  "/images/hero/agriculture-02.webp",
  "/images/hero/agriculture-03.webp",
  "/images/hero/agriculture-04.webp",
  "/images/hero/agriculture-05.webp",
  "/images/hero/agriculture-06.webp",
];

const INTERVAL  = 9000;  // ms each image shows
const FADE_TIME = 1500;  // ms crossfade duration

export default function HeroSlideshow() {
  const [current,  setCurrent]  = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [fading,   setFading]   = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced) return;

    timerRef.current = setInterval(() => {
      setCurrent(prev => {
        setPrevious(prev);
        setFading(true);
        setTimeout(() => {
          setPrevious(null);
          setFading(false);
        }, FADE_TIME);
        return (prev + 1) % IMAGES.length;
      });
    }, INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [prefersReduced]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Previous image — fades out */}
      {previous !== null && (
        <div
          key={`prev-${previous}`}
          className="absolute inset-0"
          style={{
            opacity:    fading ? 0 : 1,
            transition: `opacity ${FADE_TIME}ms ease-in-out`,
          }}>
          <img
            src={IMAGES[previous]}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            style={{ animation: "none" }}
          />
        </div>
      )}

      {/* Current image — fades in + Ken Burns */}
      <div
        key={`curr-${current}`}
        className="absolute inset-0"
        style={{
          opacity:    fading ? 0 : 1,
          transition: `opacity ${FADE_TIME}ms ease-in-out`,
        }}>
        <img
          src={IMAGES[current]}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{
            animation: prefersReduced
              ? "none"
              : `kenburns ${INTERVAL}ms ease-out forwards`,
          }}
        />
      </div>

      {/* Dark gradient overlay — reduced for better image visibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060f08]/55 via-[#060f08]/40 to-[#060f08]/65" />
      <div className="absolute inset-0 bg-[#060f08]/20" />

      {/* Ken Burns keyframes */}
      <style>{`
        @keyframes kenburns {
          from { transform: scale(1.00); }
          to   { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}