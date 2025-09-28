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
        {/* Horizontal Layout for Large Screens - Make it full width */}
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Left Column - Timer and Blinds - Adjust width for full screen */}
          <div className="lg:w-3/5 xl:w-2/3 space-y-6">
            <Card className="overflow-visible shadow-md">
              <CardBody className="gap-6 p-6">
                <div className="text-center">
                  {isPause ? (
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 flex items-center justify-center gap-2">
                      <Icon icon="lucide:coffee" className="text-secondary" />
                      {currentLevel.name || 'Перерыв'}
                    </h2>
                  ) : (
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">Уровень {state.currentLevelIndex + 1}</h2>
                  )}
                  <div className="flex justify-center items-center gap-2 text-default-600 text-lg lg:text-xl">
                    <Icon icon="lucide:clock" className="text-xl lg:text-2xl" />
                    <span>Длительность уровня: {currentLevel?.duration} мин</span>
                  </div>
                </div>
                
                {/* Используем компонент Timer вместо прямого отображения */}
                <Timer 
                  seconds={state.timeRemaining} 
                  isRunning={state.isRunning} 
                  isPause={isPause}
                />
                
                {isPause ? (
                  <div className="p-6 bg-content2 rounded-medium text-center">
                    <div className="text-xl lg:text-2xl font-medium text-secondary">Перерыв</div>
                    <div className="text-lg lg:text-xl mt-2">Следующий уровень начнется после окончания перерыва</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-6">
                    <div className="p-4 lg:p-6 bg-content2 rounded-medium text-center shadow-xs">
                      <div className="text-sm lg:text-base text-default-600 mb-1">Малый блайнд</div>
                      <div className="text-3xl lg:text-4xl font-bold">{currentLevel?.smallBlind}</div>
                    </div>
                    <div className="p-4 lg:p-6 bg-content2 rounded-medium text-center shadow-xs">
                      <div className="text-sm lg:text-base text-default-600 mb-1">Большой блайнд</div>
                      <div className="text-3xl lg:text-4xl font-bold">{currentLevel?.bigBlind}</div>
                    </div>
                    <div className="p-4 lg:p-6 bg-content2 rounded-medium text-center shadow-xs">
                      <div className="text-sm lg:text-base text-default-600 mb-1">Анте</div>
                      <div className="text-3xl lg:text-4xl font-bold">{currentLevel?.ante}</div>
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
          </div>

          {/* Right Column - Stats and Next Level - Adjust width for full screen */}
          <div className="lg:w-2/5 xl:w-1/3 space-y-6">
            {/* Tournament Stats */}
            <Card className="shadow-md">
              <CardHeader className="pb-0">
                <h2 className="text-xl font-semibold">Статистика турнира</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-content2 rounded-medium shadow-xs">
                      <div className="flex items-center gap-2 text-default-600 mb-1">
                        <Icon icon="lucide:users" />
                        <span>Игроков</span>
                      </div>
                      <div className="text-3xl font-bold">
                        {activePlayers.length}/{state.players.length}
                      </div>
                    </div>
                    <div className="p-5 bg-content2 rounded-medium shadow-xs">
                      <div className="flex items-center gap-2 text-default-600 mb-1">
                        <Icon icon="lucide:bar-chart-2" />
                        <span>Средний стек</span>
                      </div>
                      <div className="text-3xl font-bold">
                        {averageStack.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-content2 rounded-medium shadow-xs">
                      <div className="flex items-center gap-1 text-default-600 mb-1 text-sm">
                        <Icon icon="lucide:coins" />
                        <span>Бай-ин</span>
                      </div>
                      <div className="text-xl font-bold">{state.initialChips.toLocaleString()}</div>
                    </div>
                    <div className="p-4 bg-content2 rounded-medium shadow-xs">
                      <div className="flex items-center gap-1 text-default-600 mb-1 text-sm">
                        <Icon icon="lucide:refresh-cw" />
                        <span>Ребай</span>
                      </div>
                      <div className="text-xl font-bold">{state.rebuyChips.toLocaleString()}</div>
                    </div>
                    <div className="p-4 bg-content2 rounded-medium shadow-xs">
                      <div className="flex items-center gap-1 text-default-600 mb-1 text-sm">
                        <Icon icon="lucide:plus-circle" />
                        <span>Аддон</span>
                      </div>
                      <div className="text-xl font-bold">{state.addonChips.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="p-5 bg-content2 rounded-medium shadow-xs">
                    <div className="flex items-center gap-2 text-default-600 mb-1">
                      <Icon icon="lucide:database" />
                      <span>Всего фишек в игре</span>
                    </div>
                    <div className="text-3xl font-bold">{totalChips.toLocaleString()}</div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Next Level Preview */}
            <Card className="shadow-md">
              <CardHeader className="pb-0">
                <h2 className="text-xl font-semibold">Следующий уровень</h2>
              </CardHeader>
              <CardBody>
                {hasNextLevel ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-content2 rounded-medium">
                      <div className="text-center mb-3">
                        {upcomingLevel?.type === 'pause' ? (
                          <div className="flex items-center justify-center gap-2 text-xl font-medium">
                            <Icon icon="lucide:coffee" className="text-secondary" />
                            {upcomingLevel.name || 'Перерыв'}
                          </div>
                        ) : (
                          <div className="text-xl font-medium">Уровень {nextLevelIndex + 1}</div>
                        )}
                        <div className="text-default-600 mt-1">
                          Длительность: {upcomingLevel?.duration} мин
                        </div>
                      </div>
                      
                      {upcomingLevel?.type === 'pause' ? (
                        <div className="text-center p-3 bg-secondary/10 rounded-medium">
                          <span className="text-secondary font-medium">Перерыв</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-content3 rounded-medium text-center">
                            <div className="text-xs text-default-600">Малый блайнд</div>
                            <div className="text-xl font-semibold">{upcomingLevel?.smallBlind}</div>
                          </div>
                          <div className="p-3 bg-content3 rounded-medium text-center">
                            <div className="text-xs text-default-600">Большой блайнд</div>
                            <div className="text-xl font-semibold">{upcomingLevel?.bigBlind}</div>
                          </div>
                          <div className="p-3 bg-content3 rounded-medium text-center">
                            <div className="text-xs text-default-600">Анте</div>
                            <div className="text-xl font-semibold">{upcomingLevel?.ante}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Blind progression */}
                    {!isPause && upcomingLevel?.type !== 'pause' && (
                      <div className="space-y-3">
                        <h3 className="text-medium font-medium">Изменение блайндов</h3>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 p-3 bg-content2 rounded-medium text-center">
                            <div className="text-xs text-default-600">Малый блайнд</div>
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <span className="text-lg font-medium">{currentLevel?.smallBlind}</span>
                              <Icon icon="lucide:arrow-right" className="text-default-500" />
                              <span className="text-lg font-medium text-primary">{upcomingLevel?.smallBlind}</span>
                            </div>
                          </div>
                          <div className="flex-1 p-3 bg-content2 rounded-medium text-center">
                            <div className="text-xs text-default-600">Большой блайнд</div>
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <span className="text-lg font-medium">{currentLevel?.bigBlind}</span>
                              <Icon icon="lucide:arrow-right" className="text-default-500" />
                              <span className="text-lg font-medium text-primary">{upcomingLevel?.bigBlind}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <Icon icon="lucide:flag" className="text-4xl text-default-400 mb-3" />
                    <p className="text-xl font-medium">Последний уровень</p>
                    <p className="text-default-500 mt-2">Турнир подходит к завершению</p>
                  </div>
                )}
              </CardBody>
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