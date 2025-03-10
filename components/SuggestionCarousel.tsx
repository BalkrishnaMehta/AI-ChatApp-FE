import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const SuggestionCarousel = ({
  suggestedTasks,
  handleSuggestionClick,
}: {
  suggestedTasks: { title: string; description: string; example: string }[];
  handleSuggestionClick: (content: string) => void;
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    checkScrollability();
    window.addEventListener("resize", checkScrollability);
    return () => window.removeEventListener("resize", checkScrollability);
  }, [suggestedTasks]);

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth;
      const scrollAmount =
        direction === "left" ? -containerWidth : containerWidth;

      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });

      const animationDuration = 500;
      setTimeout(checkScrollability, animationDuration);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center relative">
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 z-10 bg-gray-400 p-2 rounded-full text-white"
            aria-label="Scroll left">
            <ArrowLeft size={24} />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide gap-3"
          onScroll={checkScrollability}>
          {suggestedTasks.map((task) => (
            <div
              key={task.title}
              className="flex-shrink-0 w-fit p-4 bg-gray-100 rounded-xl hover:bg-gray-200 cursor-pointer"
              onClick={() => handleSuggestionClick(task.example)}>
              <h3 className="font-medium text-gray-900 truncate">
                {task.title}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {task.description}
              </p>
            </div>
          ))}
        </div>

        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 z-10 bg-gray-400 p-2 rounded-full text-white"
            aria-label="Scroll right">
            <ArrowRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SuggestionCarousel;
