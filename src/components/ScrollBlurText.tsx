import { useEffect, useRef, useState } from "react";

const ScrollBlurText = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const sentence1 = "Outpost sorts your emails so you know what needs attention now and what can wait.";
  const sentence2 = "It remembers what you promised to others. It also keeps track of what others promised you.";

  const words1 = sentence1.split(" ");
  const words2 = sentence2.split(" ");
  const totalWords = words1.length + words2.length;

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;
      
      // Calculate how far we've scrolled through the container
      const scrollStart = viewportHeight;
      const scrollEnd = containerHeight - viewportHeight;
      const scrolled = -rect.top;
      
      const rawProgress = (scrolled - 0) / (scrollEnd - scrollStart + viewportHeight);
      const clampedProgress = Math.max(0, Math.min(1, rawProgress));
      
      setProgress(clampedProgress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Phase 1: 0-50% scroll for first sentence
  const getSentence1WordBlur = (wordIndex: number) => {
    const phase1Progress = Math.min(progress * 2, 1); // Map 0-0.5 to 0-1
    const wordProgress = phase1Progress * words1.length;
    const diff = wordIndex - wordProgress;
    
    if (diff <= -1) return 0;
    if (diff >= 1) return 8;
    return Math.max(0, diff + 1) * 8;
  };

  // Phase 2: 50-100% scroll for second sentence
  const getSentence2WordBlur = (wordIndex: number) => {
    if (progress < 0.5) return 8; // Fully blurred until phase 2
    const phase2Progress = (progress - 0.5) * 2; // Map 0.5-1 to 0-1
    const wordProgress = phase2Progress * words2.length;
    const diff = wordIndex - wordProgress;
    
    if (diff <= -1) return 0;
    if (diff >= 1) return 8;
    return Math.max(0, diff + 1) * 8;
  };

  const sentence2Opacity = progress < 0.5 ? 0 : Math.min((progress - 0.5) * 4, 1);

  return (
    <div ref={containerRef} className="relative min-h-[calc(100vh+400px)]">
      <div className="sticky top-0 h-screen flex items-center justify-center -translate-y-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="font-ubuntu text-3xl md:text-4xl font-medium text-black leading-relaxed">
            <p className="mb-4">
            <span
              className="inline-block transition-[filter] duration-300 ease-out"
              style={{ filter: `blur(${getSentence1WordBlur(0)}px)` }}
            >
              "
            </span>
            {words1.map((word, index) => (
              <span
                key={index}
                className="inline-block transition-[filter] duration-300 ease-out"
                style={{ filter: `blur(${getSentence1WordBlur(index)}px)` }}
              >
                {word}
                {index < words1.length - 1 ? "\u00A0" : ""}
              </span>
            ))}
            <span
              className="inline-block transition-[filter] duration-300 ease-out"
              style={{ filter: `blur(${getSentence1WordBlur(words1.length - 1)}px)` }}
            >
              "
            </span>
          </p>
          <p
            className="transition-opacity duration-300 ease-out"
            style={{ opacity: sentence2Opacity }}
          >
            <em>
              <span
                className="inline-block transition-[filter] duration-300 ease-out"
                style={{ filter: `blur(${getSentence2WordBlur(0)}px)` }}
              >
                "
              </span>
              {words2.map((word, index) => (
                <span
                  key={index}
                  className="inline-block transition-[filter] duration-300 ease-out"
                  style={{ filter: `blur(${getSentence2WordBlur(index)}px)` }}
                >
                  {word}
                  {index < words2.length - 1 ? "\u00A0" : ""}
                </span>
              ))}
              <span
                className="inline-block transition-[filter] duration-300 ease-out"
                style={{ filter: `blur(${getSentence2WordBlur(words2.length - 1)}px)` }}
              >
                "
              </span>
            </em>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollBlurText;
