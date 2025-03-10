import { useState, useEffect, useRef, useCallback } from "react";
import { CircleX } from "lucide-react";

interface InputWithBlanksProps {
  template: string;
  onValuesChange: (values: Record<string, string>) => void;
  onClose: () => void;
}

const InputWithBlanks = ({
  template,
  onValuesChange,
  onClose,
}: InputWithBlanksProps) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const inputsRef = useRef<HTMLInputElement[]>([]);
  const placeholders = useRef<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const matches = template.matchAll(/{(\w+)}/g);
    placeholders.current = Array.from(matches, (m) => m[1]);
    const initialValues = Object.fromEntries(
      placeholders.current.map((p) => [p, ""])
    );
    setInputValues(initialValues);
    onValuesChange(initialValues);
    setIsMounted(true); // Mark as mounted after initial setup
  }, [template]);

  useEffect(() => {
    if (isMounted && inputsRef.current.length > 0) {
      const firstInputIndex = template
        .split(/({\w+})/g)
        .findIndex((part) => part.match(/^{(\w+)}$/));
      if (inputsRef.current[firstInputIndex]) {
        inputsRef.current[firstInputIndex].focus();
      }
    }
  }, [isMounted, template]);

  const updateWidth = useCallback((input: HTMLInputElement) => {
    input.style.width = "90px";
    const span = document.createElement("span");
    span.textContent = input.value || input.placeholder;
    span.style.visibility = "hidden";
    span.style.whiteSpace = "pre";
    span.style.font = getComputedStyle(input).font;

    document.body.appendChild(span);
    const width = Math.max(span.offsetWidth + 20, 90);
    document.body.removeChild(span);

    input.style.width = `${width}px`;
  }, []);

  const handleChange = useCallback(
    (key: string, value: string) => {
      setInputValues((prev) => {
        const newValues = { ...prev, [key]: value };
        onValuesChange(newValues);
        return newValues;
      });
    },
    [onValuesChange]
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="p-4 border rounded-2xl relative">
      <div className="flex flex-wrap items-center gap-1">
        {template.split(/({\w+})/g).map((part, i) => {
          const match = part.match(/^{(\w+)}$/);
          if (!match)
            return (
              <span key={i} className="text-gray-700">
                {part}
              </span>
            );

          const key = match[1];
          return (
            <input
              key={`${key}-${i}`}
              ref={(el) => {
                if (el) {
                  inputsRef.current[i] = el;
                  updateWidth(el);
                }
              }}
              value={inputValues[key] || ""}
              onChange={(e) => {
                handleChange(key, e.target.value);
                updateWidth(e.target);
              }}
              placeholder={key}
              className="h-6 px-2 py-1 border-b-2 border-blue-400 rounded-md outline-none transition-all"
              onFocus={(e) => updateWidth(e.target)}
              style={{ minWidth: "90px" }}
            />
          );
        })}
      </div>
      <div className="absolute flex h-full top-0 right-3">
        <CircleX
          className="self-center text-red-500 cursor-pointer"
          onClick={onClose}
          size={20}
        />
      </div>
    </div>
  );
};

export default InputWithBlanks;
