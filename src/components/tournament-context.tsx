import React from "react";
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
  addBountyChips: (playerId: number, amount: number) => void;
  syncData: () => void; // New function for manual sync
  recordPayment: (playerId: number, amount: number) => void; // New function to record payments
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
  
  // Update the ref whenever state changes
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Use ref for Firebase service to avoid recreation
  const firebaseService = React.useMemo(() => FirebaseService.getInstance(), []);
  
  // Initialize Firebase and load active tournament
  React.useEffect(() => {
    let isMounted = true;
    
    const initFirebase = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      try {
        await firebaseService.init();
        const activeTournament = await firebaseService.getActiveTournament();
        
        if (activeTournament && isMounted) {
          setState(activeTournament);
          setLastSyncTime(Date.now());
        } else if (isMounted) {
          // If no active tournament, create a new one
          try {
            const newState = {
              ...defaultState,
              lastUpdated: Date.now()
            };
            
            await firebaseService.createTournament("Новый турнир", newState);
            setState(newState);
          } catch (error) {
            console.error("Failed to create new tournament:", error);
          }
        }
      } catch (error) {
        console.error("Failed to initialize Firebase:", error);
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
      }
    };
    
    firebaseService.addChangeListener(handleFirebaseChange);
    
    return () => {
      isMounted = false;
      firebaseService.removeChangeListener(handleFirebaseChange);
    };
  }, [firebaseService]);

  // Save state to Firebase with debounce
  const saveDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
  
  React.useEffect(() => {
    if (isLoading) return;
    
    // Clear any existing timeout
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    
    // Set a new timeout
    saveDebounceRef.current = setTimeout(async () => {
      // Add timestamp before saving
      const stateWithTimestamp = {
        ...state,
        lastUpdated: Date.now()
      };
      
      try {
        await firebaseService.updateActiveTournament(stateWithTimestamp);
      } catch (error) {
        console.error("Failed to save tournament state:", error);
      }
    }, 500); // 500ms debounce
    
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, [state, firebaseService, isLoading]);

  // Timer logic with improved cleanup
  React.useEffect(() => {
    if (state.isRunning) {
      timerRef.current = window.setInterval(() => {
        setState((prevState) => {
          if (prevState.timeRemaining <= 1) {
            // Time's up, move to next level
            const nextLevelIndex = prevState.currentLevelIndex + 1;
            if (nextLevelIndex < prevState.levels.length) {
              return {
                ...prevState,
                currentLevelIndex: nextLevelIndex,
                timeRemaining: prevState.levels[nextLevelIndex].duration * 60,
              };
            } else {
              // Tournament ended
              return {
                ...prevState,
                isRunning: false,
                timeRemaining: 0,
              };
            }
          }
          
          return {
            ...prevState,
            timeRemaining: prevState.timeRemaining - 1,
          };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
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
      timeRemaining: prevState.levels[prevState.currentLevelIndex].duration * 60,
    }));
  };

  const nextLevel = () => {
    setState((prevState) => {
      const nextLevelIndex = prevState.currentLevelIndex + 1;
      if (nextLevelIndex < prevState.levels.length) {
        return {
          ...prevState,
          currentLevelIndex: nextLevelIndex,
          timeRemaining: prevState.levels[nextLevelIndex].duration * 60,
          isRunning: false,
        };
      }
      return prevState;
    });
  };

  const previousLevel = () => {
    setState((prevState) => {
      const prevLevelIndex = prevState.currentLevelIndex - 1;
      if (prevLevelIndex >= 0) {
        return {
          ...prevState,
          currentLevelIndex: prevLevelIndex,
          timeRemaining: prevState.levels[prevLevelIndex].duration * 60,
          isRunning: false,
        };
      }
      return prevState;
    });
  };

  const updateLevel = (id: number, levelUpdates: Partial<BlindLevel>) => {
    setState((prevState) => ({
      ...prevState,
      levels: prevState.levels.map((level) =>
        level.id === id ? { ...level, ...levelUpdates } : level
      ),
    }));
  };

  const addLevel = (level: Omit<BlindLevel, "id">) => {
    setState((prevState) => {
      const newId = Math.max(0, ...prevState.levels.map((l) => l.id)) + 1;
      return {
        ...prevState,
        levels: [...prevState.levels, { ...level, id: newId }].sort((a, b) => a.id - b.id),
      };
    });
  };

  const removeLevel = (id: number) => {
    setState((prevState) => ({
      ...prevState,
      levels: prevState.levels.filter((level) => level.id !== id),
    }));
  };

  const addPlayer = (name: string) => {
    setState((prevState) => {
      const newId = prevState.players.length > 0 
        ? Math.max(...prevState.players.map((p) => p.id)) + 1 
        : 1;
      return {
        ...prevState,
        players: [
          ...prevState.players,
          { 
            id: newId, 
            name, 
            initialChips: prevState.initialChips, 
            rebuys: 0, 
            addons: 0,
            isEliminated: false,
            eliminationOrder: null,
            bountyChips: 0,
            paidAmount: 0 // Initialize paid amount
          },
        ],
      };
    });
  };

  const removePlayer = (id: number) => {
    setState((prevState) => ({
      ...prevState,
      players: prevState.players.filter((player) => player.id !== id),
    }));
  };

  const addRebuy = (playerId: number) => {
    setState((prevState) => ({
      ...prevState,
      players: prevState.players.map((player) =>
        player.id === playerId
          ? { ...player, rebuys: player.rebuys + 1 }
          : player
      ),
    }));
  };

  const addAddon = (playerId: number) => {
    setState((prevState) => ({
      ...prevState,
      players: prevState.players.map((player) =>
        player.id === playerId
          ? { ...player, addons: player.addons + 1 }
          : player
      ),
    }));
  };

  const updateInitialChips = (chips: number) => {
    setState((prevState) => ({
      ...prevState,
      initialChips: chips,
    }));
  };

  const updateRebuyChips = (chips: number) => {
    setState((prevState) => ({
      ...prevState,
      rebuyChips: chips,
    }));
  };

  const updateAddonChips = (chips: number) => {
    setState((prevState) => ({
      ...prevState,
      addonChips: chips,
    }));
  };

  const eliminatePlayer = (playerId: number) => {
    setState((prevState) => {
      const nextEliminationOrder = prevState.eliminationCount + 1;
      return {
        ...prevState,
        eliminationCount: nextEliminationOrder,
        players: prevState.players.map((player) =>
          player.id === playerId && !player.isEliminated
            ? { ...player, isEliminated: true, eliminationOrder: nextEliminationOrder }
            : player
        ),
      };
    });
  };

  const revivePlayer = (playerId: number) => {
    setState((prevState) => {
      // Find the player to revive
      const playerToRevive = prevState.players.find(p => p.id === playerId);
      
      if (!playerToRevive || !playerToRevive.isEliminated) {
        return prevState;
      }
      
      // Get the elimination order of the player
      const eliminationOrder = playerToRevive.eliminationOrder;
      
      // Update all players with higher elimination order
      const updatedPlayers = prevState.players.map(player => {
        if (player.id === playerId) {
          // Revive this player and add a rebuy
          return { 
            ...player, 
            isEliminated: false, 
            eliminationOrder: null,
            rebuys: player.rebuys + 1 
          };
        } else if (player.eliminationOrder && eliminationOrder && player.eliminationOrder > eliminationOrder) {
          // Decrement elimination order for players eliminated after this one
          return { 
            ...player, 
            eliminationOrder: player.eliminationOrder - 1 
          };
        }
        return player;
      });
      
      return {
        ...prevState,
        eliminationCount: prevState.eliminationCount - 1,
        players: updatedPlayers,
      };
    });
  };

  const resetEliminations = () => {
    setState((prevState) => ({
      ...prevState,
      eliminationCount: 0,
      players: prevState.players.map((player) => ({
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
    }));
  };

  const updateClubLogo = (imageUrl: string | null) => {
    setState((prevState) => ({
      ...prevState,
      clubLogo: imageUrl,
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
    setState((prevState) => ({
      ...prevState,
      players: prevState.players.map((player) =>
        player.id === playerId
          ? { ...player, bountyChips: (player.bountyChips || 0) + amount }
          : player
      ),
    }));
  };

  // Manual sync function with timeout and error handling
  const syncData = async () => {
    try {
      setIsLoading(true);
      const activeTournament = await firebaseService.getActiveTournament(10000); // 10s timeout
      
      if (activeTournament) {
        setState(activeTournament);
        setLastSyncTime(Date.now());
      }
    } catch (error) {
      console.error("Failed to sync tournament state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const recordPayment = (playerId: number, amount: number) => {
    setState((prevState) => ({
      ...prevState,
      players: prevState.players.map((player) =>
        player.id === playerId
          ? { ...player, paidAmount: player.paidAmount + amount }
          : player
      ),
    }));
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
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => React.useContext(TournamentContext);