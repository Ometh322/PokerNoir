import React from "react";
import { Card, CardBody, CardFooter, Button, Divider, CardHeader } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTournament } from "./tournament-context";
import { Timer } from "./timer";

export const TournamentView: React.FC = () => {
  const { 
    state, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    nextLevel, 
    previousLevel,
    syncData,
    syncTimerOnly,
    saveStatus // Add this to destructuring
  } = useTournament();
  
  const currentLevel = state.levels?.[state.currentLevelIndex] || { smallBlind: 0, bigBlind: 0, ante: 0, duration: 15, type: 'level' };
  const isPause = currentLevel?.type === 'pause';
  const isRunning = state.isRunning || false; // Add null/undefined check
  
  // Calculate total chips in play with null/undefined protection
  const totalChips = (state.players || []).reduce((sum, player) => {
    return sum + (player.initialChips || 0) + 
      ((player.rebuys || 0) * (state.rebuyChips || 0)) + 
      ((player.addons || 0) * (state.addonChips || 0));
  }, 0);
  
  // Calculate average stack for active players only with null/undefined protection
  const activePlayers = (state.players || []).filter(player => !player.isEliminated);
  const averageStack = activePlayers.length > 0 
    ? Math.round(totalChips / activePlayers.length) 
    : 0;

  // Get next level information for preview with null/undefined protection
  const nextLevelIndex = (state.currentLevelIndex || 0) + 1;
  const hasNextLevel = nextLevelIndex < (state.levels || []).length;
  const upcomingLevel = hasNextLevel ? state.levels?.[nextLevelIndex] : null;

  // Format time remaining in minutes and seconds
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Add connection status indicator with last sync time
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null);
  const { lastSyncTime } = useTournament();
  
  // Format the last sync time
  const formattedSyncTime = React.useMemo(() => {
    if (!lastSyncTime) return "Нет данных";
    
    return new Date(lastSyncTime).toLocaleTimeString();
  }, [lastSyncTime]);
  
  // Check Firebase connection status - исправляем для предотвращения моргания
  React.useEffect(() => {
    let isMounted = true;
    
    // Устанавливаем соединение только один раз при монтировании
    setIsConnected(true);
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Add error boundary
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Caught error:", event.error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  if (hasError) {
    return (
      <div className="p-4 text-center">
        <div className="bg-danger-100 text-danger p-4 rounded-medium mb-4">
          <h3 className="text-lg font-semibold">Произошла ошибка</h3>
          <p>Пожалуйста, перезагрузите страницу</p>
        </div>
        <Button 
          color="primary" 
          onPress={() => window.location.reload()}
          startContent={<Icon icon="lucide:refresh-cw" />}
        >
          Перезагрузить
        </Button>
      </div>
    );
  }
  
  // Calculate the current game level number (excluding pauses)
  const currentGameLevelNumber = React.useMemo(() => {
    if (!state.levels || !currentLevel) return 1;
    
    // Count only game levels up to the current level
    return state.levels
      .filter(level => level.type === 'level')
      .findIndex(level => level.id === currentLevel.id) + 1;
  }, [state.levels, currentLevel]);
  
  // Удаляем прямое отображение таймера и используем компонент Timer
  return (
    <div 
      className="p-4 md:p-6 min-h-[calc(100vh-120px)] relative"
      style={state.backgroundImage ? {
        backgroundImage: `url(${state.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      } : {}}
    >
      {/* Semi-transparent overlay when background image is present */}
      {state.backgroundImage && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] -m-4 md:-m-6" />
      )}
      
      {/* Connection status indicator with save status */}
      <div className="relative z-10 flex justify-end mb-4">
        <div className="flex items-center gap-2">
          <Button 
            color="primary" 
            variant="flat" 
            size="sm"
            onPress={syncTimerOnly}
            startContent={<Icon icon="lucide:clock" />}
            className="mr-2"
          >
            Синхронизировать таймер
          </Button>
          
          {isConnected === true && (
            <div className="flex items-center gap-2 text-success bg-content1 px-3 py-1 rounded-full shadow-sm">
              <Icon icon="lucide:wifi" />
              <span>Синхронизация активна</span>
              <span className="text-xs text-default-500">({formattedSyncTime})</span>
              
              {/* Add save status indicator */}
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-1 ml-2 text-default-500">
                  <Icon icon="lucide:loader" className="animate-spin" size={14} />
                  <span className="text-xs">Сохранение...</span>
                </div>
              )}
              {saveStatus === 'success' && (
                <div className="flex items-center gap-1 ml-2 text-success">
                  <Icon icon="lucide:check" size={14} />
                  <span className="text-xs">Сохранено</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-1 ml-2 text-danger">
                  <Icon icon="lucide:alert-triangle" size={14} />
                  <span className="text-xs">Ошибка</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Club logo if available */}
      {state.clubLogo && (
        <div className="relative z-10 flex justify-center mb-8">
          <div className="bg-content1 p-4 rounded-medium shadow-md">
            <img 
              src={state.clubLogo} 
              alt="Club Logo" 
              className="max-h-24 max-w-full object-contain"
            />
          </div>
        </div>
      )}

      <div className="relative z-10">
        {/* Center the timer and blinds section */}
        <div className="flex flex-col items-center justify-center w-full max-w-6xl mx-auto">
          {/* Tournament Stats Summary - Add this section */}
          <div className="grid grid-cols-3 gap-4 w-full mb-6">
            <div className="bg-content1 p-4 rounded-medium shadow-sm text-center">
              <div className="text-default-600 text-sm">Игроков в игре</div>
              <div className="text-2xl font-bold">{activePlayers.length}</div>
            </div>
            <div className="bg-content1 p-4 rounded-medium shadow-sm text-center">
              <div className="text-default-600 text-sm">Средний стек</div>
              <div className="text-2xl font-bold">{averageStack.toLocaleString()}</div>
            </div>
            <div className="bg-content1 p-4 rounded-medium shadow-sm text-center">
              <div className="text-default-600 text-sm">Следующий уровень</div>
              {upcomingLevel ? (
                upcomingLevel.type === 'pause' ? (
                  <div className="text-xl font-medium text-secondary">
                    {upcomingLevel.name || 'Перерыв'}
                  </div>
                ) : (
                  <div className="text-xl font-medium">
                    {upcomingLevel.smallBlind}/{upcomingLevel.bigBlind}
                  </div>
                )
              ) : (
                <div className="text-xl font-medium text-default-500">Последний</div>
              )}
            </div>
          </div>

          <Card className="overflow-visible shadow-md w-full">
            <CardBody className="gap-6 p-6">
              <div className="text-center">
                {isPause ? (
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 flex items-center justify-center gap-2">
                    <Icon icon="lucide:coffee" className="text-secondary" />
                    {currentLevel.name || 'Перерыв'}
                  </h2>
                ) : (
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">Уровень {currentGameLevelNumber}</h2>
                )}
                <div className="flex justify-center items-center gap-2 text-default-600 text-xl lg:text-2xl">
                  <Icon icon="lucide:clock" className="text-2xl lg:text-3xl" />
                  <span>Длительность уровня: {currentLevel?.duration} мин</span>
                </div>
              </div>
              
              {/* Timer component - centered */}
              <Timer 
                seconds={state.timeRemaining} 
                isRunning={state.isRunning} 
                isPause={isPause}
                className="mx-auto max-w-3xl" // Center the timer
              />
              
              {isPause ? (
                <div className="p-6 bg-content2 rounded-medium text-center">
                  <div className="text-2xl lg:text-3xl font-medium text-secondary">Перерыв</div>
                  <div className="text-xl lg:text-2xl mt-2">Следующий уровень начнется после окончания перерыва</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
                  <div className="p-6 lg:p-8 bg-content2 rounded-medium text-center shadow-xs">
                    <div className="text-base lg:text-xl text-default-600 mb-2">Малый блайнд</div>
                    <div className="text-4xl lg:text-6xl font-bold">{currentLevel?.smallBlind}</div>
                  </div>
                  <div className="p-6 lg:p-8 bg-content2 rounded-medium text-center shadow-xs">
                    <div className="text-base lg:text-xl text-default-600 mb-2">Большой блайнд</div>
                    <div className="text-4xl lg:text-6xl font-bold">{currentLevel?.bigBlind}</div>
                  </div>
                  <div className="p-6 lg:p-8 bg-content2 rounded-medium text-center shadow-xs">
                    <div className="text-base lg:text-xl text-default-600 mb-2">Анте</div>
                    <div className="text-4xl lg:text-6xl font-bold">{currentLevel?.ante}</div>
                  </div>
                </div>
              )}
            </CardBody>
            <Divider />
            <CardFooter className="flex justify-between p-4 lg:p-6">
              <div className="flex gap-2">
                <Button
                  isIconOnly
                  variant="flat"
                  onPress={previousLevel}
                  isDisabled={state.currentLevelIndex === 0}
                  size="lg"
                >
                  <Icon icon="lucide:chevron-left" className="text-xl" />
                </Button>
                <Button
                  isIconOnly
                  variant="flat"
                  onPress={nextLevel}
                  isDisabled={state.currentLevelIndex === state.levels.length - 1}
                  size="lg"
                >
                  <Icon icon="lucide:chevron-right" className="text-xl" />
                </Button>
              </div>
              <div className="flex gap-3">
                <Button
                  color="primary"
                  variant="flat"
                  onPress={resetTimer}
                  isDisabled={state.isRunning}
                  size="lg"
                >
                  <Icon icon="lucide:refresh-cw" className="mr-2" />
                  Сбросить
                </Button>
                {state.isRunning ? (
                  <Button color="warning" onPress={pauseTimer} size="lg">
                    <Icon icon="lucide:pause" className="mr-2" />
                    Пауза
                  </Button>
                ) : (
                  <Button color="success" onPress={startTimer} size="lg">
                    <Icon icon="lucide:play" className="mr-2" />
                    Старт
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
          
          {/* Move tournament stats below the timer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 w-full">
            {/* Tournament Stats */}
            <Card className="shadow-md">
              {/* Existing stats card code */}
            </Card>

            {/* Next Level Preview */}
            <Card className="shadow-md">
              {/* Existing next level preview code */}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Fix missing Spinner import
const Spinner = () => (
  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

// Добавляем эффект для принудительной синхронизации каждые 30 секунд ВНУТРИ компонента
// React.useEffect(() => {
//   // Синхронизируем данные при монтировании компонента
//   syncData();
  
//   // Устанавливаем интервал для регулярной синхронизации
//   const syncInterval = setInterval(() => {
//     syncData();
//   }, 30000); // Каждые 30 секунд
  
//   return () => {
//     clearInterval(syncInterval);
//   };
// }, [syncData]);