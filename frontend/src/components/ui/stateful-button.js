import React, { useState, useRef } from "react";
import { cn } from "../../lib/utils";

const Button = React.forwardRef(
  ({ className, onClick, children, ...props }, ref) => {
    const [buttonState, setButtonState] = useState("idle");
    const promiseRef = useRef(null);

    const handleClick = async (e) => {
      if (buttonState !== "idle") return;

      setButtonState("loading");

      try {
        if (onClick) {
          const result = onClick(e);
          if (result instanceof Promise) {
            promiseRef.current = result;
            await result;
          }
        }
        setButtonState("success");

        // Reset to idle after showing success state
        setTimeout(() => setButtonState("idle"), 2000);
      } catch (error) {
        console.error("Button action failed:", error);
        setButtonState("error");
        setTimeout(() => setButtonState("idle"), 2000);
      }
    };

    const handleCancel = (e) => {
      e.stopPropagation(); // Prevent the main button click from firing
      if (buttonState === "loading") {
        // Clean up any ongoing matchmaking
        if (window.matchmakingCleanup) {
          window.matchmakingCleanup();
          delete window.matchmakingCleanup;
        }
        setButtonState("idle");
      }
    };

    const getButtonContent = () => {
      switch (buttonState) {
        case "loading":
          return (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Searching opponent...</span>
              <span
                onClick={handleCancel}
                className="ml-2 text-xs underline hover:no-underline cursor-pointer"
              >
                Cancel
              </span>
            </div>
          );
        case "success":
          return (
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Matched!</span>
            </div>
          );
        case "error":
          return (
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Error - Try Again</span>
            </div>
          );
        default:
          return children;
      }
    };

    const getButtonStyles = () => {
      switch (buttonState) {
        case "loading":
          return "bg-blue-400";
        case "success":
          return "bg-green-500 hover:bg-green-600";
        case "error":
          return "bg-red-500 hover:bg-red-600";
        default:
          return "bg-blue-500 hover:bg-blue-600";
      }
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 text-white min-w-[200px]",
          getButtonStyles(),
          className
        )}
        onClick={handleClick}
        disabled={buttonState === "loading" ? false : buttonState !== "idle"}
        {...props}
      >
        {getButtonContent()}
      </button>
    );
  }
);

Button.displayName = "StatefulButton";

export { Button };
