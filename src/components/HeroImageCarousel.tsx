import { useState, useEffect, memo } from "react";

interface HeroImageCarouselProps {
  images: string[];
  className?: string;
}

const HeroImageCarousel = memo(({ images, className }: HeroImageCarouselProps) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Auto-switch images only if there are multiple images
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [images.length]);

  // Preload images for smooth transitions
  useEffect(() => {
    if (images.length === 0) return;

    const imagePromises = images.map((src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });
    });

    Promise.all(imagePromises)
      .then(() => setIsLoaded(true))
      .catch(() => setIsLoaded(true)); // Still show content even if some images fail
  }, [images]);

  if (images.length === 0) {
    return (
      <div className={className}>
        <div className="text-4xl sm:text-6xl lg:text-7xl animate-pulse">👨‍💼📱</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <img 
        src={images[currentImage]} 
        alt="מומחה בנייה ונדל״ן עם האפליקציה"
        className={`w-full h-full object-cover transition-all duration-1000 ease-in-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transform: currentImage % 2 === 0 ? 'scale(1)' : 'scale(1.05)',
        }}
        loading="eager" // Prioritize hero image loading
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent"></div>
      
      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-tech-purple/20">
          <div className="text-4xl sm:text-6xl lg:text-7xl animate-pulse">👨‍💼📱</div>
        </div>
      )}
    </div>
  );
});

HeroImageCarousel.displayName = "HeroImageCarousel";

export default HeroImageCarousel;