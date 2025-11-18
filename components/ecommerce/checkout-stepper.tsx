interface CheckoutStepperProps {
  steps: string[];
  currentStep: number;
}

export function CheckoutStepper({ steps, currentStep }: CheckoutStepperProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                i < currentStep
                  ? "bg-green-500 text-white"
                  : i === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <div className="flex-1 px-4">
              <p className={`text-sm font-medium ${i === currentStep ? "text-primary" : "text-muted-foreground"}`}>
                {step}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-1 w-12 ${i < currentStep ? "bg-green-500" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
