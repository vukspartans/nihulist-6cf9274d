import { useState, useEffect, memo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  image: string;
  quote: string;
}

interface OptimizedTestimonialsProps {
  testimonials: Testimonial[];
}

const OptimizedTestimonials = memo(({ testimonials }: OptimizedTestimonialsProps) => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const nextTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const prevTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  // Auto-advance testimonials
  useEffect(() => {
    if (testimonials.length <= 1) return;

    const interval = setInterval(nextTestimonial, 5000);
    return () => clearInterval(interval);
  }, [nextTestimonial, testimonials.length]);

  if (testimonials.length === 0) {
    return null;
  }

  const currentTestimonialData = testimonials[currentTestimonial];

  return (
    <div className="bg-white/5 rounded-3xl p-8 lg:p-12 max-w-4xl mx-auto relative">
      <div className="flex justify-center mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
        ))}
      </div>
      
      <blockquote className="text-xl lg:text-2xl text-white/90 text-center leading-relaxed mb-8 min-h-[120px] flex items-center justify-center">
        "{currentTestimonialData.quote}"
      </blockquote>
      
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="text-4xl">{currentTestimonialData.image}</div>
        <div className="text-center">
          <div className="font-bold text-white text-lg">
            {currentTestimonialData.name}
          </div>
          <div className="text-white/70">
            {currentTestimonialData.role} • {currentTestimonialData.company}
          </div>
        </div>
      </div>

      {testimonials.length > 1 && (
        <>
          {/* Navigation buttons */}
          <div className="flex justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevTestimonial}
              className="text-white hover:bg-white/10"
              aria-label="עדות קודמת"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextTestimonial}
              className="text-white hover:bg-white/10"
              aria-label="עדות הבאה"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentTestimonial 
                    ? 'bg-white w-8' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`מעבר לעדות ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
});

OptimizedTestimonials.displayName = "OptimizedTestimonials";

export default OptimizedTestimonials;