import React, { useCallback } from "react";
import FirebaseService from "../services/firebase-service";

export interface BlindLevel {
  id: number;
  type: 'level' | 'pause';
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number; // in minutes
  name?: string; // Optional name for pauses
}

export interface Player {
  id: number;
  name: string;
  initialChips: number;
  rebuys: number;
  addons: number;
  isEliminated: boolean;
  eliminationOrder: number | null;
  bountyChips: number;
  paidAmount: number; // New field to track payments
}

export interface TournamentState {
  levels: BlindLevel[];
  currentLevelIndex: number;
  timeRemaining: number; // in seconds
  isRunning: boolean;
  players: Player[];
  initialChips: number;
  rebuyChips: number;
  addonChips: number;
  eliminationCount: number;
  backgroundImage: string | null;
  clubLogo: string | null;
  entryFee: number; // New field for entry fee
  rebuyFee: number; // New field for rebuy fee
  addonFee: number; // New field for addon fee
  lastUpdated: number; // Timestamp for synchronization
}

interface TournamentContextType {
  state: TournamentState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  nextLevel: () => void;
  previousLevel: () => void;
  updateLevel: (id: number, level: Partial<BlindLevel>) => void;
  addLevel: (level: Omit<BlindLevel, "id">) => void;
  removeLevel: (id: number) => void;
  addPlayer: (name: string) => void;
  removePlayer: (id: number) => void;
  addRebuy: (playerId: number) => void;
  addAddon: (playerId: number) => void;
  updateInitialChips: (chips: number) => void;
  updateRebuyChips: (chips: number) => void;
  updateAddonChips: (chips: number) => void;
  eliminatePlayer: (playerId: number) => void;
  revivePlayer: (playerId: number) => void;
  resetEliminations: () => void;
  updateBackgroundImage: (imageUrl: string | null) => void;
  updateClubLogo: (imageUrl: string | null) => void;
  updateEntryFee: (fee: number) => void;
  updateRebuyFee: (fee: number) => void;
  updateAddonFee: (fee: number) => void;
  addBountyChips: (playerId: number, amount: number) => void; // Ensure this is named correctly
  syncData: () => Promise<void>; // Make sure it returns Promise<void>
  recordPayment: (playerId: number, amount: number) => void;
  createNewTournament: (name?: string) => Promise<string | null>;
  loadTournament: (id: string) => Promise<boolean>;
  getAllTournaments: () => Promise<Array<{id: string; name: string; createdAt: number}>>;
  deleteTournament: (id: string) => Promise<boolean>;
  isLoading: boolean;
  lastSyncTime: number;
}

