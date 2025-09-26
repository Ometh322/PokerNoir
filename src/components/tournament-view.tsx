import React from "react";
import { Card, CardBody, CardFooter, Button, Divider, CardHeader } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTournament } from "./tournament-context";
// import { Timer } from "./timer";

export const TournamentView: React.FC = () => {
  const { 
    state, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    nextLevel, 
    previousLevel 
  } = useTournament();
  
  const currentLevel = state.levels[state.currentLevelIndex];
  const isPause = currentLevel?.type === 'pause';
  const isRunning = state.isRunning; // Add this line to extract isRunning from state
  
  // Calculate total chips in play
  const totalChips = state.players.reduce((sum, player) => {
    return sum + player.initialChips + 
      (player.rebuys * state.rebuyChips) + 
      (player.addons * state.addonChips);
  }, 0);
  
  // Calculate average stack for active players only
  const activePlayers = state.players.filter(player => !player.isEliminated);
  const averageStack = activePlayers.length > 0 
    ? Math.round(totalChips / activePlayers.length) 
    : 0;

  // Get next level information for preview
  const nextLevelIndex = state.currentLevelIndex + 1;
  const hasNextLevel = nextLevelIndex < state.levels.length;
  const upcomingLevel = hasNextLevel ? state.levels[nextLevelIndex] : null;

  // Format time remaining in minutes and seconds
  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="p-4 md:p-6 space-y-8 relative"
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

      <div className="relative z-10 space-y-8">
        {/* Main Tournament Info */}
        <Card className="overflow-visible shadow-md">
          <CardBody className="gap-6 p-6">
            <div className="text-center">
              {isPause ? (
                <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
                  <Icon icon="lucide:coffee" className="text-secondary" />
                  {currentLevel.name || 'Перерыв'}
                </h2>
              ) : (
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Уровень {state.currentLevelIndex + 1}</h2>
              )}
              <div className="flex justify-center items-center gap-2 text-default-600 text-lg">
                <Icon icon="lucide:clock" className="text-xl" />
                <span>Длительность уровня: {currentLevel?.duration} мин</span>
              </div>
            </div>
            
            {/* Larger Timer */}
            <div className="relative">
              <Card className={`bg-content2 border-none shadow-none ${isPause ? "bg-secondary/10" : ""}`}>
                <div className="flex items-center justify-center h-40 md:h-48">
                  <div className={`text-6xl md:text-7xl font-bold timer-text ${isRunning ? (isPause ? 'text-secondary' : 'text-primary') : 'text-default-600'}`}>
                    {formatTimeRemaining(state.timeRemaining)}
                  </div>
                </div>
              </Card>
              <div className="h-2 w-full bg-default-100 absolute bottom-0 left-0 right-0">
                <div 
                  className={`h-full ${isPause ? "bg-secondary" : state.timeRemaining <= 60 ? "bg-danger" : state.timeRemaining <= 180 ? "bg-warning" : "bg-success"} transition-all duration-1000 ease-linear`}
                  style={{ width: `${(state.timeRemaining % 60) / 60 * 100}%` }}
                />
              </div>
            </div>
            
            {isPause ? (
              <div className="p-6 bg-content2 rounded-medium text-center">
                <div className="text-xl font-medium text-secondary">Перерыв</div>
                <div className="text-lg mt-2">Следующий уровень начнется после окончания перерыва</div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                <div className="p-4 bg-content2 rounded-medium text-center shadow-xs">
                  <div className="text-sm text-default-600 mb-1">Малый блайнд</div>
                  <div className="text-3xl font-bold">{currentLevel?.smallBlind}</div>
                </div>
                <div className="p-4 bg-content2 rounded-medium text-center shadow-xs">
                  <div className="text-sm text-default-600 mb-1">Большой блайнд</div>
                  <div className="text-3xl font-bold">{currentLevel?.bigBlind}</div>
                </div>
                <div className="p-4 bg-content2 rounded-medium text-center shadow-xs">
                  <div className="text-sm text-default-600 mb-1">Анте</div>
                  <div className="text-3xl font-bold">{currentLevel?.ante}</div>
                </div>
              </div>
            )}
          </CardBody>
          <Divider />
          <CardFooter className="flex justify-between p-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
  );
};