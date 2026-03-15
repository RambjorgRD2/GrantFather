
import React from "react";

type StepIndicatorProps = {
  current: number;
  total: number;
  labels?: string[];
};

const StepIndicator: React.FC<StepIndicatorProps> = ({ current, total, labels }) => {
  return (
    <div className="flex items-center justify-center gap-3 mb-6" data-testid="step-indicator">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isComplete = step < current;

        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                isComplete ? "bg-primary text-primary-foreground border-primary" : "",
                isActive && !isComplete ? "border-primary text-primary active" : "",
                !isActive && !isComplete ? "border-muted-foreground/30 text-muted-foreground" : "",
              ].join(" ")}
              aria-current={isActive ? "step" : undefined}
              data-testid={`step-${step}`}
            >
              {step}
            </div>
            {labels?.[i] ? (
              <span
                className={[
                  "hidden text-sm md:inline-block",
                  isActive ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {labels[i]}
              </span>
            ) : null}
            {step < total ? (
              <div className="mx-1 h-px w-8 bg-muted md:w-16" aria-hidden="true" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
