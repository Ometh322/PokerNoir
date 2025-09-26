import React from "react";
import { Card } from "@heroui/react";

interface TimerProps {
  seconds: number;
  isRunning: boolean;
  isPause?: boolean;
}

export const Timer: React.FC<TimerProps> = ({ seconds, isRunning, isPause = false }) => {
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate percentage of time remaining for progress bar
  const getProgressColor = () => {
    if (isPause) return "bg-secondary";
    if (seconds <= 60) return "bg-danger";
    if (seconds <= 180) return "bg-warning";
    return "bg-success";
  };

  return (
    <div className="relative">
      <Card className={`bg-content2 border-none shadow-none ${isPause ? "bg-secondary/10" : ""}`}>
        <div className="flex items-center justify-center h-32">
          <div className={`text-5xl font-bold timer-text ${isRunning ? (isPause ? 'text-secondary' : 'text-primary') : 'text-default-600'}`}>
            {formatTime(seconds)}
          </div>
        </div>
      </Card>
      <div className="h-1 w-full bg-default-100 absolute bottom-0 left-0 right-0">
        <div 
          className={`h-full ${getProgressColor()} transition-all duration-1000 ease-linear`}
          style={{ width: `${(seconds % 60) / 60 * 100}%` }}
        />
      </div>
    </div>
  );
};