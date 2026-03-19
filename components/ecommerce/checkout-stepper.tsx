interface CheckoutStepperProps {
  steps: string[];
  currentStep: number;
}

export function CheckoutStepper({ steps, currentStep }: CheckoutStepperProps) {
  return (
    <div className="mb-8 overflow-hidden">
      <div className="flex items-center w-full">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 ${
                  i < currentStep
                    ? "bg-green-500 text-white"
                    : i === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < currentStep ? "✓" : i + 1}
              </div>
              {/* Optional label below circle for very small screens if we wanted, 
                  but let's try keeping them side-by-side with less padding first */}
            </div>

            {/* Step Label */}
            <div className={`px-2 sm:px-4 flex-shrink-0 ${i !== currentStep ? "hidden sm:block" : "block"}`}>
              <p className={`text-[10px] sm:text-sm font-medium whitespace-nowrap ${i === currentStep ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {step}
              </p>
            </div>

            {/* Connector Line */}
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 sm:h-1 flex-1 mx-1 sm:mx-2 ${i < currentStep ? "bg-green-500" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
