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
    saveStatus
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
      className="p-2 md:p-3 min-h-[calc(100vh-120px)] relative flex flex-col"
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
      
      {/* Connection status indicator - make it smaller and less prominent */}
      <div className="relative z-10 flex justify-end mb-2">
        <div className="flex items-center gap-1 scale-90 origin-right">
          <Button 
            color="primary" 
            variant="flat" 
            size="sm"
            onPress={syncTimerOnly}
            startContent={<Icon icon="lucide:clock" size={16} />}
            className="mr-1 text-xs"
          >
            Синхр.
          </Button>
          
          {isConnected === true && (
            <div className="flex items-center gap-1 text-success bg-content1 px-2 py-0.5 rounded-full shadow-sm text-xs">
              <Icon icon="lucide:wifi" size={14} />
              <span className="hidden sm:inline">Синхронизация</span>
              
              {/* Add save status indicator - more compact */}
              {saveStatus === 'saving' && (
                <Icon icon="lucide:loader" className="animate-spin ml-1" size={12} />
              )}
              {saveStatus === 'success' && (
                <Icon icon="lucide:check" className="ml-1" size={12} />
              )}
              {saveStatus === 'error' && (
                <Icon icon="lucide:alert-triangle" className="ml-1" size={12} />
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Club logo - make it smaller */}
      {state.clubLogo && (
        <div className="relative z-10 flex justify-center mb-2">
          <div className="bg-content1 p-2 rounded-medium shadow-md">
            <img 
              src={state.clubLogo} 
              alt="Club Logo" 
              className="max-h-16 max-w-full object-contain"
            />
          </div>
        </div>
      )}

      <div className="relative z-10 flex-grow flex flex-col">
        {/* Center the blinds and timer section - make it MUCH larger */}
        <div className="flex flex-col items-center justify-center w-full h-full">
          {/* Tournament Stats Summary - УВЕЛИЧИВАЕМ размер еще на 30% */}
          <div className="grid grid-cols-3 gap-6 w-full mb-8 p-6 bg-content1/80 rounded-lg shadow-sm">
            <div className="bg-content2 p-6 rounded-medium shadow-sm text-center">
              <div className="text-default-600 text-lg mb-3">Игроков</div>
              <div className="text-4xl font-bold">{activePlayers.length}</div>
            </div>
            <div className="bg-content2 p-6 rounded-medium shadow-sm text-center">
              <div className="text-default-600 text-lg mb-3">Средний стек</div>
              <div className="text-4xl font-bold">{averageStack.toLocaleString()}</div>
            </div>
            <div className="bg-content2 p-6 rounded-medium shadow-sm text-center">
              <div className="text-default-600 text-lg mb-3">След. уровень</div>
              {upcomingLevel ? (
                upcomingLevel.type === 'pause' ? (
                  <div className="text-3xl font-medium text-secondary">
                    {upcomingLevel.name || 'Перерыв'}
                  </div>
                ) : (
                  <div className="text-3xl font-medium">
                    {upcomingLevel.smallBlind}/{upcomingLevel.bigBlind}
                  </div>
                )
              ) : (
                <div className="text-3xl font-medium text-default-500">Последний</div>
              )}
            </div>
          </div>

          {/* MAIN TOURNAMENT CARD - Make it take up 90% of the screen */}
          <Card className="overflow-visible shadow-md w-full flex-grow flex flex-col min-h-[80vh]">
            <CardBody className="gap-6 p-4 md:p-6 flex flex-col justify-between flex-grow">
              <div className="flex flex-col justify-center items-center flex-grow">
                <div className="text-center mb-2">
                  {isPause ? (
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold flex items-center justify-center gap-2">
                      <Icon icon="lucide:coffee" className="text-secondary" />
                      {currentLevel.name || 'Перерыв'}
                    </h2>
                  ) : (
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">Уровень {currentGameLevelNumber}</h2>
                  )}
                </div>
                
                {/* CHANGE: Делаем блайнды более широкими и адаптируем сетку в зависимости от наличия анте */}
                {!isPause && (
                  <div className={`grid ${currentLevel?.ante > 0 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} gap-6 w-full mx-auto mb-6 justify-items-center`}>
                    <div className="p-6 lg:p-8 bg-primary-100 rounded-medium text-center shadow-sm border-2 border-primary-200 w-full">
                      <div className="text-xl lg:text-2xl text-primary-700 mb-2 font-medium">Малый блайнд</div>
                      <div className="text-7xl lg:text-9xl font-bold text-primary-600">{currentLevel?.smallBlind}</div>
                    </div>
                    <div className="p-6 lg:p-8 bg-primary-100 rounded-medium text-center shadow-sm border-2 border-primary-200 w-full">
                      <div className="text-xl lg:text-2xl text-primary-700 mb-2 font-medium">Большой блайнд</div>
                      <div className="text-7xl lg:text-9xl font-bold text-primary-600">{currentLevel?.bigBlind}</div>
                    </div>
                    {/* Only show ante if it's greater than 0 */}
                    {currentLevel?.ante > 0 && (
                      <div className="p-6 lg:p-8 bg-primary-100 rounded-medium text-center shadow-sm border-2 border-primary-200 w-full">
                        <div className="text-xl lg:text-2xl text-primary-700 mb-2 font-medium">Анте</div>
                        <div className="text-7xl lg:text-9xl font-bold text-primary-600">{currentLevel?.ante}</div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-center items-center gap-2 text-default-600 text-lg lg:text-xl mb-2">
                  <Icon icon="lucide:clock" className="text-xl lg:text-2xl" />
                  <span>Длительность: {currentLevel?.duration} мин</span>
                </div>
                
                {/* Timer component - make it larger */}
                <Timer 
                  seconds={state.timeRemaining} 
                  isRunning={state.isRunning} 
                  isPause={isPause}
                  className="mx-auto w-full max-w-4xl" 
                />
                
                {isPause && (
                  <div className="p-6 bg-content2 rounded-medium text-center mt-4">
                    <div className="text-2xl lg:text-3xl font-medium text-secondary">Перерыв</div>
                    <div className="text-xl lg:text-2xl mt-2">Следующий уровень начнется после окончания перерыва</div>
                  </div>
                )}
              </div>
            </CardBody>
            <Divider />
            <CardFooter className="flex justify-between p-3 lg:p-4">
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
          
          {/* Remove tournament stats section to save space */}
        </div>
      </div>
    </div>
  );
};

// Fix missing Spinner import
const Spinner = () => (
  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

// Добавляем эффект для принудительной синхронизации при монтировании и периодически
// React.useEffect(() => {
//   // Синхронизируем данные при монтировании компонента
//   syncData();
  
//   // Устанавливаем интервал для регулярной синхронизации
//   const syncInterval = setInterval(() => {
//     syncTimerOnly(); // Используем более легкую синхронизацию только для таймера
//   }, 10000); // Каждые 10 секунд
  
//   return () => {
//     clearInterval(syncInterval);
//   };
// }, [syncData, syncTimerOnly]);

// // Добавляем обработчик для принудительной синхронизации при изменении вкладки
// React.useEffect(() => {
//   const handleVisibilityChange = () => {
//     if (document.visibilityState === 'visible') {
//       console.log("Tab became visible, syncing data");
//       syncData();
//     }
//   };
  
//   document.addEventListener('visibilitychange', handleVisibilityChange);
  
//   return () => {
//     document.removeEventListener('visibilitychange', handleVisibilityChange);
//   };
// }, [syncData]);