import type { TournamentState } from "../components/tournament-context";

// Remove or fix the safeRender function that's causing the error
export const safeRender = (obj: any): string => {
  // Instead of returning the object directly, return a string representation
  if (obj === null || obj === undefined) {
    return '';
  }
  
  if (typeof obj === 'object') {
    return JSON.stringify(obj);
  }
  
  return String(obj);
};

export const useTournamentStorage = () => {
  // Add function to get all tournaments
  const getAllTournaments = () => {
    try {
      const tournamentList = localStorage.getItem("tournamentList");
      if (tournamentList) {
        return JSON.parse(tournamentList) as Array<{id: string, name: string, createdAt: number}>;
      }
      return [];
    } catch (e) {
      console.error("Failed to get tournaments list", e);
      return [];
    }
  };

  // Modified to save tournament with ID
  const saveTournament = (state: TournamentState) => {
    try {
      const stateWithTimestamp = {
        ...state,
        lastUpdated: Date.now()
      };
      
      // Save current tournament state
      localStorage.setItem("tournamentState", JSON.stringify(stateWithTimestamp));
      
      // If this tournament has an ID, also save it to its specific storage
      if (state.id) {
        localStorage.setItem(`tournament_${state.id}`, JSON.stringify(stateWithTimestamp));
      }
      
      return true;
    } catch (e) {
      console.error("Failed to save tournament state", e);
      return false;
    }
  };

  // Modified to create a new tournament with ID
  const createNewTournament = (name: string = "Новый турнир") => {
    try {
      // Generate a unique ID
      const id = Date.now().toString();
      
      // Create new tournament state
      const newState = {
        ...defaultState,
        id,
        name,
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
      
      // Save the new tournament
      localStorage.setItem("tournamentState", JSON.stringify(newState));
      localStorage.setItem(`tournament_${id}`, JSON.stringify(newState));
      
      // Update tournament list
      const tournamentList = getAllTournaments();
      const updatedList = [
        ...tournamentList,
        { id, name, createdAt: Date.now() }
      ];
      localStorage.setItem("tournamentList", JSON.stringify(updatedList));
      
      // Return the new state object
      return newState;
    } catch (e) {
      console.error("Failed to create new tournament", e);
      return null;
    }
  };

  // Add function to load a specific tournament
  const loadTournament = (id: string) => {
    try {
      const savedState = localStorage.getItem(`tournament_${id}`);
      if (savedState) {
        const parsedState = JSON.parse(savedState) as TournamentState;
        localStorage.setItem("tournamentState", savedState); // Set as current tournament
        return parsedState;
      }
      return null;
    } catch (e) {
      console.error("Failed to load tournament", e);
      return null;
    }
  };

  // Add function to delete a tournament
  const deleteTournament = (id: string) => {
    try {
      // Remove from specific storage
      localStorage.removeItem(`tournament_${id}`);
      
      // Update tournament list
      const tournamentList = getAllTournaments();
      const updatedList = tournamentList?.filter(t => t.id !== id) || [];
      localStorage.setItem("tournamentList", JSON.stringify(updatedList));
      
      return true;
    } catch (e) {
      console.error("Failed to delete tournament", e);
      return false;
    }
  };

  // Modified to just get current tournament state without setting state
  const syncData = () => {
    try {
      const savedState = localStorage.getItem("tournamentState");
      if (savedState) {
        return JSON.parse(savedState) as TournamentState;
      }
      return null;
    } catch (e) {
      console.error("Failed to sync tournament state", e);
      return null;
    }
  };

  return {
    saveTournament,
    loadTournament,
    syncData,
    createNewTournament,
    getAllTournaments,
    deleteTournament
  };
};

// Add default state here to avoid circular dependency
const defaultLevels = [
  { id: 1, type: 'level' as const, smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
  { id: 2, type: 'level' as const, smallBlind: 50, bigBlind: 100, ante: 0, duration: 15 },
  { id: 3, type: 'level' as const, smallBlind: 75, bigBlind: 150, ante: 0, duration: 15 },
  { id: 4, type: 'level' as const, smallBlind: 100, bigBlind: 200, ante: 25, duration: 15 },
  { id: 5, type: 'level' as const, smallBlind: 150, bigBlind: 300, ante: 25, duration: 15 },
  { id: 6, type: 'level' as const, smallBlind: 200, bigBlind: 400, ante: 50, duration: 15 },
  { id: 7, type: 'level' as const, smallBlind: 300, bigBlind: 600, ante: 75, duration: 15 },
  { id: 8, type: 'level' as const, smallBlind: 400, bigBlind: 800, ante: 100, duration: 15 },
  { id: 9, type: 'level' as const, smallBlind: 500, bigBlind: 1000, ante: 125, duration: 15 },
  { id: 10, type: 'level' as const, smallBlind: 700, bigBlind: 1400, ante: 150, duration: 15 },
];

export const defaultState = {
  id: "",
  name: "Новый турнир",
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
  entryFee: 1000,
  rebuyFee: 1000,
  addonFee: 1500,
  lastUpdated: Date.now(),
  createdAt: Date.now(),
};

// Add a function to create a new tournament without returning the state object
export const createNewTournamentInStorage = (name: string = "Новый турнир"): TournamentState | void => {
  try {
    const id = generateUniqueId();
    const timestamp = Date.now();
    const newTournament: TournamentState = {
      ...defaultState,
      id,
      name,
      createdAt: timestamp,
      lastUpdated: timestamp
    };
    
    // Save the new tournament
    saveTournamentToStorage(newTournament);
    
    // Return the new tournament data but NOT as a React child
    return newTournament;
  } catch (error) {
    console.error("Failed to create new tournament:", error);
  }
};