const defaultLevels: BlindLevel[] = [
  { id: 1, type: 'level', smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
  { id: 2, type: 'level', smallBlind: 50, bigBlind: 100, ante: 0, duration: 15 },
  { id: 3, type: 'level', smallBlind: 75, bigBlind: 150, ante: 0, duration: 15 },
  { id: 4, type: 'level', smallBlind: 100, bigBlind: 200, ante: 25, duration: 15 },
  { id: 5, type: 'level', smallBlind: 150, bigBlind: 300, ante: 25, duration: 15 },
  { id: 6, type: 'level', smallBlind: 200, bigBlind: 400, ante: 50, duration: 15 },
  { id: 7, type: 'level', smallBlind: 300, bigBlind: 600, ante: 75, duration: 15 },
  { id: 8, type: 'level', smallBlind: 400, bigBlind: 800, ante: 100, duration: 15 },
  { id: 9, type: 'level', smallBlind: 500, bigBlind: 1000, ante: 125, duration: 15 },
  { id: 10, type: 'level', smallBlind: 700, bigBlind: 1400, ante: 150, duration: 15 },
];

const defaultState: TournamentState = {
  levels: defaultLevels,
  currentLevelIndex: 0,
  timeRemaining: defaultLevels[0].duration * 60,
  isRunning: false,
  players: [],
  initialChips: 10000,
  rebuyChips: 10000,
  addonChips: 15000,
  eliminationCount: 0,
  backgroundImage: null,
  clubLogo: null,
  entryFee: 1000, // Default entry fee
  rebuyFee: 1000, // Default rebuy fee
  addonFee: 1500, // Default addon fee
  lastUpdated: Date.now(), // Initial timestamp
};

export const TournamentContext = React.createContext<TournamentContextType>({
  state: defaultState,
  startTimer: () => {},
  pauseTimer: () => {},
  resetTimer: () => {},
  nextLevel: () => {},
  previousLevel: () => {},
  updateLevel: () => {},
  addLevel: () => {},
  removeLevel: () => {},
  addPlayer: () => {},
  removePlayer: () => {},
  addRebuy: () => {},
  addAddon: () => {},
  updateInitialChips: () => {},
  updateRebuyChips: () => {},
  updateAddonChips: () => {},
  eliminatePlayer: () => {},
  revivePlayer: () => {},
  resetEliminations: () => {},
  updateBackgroundImage: () => {},
  updateClubLogo: () => {},
  updateEntryFee: () => {},
  updateRebuyFee: () => {},
  updateAddonFee: () => {},
  addBountyChips: () => {},
  syncData: () => {},
  recordPayment: () => {},
});

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<TournamentState>(defaultState);
  const [isLoading, setIsLoading] = React.useState(true);
  const [lastSyncTime, setLastSyncTime] = React.useState<number>(0);
  const timerRef = React.useRef<number | null>(null);
  const stateRef = React.useRef<TournamentState>(state);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const saveStatusTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  // Добавляем определение saveDebounceRef
  const saveDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Update the ref whenever state changes
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Use ref for Firebase service to avoid recreation
  const firebaseService = React.useMemo(() => FirebaseService.getInstance(), []);
  
  // Initialize Firebase and load active tournament with improved error handling
  React.useEffect(() => {
    let isMounted = true;
    
    const initFirebase = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      try {
        await firebaseService.init();
        
        // Try to load active tournament with increased timeout
        const activeTournament = await firebaseService.getActiveTournament(20000); // 20 seconds timeout
        
        if (activeTournament && isMounted) {
          setState(activeTournament);
          setLastSyncTime(Date.now());
        } else if (isMounted) {
          // Check for failed updates in localStorage
          const failedUpdate = localStorage.getItem('failedUpdate');
          if (failedUpdate) {
            try {
              const parsedUpdate = JSON.parse(failedUpdate);
              console.log("Restoring from failed update in localStorage");
              setState(parsedUpdate);
              // Try to save it again
              await firebaseService.updateActiveTournament(parsedUpdate);
            } catch (parseError) {
              console.error("Failed to parse stored update:", parseError);
              
              // If no active tournament and no valid stored update, create a new one
              try {
                const newState = {
                  ...defaultState,
                  lastUpdated: Date.now()
                };
                
                await firebaseService.createTournament("Новый турнир", newState);
                setState(newState);
              } catch (createError) {
                console.error("Failed to create new tournament:", createError);
              }
            }
          } else {
            // If no active tournament and no stored update, create a new one
            try {
              const newState = {
                ...defaultState,
                lastUpdated: Date.now()
              };
              
              await firebaseService.createTournament("Новый турнир", newState);
              setState(newState);
            } catch (createError) {
              console.error("Failed to create new tournament:", createError);
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        
        // Try to load from localStorage as fallback
        try {
          const savedState = localStorage.getItem("tournamentState");
          if (savedState && isMounted) {
            console.log("Loading from localStorage as fallback");
            setState(JSON.parse(savedState));
          }
        } catch (fallbackError) {
          console.error("Fallback loading failed:", fallbackError);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initFirebase();
    
    // Add change listener for Firebase updates
    const handleFirebaseChange = (updatedData: TournamentState) => {
      if (!isMounted) return;
      
      // Only update if the data is newer than our current state
      if (updatedData && updatedData.lastUpdated > stateRef.current.lastUpdated) {
        setState(updatedData);
        setLastSyncTime(Date.now());
        
        // Also save to localStorage as backup
        try {
          localStorage.setItem("tournamentState", JSON.stringify(updatedData));
        } catch (storageError) {
          console.error("Failed to save to localStorage:", storageError);
        }
      }
    };
    
    firebaseService.addChangeListener(handleFirebaseChange);
    
    return () => {
      isMounted = false;
      firebaseService.removeChangeListener(handleFirebaseChange);
    };
  }, [firebaseService]);

  // Исправляем функцию сохранения в Firebase - сохраняем КАЖДОЕ изменение
  React.useEffect(() => {
    if (isLoading) return;
    
    // Очищаем предыдущий таймер
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    
    // Устанавливаем статус сохранения
    setSaveStatus('saving');
    
    // Устанавливаем новый таймер с небольшой задержкой
    saveDebounceRef.current = setTimeout(async () => {
      try {
        // Сохраняем в localStorage для резервной копии
        localStorage.setItem("tournamentState", JSON.stringify(state));
        
        // Сохраняем в Firebase
        await firebaseService.updateActiveTournament(state);
        setSaveStatus('success');
        
        // Обновляем время последней синхронизации
        setLastSyncTime(Date.now());
        
        // Сбрасываем статус через 2 секунды
        if (saveStatusTimeoutRef.current) {
          clearTimeout(saveStatusTimeoutRef.current);
        }
        saveStatusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error("Failed to save tournament state:", error);
        setSaveStatus('error');
      }
    }, 300); // Уменьшаем задержку до 300ms
    
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, [state, firebaseService, isLoading]);

  // Добавляем функцию для принудительного сохранения
  const forceSave = async () => {
    try {
      setSaveStatus('saving');
      await firebaseService.updateActiveTournament(state);
      setSaveStatus('success');
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error("Failed to force save:", error);
      setSaveStatus('error');
    }
  };

  // Исправляем функции для работы с игроками - добавляем принудительное сохранение
  const addRebuy = (playerId: number) => {
    if (typeof playerId !== 'number' || isNaN(playerId)) {
      console.error("Invalid player ID:", playerId);
      return;
    }
    
    setState(prevState => {
      // Создаем новый массив игроков
      const newPlayers = (prevState.players || []).map(player => {
        // Если это нужный игрок, увеличиваем количество ребаев
        if (player && player.id === playerId) {
          return {
            ...player,
            rebuys: (player.rebuys || 0) + 1
          };
        }
        // Иначе возвращаем игрока без изменений
        return player;
      });
      
      // Возвращаем новое состояние с обновленным массивом игроков
      const newState = {
        ...prevState,
        players: newPlayers,
        lastUpdated: Date.now() // Обязательно обновляем timestamp
      };
      
      // Принудительно сохраняем изменения
      setTimeout(() => forceSave(), 100);
      
      return newState;
    });
  };

  const addAddon = (playerId: number) => {
    if (typeof playerId !== 'number' || isNaN(playerId)) {
      console.error("Invalid player ID:", playerId);
      return;
    }
    
    setState(prevState => {
      // Создаем новый массив игроков
      const newPlayers = (prevState.players || []).map(player => {
        // Если это нужный игрок, увеличиваем количество аддонов
        if (player && player.id === playerId) {
          return {
            ...player,
            addons: (player.addons || 0) + 1
          };
        }
        // Иначе возвращаем игрока без изменений
        return player;
      });
      
      // Возвращаем новое состояние с обновленным массивом игроков
      const newState = {
        ...prevState,
        players: newPlayers,
        lastUpdated: Date.now() // Обязательно обновляем timestamp
      };
      
      // Принудительно сохраняем изменения
      setTimeout(() => forceSave(), 100);
      
      return newState;
    });
  };

  const eliminatePlayer = (playerId: number) => {
    if (typeof playerId !== 'number' || isNaN(playerId)) {
      console.error("Invalid player ID:", playerId);
      return;
    }
    
    setState(prevState => {
      // Проверяем, что массив players существует
      if (!prevState.players || !Array.isArray(prevState.players)) {
        console.error("Players array is undefined or not an array");
        return prevState;
      }
      
      // Находим игрока с дополнительной проверкой
      const playerToEliminate = prevState.players.find(p => p && p.id === playerId);
      
      // Если игрок не найден или уже выбыл, возвращаем текущее состояние
      if (!playerToEliminate) {
        console.error("Player not found:", playerId);
        return prevState;
      }
      
      if (playerToEliminate.isEliminated) {
        console.warn("Player already eliminated:", playerId);
        return prevState;
      }
      
      // Вычисляем новый порядок выбывания
      const nextEliminationOrder = (prevState.eliminationCount || 0) + 1;
      
      // Создаем новый массив игроков
      const newPlayers = prevState.players.map(player => {
        // Дополнительная проверка на существование player
        if (!player) return player;
        
        // Если это нужный игрок, отмечаем его как выбывшего
        if (player.id === playerId) {
          return {
            ...player,
            isEliminated: true,
            eliminationOrder: nextEliminationOrder
          };
        }
        // Иначе возвращаем игрока без изменений
        return player;
      });
      
      // Возвращаем новое состояние с обновленным массивом игроков
      const newState = {
        ...prevState,
        players: newPlayers,
        eliminationCount: nextEliminationOrder,
        lastUpdated: Date.now() // Обязательно обновляем timestamp
      };
      
      // Принудительно сохраняем изменения
      setTimeout(() => forceSave(), 100);
      
      return newState;
    });
  };

  const revivePlayer = (playerId: number) => {
    if (typeof playerId !== 'number' || isNaN(playerId)) {
      console.error("Invalid player ID:", playerId);
      return;
    }
    
    setState(prevState => {
      // Проверяем, что массив players существует
      if (!prevState.players || !Array.isArray(prevState.players)) {
        console.error("Players array is undefined or not an array");
        return prevState;
      }
      
      // Находим игрока с дополнительной проверкой
      const playerToRevive = prevState.players.find(p => p && p.id === playerId);
      
      // Если игрок не найден или не выбыл, возвращаем текущее состояние
      if (!playerToRevive) {
        console.error("Player not found:", playerId);
        return prevState;
      }
      
      if (!playerToRevive.isEliminated) {
        console.warn("Player is not eliminated:", playerId);
        return prevState;
      }
      
      // Получаем порядок выбывания игрока
      const eliminationOrder = playerToRevive.eliminationOrder;
      
      // Создаем новый массив игроков с дополнительными проверками
      const newPlayers = prevState.players.map(player => {
        // Дополнительная проверка на существование player
        if (!player) return player;
        
        if (player.id === playerId) {
          // Возвращаем игрока в игру и добавляем ребай
          return {
            ...player,
            isEliminated: false,
            eliminationOrder: null,
            rebuys: (player.rebuys || 0) + 1
          };
        } else if (player.eliminationOrder && eliminationOrder && player.eliminationOrder > eliminationOrder) {
          // Уменьшаем порядок выбывания для игроков, выбывших после этого
          return {
            ...player,
            eliminationOrder: player.eliminationOrder - 1
          };
        }
        // Иначе возвращаем игрока без изменений
        return player;
      });
      
      // Возвращаем новое состояние с обновленным массивом игроков
      const newState = {
        ...prevState,
        players: newPlayers,
        eliminationCount: Math.max(0, (prevState.eliminationCount || 0) - 1),
        lastUpdated: Date.now() // Обязательно обновляем timestamp
      };
      
      // Принудительно сохраняем изменения
      setTimeout(() => forceSave(), 100);
      
      return newState;
    });
  };

  const removePlayer = (playerId: number) => {
    if (typeof playerId !== 'number' || isNaN(playerId)) {
      console.error("Invalid player ID:", playerId);
      return;
    }
    
    setState(prevState => {
      // Проверяем, что массив players существует
      if (!prevState.players || !Array.isArray(prevState.players)) {
        console.error("Players array is undefined or not an array");
        return prevState;
      }
      
      // Фильтруем массив игроков, исключая игрока с указанным id
      const newPlayers = prevState.players.filter(player => player && player.id !== playerId);
      
      // Возвращаем новое состояние с обновленным массивом игроков
      const newState = {
        ...prevState,
        players: newPlayers,
        lastUpdated: Date.now() // Обязательно обновляем timestamp
      };
      
      // Принудительно сохраняем изменения
      setTimeout(() => forceSave(), 100);
      
      return newState;
    });
  };

  // Исправляем функцию syncData для принудительной синхронизации
  const syncData = useCallback(async (timeoutMs: number = 10000) => {
    try {
      setIsLoading(true);
      setSaveStatus('saving');
      
      // Сначала сохраняем текущее состояние
      await firebaseService.updateActiveTournament(state);
      
      // Затем получаем актуальное состояние с сервера
      const activeTournament = await firebaseService.getActiveTournament(30000); // 30s timeout
      
      if (activeTournament) {
        // Проверяем, что полученное состояние новее текущего
        if (activeTournament.lastUpdated > state.lastUpdated) {
          setState(activeTournament);
        } else {
          // Если наше состояние новее, отправляем его на сервер
          await firebaseService.updateActiveTournament(state);
        }
        
        setLastSyncTime(Date.now());
        setSaveStatus('success');
        
        // Также сохраняем в localStorage как резервную копию
        localStorage.setItem("tournamentState", JSON.stringify(
          activeTournament.lastUpdated > state.lastUpdated ? activeTournament : state
        ));
      } else {
        // Если нет активного турнира, создаем его с текущим состоянием
        await firebaseService.createTournament(state.name || "Новый турнир", state);
        setSaveStatus('success');
      }
    } catch (error) {
      console.error("Failed to sync tournament state:", error);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
      
      // Сбрасываем статус через задержку
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }
  }, [state, firebaseService]);

  // Timer logic with improved cleanup
  // React.useEffect(() => {
  //   if (state.isRunning) {
  //     timerRef.current = window.setInterval(() => {
  //       setState((prevState) => {
  //         if (prevState.timeRemaining <= 1) {
  //           // Time's up, move to next level
  //           const nextLevelIndex = prevState.currentLevelIndex + 1;
  //           if (nextLevelIndex < prevState.levels.length) {
  //             return {
  //               ...prevState,
  //               currentLevelIndex: nextLevelIndex,
  //               timeRemaining: prevState.levels[nextLevelIndex].duration * 60,
  //             };
  //           } else {
  //             // Tournament ended
  //             return {
  //               ...prevState,
  //               isRunning: false,
  //               timeRemaining: 0,
  //             };
  //           }
  //         }
          
  //         return {
  //           ...prevState,
  //           timeRemaining: prevState.timeRemaining - 1,
  //         };
  //       });
  //     }, 1000);
  //   }

  //   return () => {
  //     if (timerRef.current) {
  //       clearInterval(timerRef.current);
  //       timerRef.current = null;
  //     }
  //   };
  // }, [state.isRunning]);
  React.useEffect(() => {
  if (!state.isRunning) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return;
  }

  // Используем requestAnimationFrame для более плавной анимации
  let lastUpdateTime = Date.now();
  let accumulatedTime = 0;
  
  const updateTimer = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateTime;
    lastUpdateTime = now;
    
    accumulatedTime += deltaTime;
    
    // Обновляем состояние только когда накопилась 1 секунда
    if (accumulatedTime >= 1000) {
      const secondsToSubtract = Math.floor(accumulatedTime / 1000);
      accumulatedTime %= 1000;
      
      setState((prevState) => {
        if (prevState.timeRemaining <= secondsToSubtract) {
          // Время вышло - переходим на следующий уровень
          const nextLevelIndex = prevState.currentLevelIndex + 1;
          if (nextLevelIndex < prevState.levels.length) {
            return {
              ...prevState,
              currentLevelIndex: nextLevelIndex,
              timeRemaining: prevState.levels[nextLevelIndex].duration * 60,
            };
          } else {
            // Турнир завершен
            return {
              ...prevState,
              isRunning: false,
              timeRemaining: 0,
            };
          }
        }
        
        return {
          ...prevState,
          timeRemaining: prevState.timeRemaining - secondsToSubtract,
        };
      });
    }
    
    if (state.isRunning) {
      timerRef.current = requestAnimationFrame(updateTimer);
    }
  };
  
  timerRef.current = requestAnimationFrame(updateTimer);
  
  return () => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  };
}, [state.isRunning]);

  // Clean up all Firebase listeners on unmount
  React.useEffect(() => {
    return () => {
      firebaseService.cleanupAllListeners();
    };
  }, [firebaseService]);

  const startTimer = () => {
    setState((prevState) => ({ ...prevState, isRunning: true }));
  };

  const pauseTimer = () => {
    setState((prevState) => ({ ...prevState, isRunning: false }));
  };

  const resetTimer = () => {
    setState((prevState) => ({
      ...prevState,
      isRunning: false,
      timeRemaining: (prevState.levels?.[prevState.currentLevelIndex]?.duration || 15) * 60,
    }));
  };

  const nextLevel = () => {
    setState((prevState) => {
      const nextLevelIndex = (prevState.currentLevelIndex || 0) + 1;
      if (nextLevelIndex < (prevState.levels || []).length) {
        return {
          ...prevState,
          currentLevelIndex: nextLevelIndex,
          timeRemaining: (prevState.levels?.[nextLevelIndex]?.duration || 15) * 60,
          isRunning: false,
        };
      }
      return prevState;
    });
  };

  const previousLevel = () => {
    setState((prevState) => {
      const prevLevelIndex = (prevState.currentLevelIndex || 0) - 1;
      if (prevLevelIndex >= 0) {
        return {
          ...prevState,
          currentLevelIndex: prevLevelIndex,
          timeRemaining: (prevState.levels?.[prevLevelIndex]?.duration || 15) * 60,
          isRunning: false,
        };
      }
      return prevState;
    });
  };

  const updateLevel = (id: number, levelUpdates: Partial<BlindLevel>) => {
    setState((prevState) => ({
      ...prevState,
      levels: (prevState.levels || []).map((level) =>
        level.id === id ? { ...level, ...levelUpdates } : level
      ),
    }));
  };

  const addLevel = (level: Omit<BlindLevel, "id">) => {
    setState((prevState) => {
      const newId = Math.max(0, ...(prevState.levels || []).map((l) => l.id || 0)) + 1;
      return {
        ...prevState,
        levels: [...(prevState.levels || []), { ...level, id: newId }].sort((a, b) => (a.id || 0) - (b.id || 0)),
      };
    });
  };

  const removeLevel = (id: number) => {
    setState((prevState) => ({
      ...prevState,
      levels: (prevState.levels || []).filter((level) => level.id !== id),
    }));
  };

  const addPlayer = (name: string) => {
    setState((prevState) => {
      const newId = (prevState.players || []).length > 0 
        ? Math.max(...(prevState.players || []).map((p) => p.id || 0)) + 1 
        : 1;
      return {
        ...prevState,
        players: [
          ...(prevState.players || []),
          { 
            id: newId, 
            name, 
            initialChips: prevState.initialChips || 0, 
            rebuys: 0, 
            addons: 0,
            isEliminated: false,
            eliminationOrder: null,
            bountyChips: 0,
            paidAmount: 0
          },
        ],
        lastUpdated: Date.now() // Add timestamp for Firebase sync
      };
    });
  };

  // Исправляем функции для работы с игроками - делаем их максимально простыми
  // const addRebuy = (playerId: number) => {
  //   setState(prevState => {
  //     // Создаем новый массив игроков
  //     const newPlayers = prevState.players.map(player => {
  //       // Если это нужный игрок, увеличиваем количество ребаев
  //       if (player.id === playerId) {
  //         return {
  //           ...player,
  //           rebuys: (player.rebuys || 0) + 1
  //         };
  //       }
  //       // Иначе возвращаем игрока без изменений
  //       return player;
  //     });
      
  //     // Возвращаем новое состояние с обновленным массивом игроков
  //     return {
  //       ...prevState,
  //       players: newPlayers,
  //       lastUpdated: Date.now()
  //     };
  //   });
  // };

  // const addAddon = (playerId: number) => {
  //   setState(prevState => {
  //     // Создаем новый массив игроков
  //     const newPlayers = prevState.players.map(player => {
  //       // Если это нужный игрок, увеличиваем количество аддонов
  //       if (player.id === playerId) {
  //         return {
  //           ...player,
  //           addons: (player.addons || 0) + 1
  //         };
  //       }
  //       // Иначе возвращаем игрока без изменений
  //       return player;
  //     });
      
  //     // Возвращаем новое состояние с обновленным массивом игроков
  //     return {
  //       ...prevState,
  //       players: newPlayers,
  //       lastUpdated: Date.now()
  //     };
  //   });
  // };

  // const eliminatePlayer = (playerId: number) => {
  //   // Проверяем, что playerId - это валидное число
  //   if (typeof playerId !== 'number' || isNaN(playerId)) {
  //     console.error("Invalid player ID:", playerId);
  //     return;
  //   }
    
  //   setState(prevState => {
  //     // Проверяем, что массив players существует
  //     if (!prevState.players || !Array.isArray(prevState.players)) {
  //       console.error("Players array is undefined or not an array");
  //       return prevState;
  //     }
      
  //     // Находим игрока с дополнительной проверкой
  //     const playerToEliminate = prevState.players.find(p => p && p.id === playerId);
      
  //     // Если игрок не найден или уже выбыл, возвращаем текущее состояние
  //     if (!playerToEliminate) {
  //       console.error("Player not found:", playerId);
  //       return prevState;
  //     }
      
  //     if (playerToEliminate.isEliminated) {
  //       console.warn("Player already eliminated:", playerId);
  //       return prevState;
  //     }
      
  //     // Вычисляем новый порядок выбывания
  //     const nextEliminationOrder = (prevState.eliminationCount || 0) + 1;
      
  //     // Создаем новый массив игроков
  //     const newPlayers = prevState.players.map(player => {
  //       // Дополнительная проверка на существование player
  //       if (!player) return player;
        
  //       // Если это нужный игрок, отмечаем его как выбывшего
  //       if (player.id === playerId) {
  //         return {
  //           ...player,
  //           isEliminated: true,
  //           eliminationOrder: nextEliminationOrder
  //         };
  //       }
  //       // Иначе возвращаем игрока без изменений
  //       return player;
  //     });
      
  //     // Возвращаем новое состояние с обновленным массивом игроков
  //     return {
  //       ...prevState,
  //       players: newPlayers,
  //       eliminationCount: nextEliminationOrder,
  //       lastUpdated: Date.now()
  //     };
  //   });
  // };

  // const revivePlayer = (playerId: number) => {
  //   // Проверяем, что playerId - это валидное число
  //   if (typeof playerId !== 'number' || isNaN(playerId)) {
  //     console.error("Invalid player ID:", playerId);
  //     return;
  //   }
    
  //   setState(prevState => {
  //     // Проверяем, что массив players существует
  //     if (!prevState.players || !Array.isArray(prevState.players)) {
  //       console.error("Players array is undefined or not an array");
  //       return prevState;
  //     }
      
  //     // Находим игрока с дополнительной проверкой
  //     const playerToRevive = prevState.players.find(p => p && p.id === playerId);
      
  //     // Если игрок не найден или не выбыл, возвращаем текущее состояние
  //     if (!playerToRevive) {
  //       console.error("Player not found:", playerId);
  //       return prevState;
  //     }
      
  //     if (!playerToRevive.isEliminated) {
  //       console.warn("Player is not eliminated:", playerId);
  //       return prevState;
  //     }
      
  //     // Получаем порядок выбывания игрока
  //     const eliminationOrder = playerToRevive.eliminationOrder;
      
  //     // Создаем новый массив игроков с дополнительными проверками
  //     const newPlayers = prevState.players.map(player => {
  //       // Дополнительная проверка на существование player
  //       if (!player) return player;
        
  //       if (player.id === playerId) {
  //         // Возвращаем игрока в игру и добавляем ребай
  //         return {
  //           ...player,
  //           isEliminated: false,
  //           eliminationOrder: null,
  //           rebuys: (player.rebuys || 0) + 1
  //         };
  //       } else if (player.eliminationOrder && eliminationOrder && player.eliminationOrder > eliminationOrder) {
  //         // Уменьшаем порядок выбывания для игроков, выбывших после этого
  //         return {
  //           ...player,
  //           eliminationOrder: player.eliminationOrder - 1
  //         };
  //       }
  //       // Иначе возвращаем игрока без изменений
  //       return player;
  //     });
      
  //     // Возвращаем новое состояние с обновленным массивом игроков
  //     return {
  //       ...prevState,
  //       players: newPlayers,
  //       eliminationCount: Math.max(0, (prevState.eliminationCount || 0) - 1),
  //       lastUpdated: Date.now()
  //     };
  //   });
  // };

  // const removePlayer = (playerId: number) => {
  //   setState(prevState => {
  //     // Фильтруем массив игроков, исключая игрока с указанным id
  //     const newPlayers = prevState.players.filter(player => player.id !== playerId);
      
  //     // Возвращаем новое состояние с обновленным массивом игроков
  //     return {
  //       ...prevState,
  //       players: newPlayers,
  //       lastUpdated: Date.now()
  //     };
  //   });
  // };

  const resetEliminations = () => {
    setState((prevState) => ({
      ...prevState,
      eliminationCount: 0,
      players: (prevState.players || []).map((player) => ({
        ...player,
        isEliminated: false,
        eliminationOrder: null
      })),
    }));
  };

  const updateBackgroundImage = (imageUrl: string | null) => {
    setState((prevState) => ({
      ...prevState,
      backgroundImage: imageUrl,
      lastUpdated: Date.now() // Add timestamp for Firebase sync
    }));
  };

  const updateClubLogo = (imageUrl: string | null) => {
    setState((prevState) => ({
      ...prevState,
      clubLogo: imageUrl,
      lastUpdated: Date.now() // Add timestamp for Firebase sync
    }));
  };

  const updateEntryFee = (fee: number) => {
    setState((prevState) => ({
      ...prevState,
      entryFee: fee,
    }));
  };

  const updateRebuyFee = (fee: number) => {
    setState((prevState) => ({
      ...prevState,
      rebuyFee: fee,
    }));
  };

  const updateAddonFee = (fee: number) => {
    setState((prevState) => ({
      ...prevState,
      addonFee: fee,
    }));
  };

  const addBountyChips = (playerId: number, amount: number) => {
    // Проверяем, что playerId - это число
    if (typeof playerId !== 'number' || isNaN(playerId)) {
      console.error("Invalid player ID:", playerId);
      return;
    }
    
    // Проверяем, что amount - это число
    const bountyAmount = Number(amount) || 0;
    
    setState((prevState) => {
      // Проверяем, существует ли игрок
      const playerExists = prevState.players.some(p => p.id === playerId);
      if (!playerExists) {
        console.error("Player not found:", playerId);
        return prevState;
      }
      
      return {
        ...prevState,
        players: prevState.players.map((player) =>
          player.id === playerId
            ? { ...player, bountyChips: bountyAmount }
            : player
        ),
        lastUpdated: Date.now()
      };
    });
  };

  // Manual sync function with timeout and error handling
  // const syncData = useCallback(async (timeoutMs: number = 10000) => {
  //   try {
  //     setIsLoading(true);
  //     setSaveStatus('saving');
      
  //     // Try to get active tournament with increased timeout
  //     const activeTournament = await firebaseService.getActiveTournament(30000); // 30s timeout
      
  //     if (activeTournament) {
  //       // Проверяем, что полученное состояние новее текущего
  //       if (activeTournament.lastUpdated > state.lastUpdated) {
  //         setState(activeTournament);
  //       } else {
  //         // Если наше состояние новее, отправляем его на сервер
  //         await firebaseService.updateActiveTournament(state);
  //       }
        
  //       setLastSyncTime(Date.now());
  //       setSaveStatus('success');
        
  //       // Также сохраняем в localStorage как резервную копию
  //       localStorage.setItem("tournamentState", JSON.stringify(
  //         activeTournament.lastUpdated > state.lastUpdated ? activeTournament : state
  //       ));
  //     } else {
  //       // Если нет активного турнира, создаем его с текущим состоянием
  //       await firebaseService.createTournament(state.name || "Новый турнир", state);
  //       setSaveStatus('success');
  //     }
  //   } catch (error) {
  //     console.error("Failed to sync tournament state:", error);
  //     setSaveStatus('error');
  //   } finally {
  //     setIsLoading(false);
      
  //     // Сбрасываем статус через задержку
  //     setTimeout(() => {
  //       setSaveStatus('idle');
  //     }, 2000);
  //   }
  // }, []);

  const recordPayment = (playerId: number, amount: number) => {
    // Проверяем, что playerId - это число
    if (typeof playerId !== 'number' || isNaN(playerId)) {
      console.error("Invalid player ID:", playerId);
      return;
    }
    
    // Проверяем, что amount - это число
    const paymentAmount = Number(amount) || 0;
    if (paymentAmount <= 0) {
      console.error("Invalid payment amount:", amount);
      return;
    }
    
    setState((prevState) => {
      // Проверяем, существует ли игрок
      const playerExists = prevState.players.some(p => p.id === playerId);
      if (!playerExists) {
        console.error("Player not found:", playerId);
        return prevState;
      }
      
      return {
        ...prevState,
        players: prevState.players.map((player) =>
          player.id === playerId
            ? { ...player, paidAmount: (player.paidAmount || 0) + paymentAmount }
            : player
        ),
        lastUpdated: Date.now()
      };
    });
  };

  // Add function to create a new tournament
  const createNewTournament = async (name: string = "Новый турнир") => {
    try {
      const newState = {
        ...defaultState,
        lastUpdated: Date.now()
      };
      
      const tournamentId = await firebaseService.createTournament(name, newState);
      setState(newState);
      
      return tournamentId;
    } catch (error) {
      console.error("Failed to create new tournament:", error);
      return null;
    }
  };

  // Add function to load a tournament
  const loadTournament = async (id: string) => {
    try {
      const tournamentData = await firebaseService.setActiveTournament(id);
      if (tournamentData) {
        setState(tournamentData);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to load tournament:", error);
      return false;
    }
  };

  // Add function to get all tournaments
  const getAllTournaments = async () => {
    try {
      return await firebaseService.getAllTournaments();
    } catch (error) {
      console.error("Failed to get all tournaments:", error);
      return [];
    }
  };

  // Add function to delete a tournament
  const deleteTournament = async (id: string) => {
    try {
      await firebaseService.deleteTournament(id);
      return true;
    } catch (error) {
      console.error("Failed to delete tournament:", error);
      return false;
    }
  };

  const updatePlayerName = (playerId: number, name: string) => {
    setState((prevState) => ({
      ...prevState,
      players: (prevState.players || []).map((player) =>
        player.id === playerId
          ? { ...player, name: name || player.name }
          : player
      ),
      lastUpdated: Date.now() // Add timestamp for Firebase sync
    }));
  };

  const updateInitialChips = (chips: number) => {
    setState((prevState) => ({
      ...prevState,
      initialChips: chips,
      lastUpdated: Date.now() // Add timestamp for Firebase sync
    }));
  };

  const updateRebuyChips = (chips: number) => {
    setState((prevState) => ({
      ...prevState,
      rebuyChips: chips,
      lastUpdated: Date.now() // Add timestamp for Firebase sync
    }));
  };

  const updateAddonChips = (chips: number) => {
    setState((prevState) => ({
      ...prevState,
      addonChips: chips,
      lastUpdated: Date.now() // Add timestamp for Firebase sync
    }));
  };

  const value = {
    state,
    startTimer,
    pauseTimer,
    resetTimer,
    nextLevel,
    previousLevel,
    updateLevel,
    addLevel,
    removeLevel,
    addPlayer,
    removePlayer,
    addRebuy,
    addAddon,
    updateInitialChips,
    updateRebuyChips,
    updateAddonChips,
    eliminatePlayer,
    revivePlayer,
    resetEliminations,
    updateBackgroundImage,
    updateClubLogo,
    updateEntryFee,
    updateRebuyFee,
    updateAddonFee,
    addBountyChips,
    syncData,
    recordPayment,
    createNewTournament,
    loadTournament,
    getAllTournaments,
    deleteTournament,
    isLoading,
    lastSyncTime,
    saveStatus,
    updatePlayerName,
    forceSave,
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => React.useContext(TournamentContext);