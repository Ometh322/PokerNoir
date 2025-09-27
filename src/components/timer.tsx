import React from "react";
import { Card } from "@heroui/react";

interface TimerProps {
  seconds: number;
  isRunning: boolean;
  isPause?: boolean;
}

// Создаем отдельный компонент таймера, который не будет перерисовывать весь интерфейс
const TimerDisplay = React.memo(({ seconds, isRunning, isPause }: { 
  seconds: number; 
  isRunning: boolean;
  isPause?: boolean;
}) => {
  // Используем useRef для хранения предыдущего значения секунд
  const prevSecondsRef = React.useRef(seconds);
  const [displayTime, setDisplayTime] = React.useState(seconds);
  
  // Обновляем локальное время при изменении входящего значения
  React.useEffect(() => {
    // Обновляем только если разница больше 1 секунды или таймер остановлен
    if (Math.abs(seconds - prevSecondsRef.current) > 1 || !isRunning) {
      setDisplayTime(seconds);
      prevSecondsRef.current = seconds;
    }
  }, [seconds, isRunning]);
  
  // Запускаем локальный таймер для плавного отображения
  React.useEffect(() => {
    if (!isRunning) return;
    
    let lastUpdateTime = Date.now();
    let accumulatedTime = 0;
    let animationFrameId: number;
    
    const updateDisplay = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTime;
      lastUpdateTime = now;
      
      accumulatedTime += deltaTime;
      
      // Обновляем отображение только когда накопилась 1 секунда
      if (accumulatedTime >= 1000) {
        const secondsToSubtract = Math.floor(accumulatedTime / 1000);
        accumulatedTime %= 1000;
        
        setDisplayTime(prev => Math.max(0, prev - secondsToSubtract));
        prevSecondsRef.current = displayTime - secondsToSubtract;
      }
      
      animationFrameId = requestAnimationFrame(updateDisplay);
    };
    
    animationFrameId = requestAnimationFrame(updateDisplay);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRunning]);
  
  // Форматируем время для отображения
  const formattedTime = React.useMemo(() => {
    const minutes = Math.floor(displayTime / 60);
    const secs = displayTime % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, [displayTime]);
  
  // Определяем цвет прогресс-бара
  const progressColor = React.useMemo(() => {
    if (isPause) return "bg-secondary";
    if (displayTime <= 60) return "bg-danger";
    if (displayTime <= 180) return "bg-warning";
    return "bg-success";
  }, [displayTime, isPause]);
  
  // Вычисляем ширину прогресс-бара
  const progressWidth = React.useMemo(() => {
    return `${(displayTime % 60) / 60 * 100}%`;
  }, [displayTime]);
  
  return (
    <div className="relative">
      <Card className={`bg-content2 border-none shadow-none ${isPause ? "bg-secondary/10" : ""}`}>
        <div className="flex items-center justify-center h-40 md:h-48 lg:h-56">
          <div className={`text-6xl md:text-7xl lg:text-8xl font-bold timer-text ${
            isRunning ? (isPause ? 'text-secondary' : 'text-primary') : 'text-default-600'
          }`}>
            {formattedTime}
          </div>
        </div>
      </Card>
      <div className="h-2 lg:h-3 w-full bg-default-100 absolute bottom-0 left-0 right-0">
        <div 
          className={`h-full ${progressColor} transition-all duration-1000 ease-linear`}
          style={{ width: progressWidth }}
        />
      </div>
    </div>
  );
});

// Для предотвращения предупреждений React
TimerDisplay.displayName = "TimerDisplay";

export const Timer: React.FC<TimerProps> = ({ seconds, isRunning, isPause }) => {
  // Просто возвращаем мемоизированный компонент
  return <TimerDisplay seconds={seconds} isRunning={isRunning} isPause={isPause} />;
};