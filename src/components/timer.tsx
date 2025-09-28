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
  }, [isRunning, displayTime]);
  
  // Форматируем время для отображения
  const formattedTime = React.useMemo(() => {
    const minutes = Math.floor(displayTime / 60);
    const secs = displayTime % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
    </div>
  );
});

// Для предотвращения предупреждений React
TimerDisplay.displayName = "TimerDisplay";

export const Timer: React.FC<TimerProps> = ({ seconds, isRunning, isPause }) => {
  // Добавляем хук для принудительного обновления компонента
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  
  // Добавляем эффект для обновления прогресс-бара каждую секунду
  React.useEffect(() => {
    if (!isRunning) return;
    
    // Обновляем прогресс-бар каждую секунду для плавной анимации
    const interval = setInterval(() => {
      // Принудительно обновляем компонент для плавной анимации
      // Это не влияет на состояние в контексте, только на визуальное отображение
      forceUpdate({});
    }, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [isRunning]);
  
  // Просто возвращаем мемоизированный компонент
  return <TimerDisplay seconds={seconds} isRunning={isRunning} isPause={isPause} />;
};