import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, get, update, off } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import type { TournamentState } from '../components/tournament-context';

// Improved Firebase configuration loader with better error handling
const getFirebaseConfig = () => {
  const savedConfig = localStorage.getItem('firebaseConfig');
  
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig);
      // Validate required fields
      if (config.apiKey && config.databaseURL) {
        return config;
      }
      console.warn('Firebase config is incomplete, using default');
    } catch (e) {
      console.error('Failed to parse Firebase config:', e);
    }
  }
  
  // Return default config if no saved config or invalid
  return {
    apiKey: "AIzaSyC8zxpHste913EgSIzFQDc7ytPBZvi-KEM",
    authDomain: "pokernoirtest.firebaseapp.com",
    databaseURL: "https://pokernoirtest-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "pokernoirtest",
    storageBucket: "pokernoirtest.firebasestorage.app",
    messagingSenderId: "882086485765",
    appId: "1:882086485765:web:7785a03346df4dd55d616c"
  };
};

// Initialize Firebase with config from localStorage
let app;
let database;

try {
  const firebaseConfig = getFirebaseConfig();
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

// Define the database schema
interface DbTournament {
  id: string;
  name: string;
  createdAt: number;
  lastUpdated: number;
  data: TournamentState;
}

// Отключаем автоматическую синхронизацию с Firebase, чтобы исключить её влияние
class FirebaseService {
  private static instance: FirebaseService;
  private isInitialized = false;
  private changeListeners: ((data: TournamentState) => void)[] = [];
  private activeListeners: { [path: string]: boolean } = {};

  // Добавляем переменные для отслеживания обновлений
  private pendingUpdate: TournamentState | null = null;
  private updateDebounceTimer: NodeJS.Timeout | null = null;
  private lastUpdateTime = 0;
  private updateLock = false;
  
  // Добавляем константу для дефолтного состояния
  private defaultState: TournamentState = {
    levels: [],
    currentLevelIndex: 0,
    timeRemaining: 900,
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
  };

  private constructor() {}

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  // Initialize the database and set up listeners
  public async init(): Promise<void> {
    if (this.isInitialized || !database) return;
    
    try {
      // Check if there's an active tournament ID in localStorage
      const activeId = localStorage.getItem('activeTournamentId');
      
      if (activeId) {
        // Set up listener for the active tournament
        this.setupTournamentListener(activeId);
      }
      
      // Set up listener for active tournament ID changes
      const activeIdRef = ref(database, 'activeTournamentId');
      
      // Remove any existing listeners first
      off(activeIdRef);
      
      onValue(activeIdRef, (snapshot) => {
        const newActiveId = snapshot.val();
        
        if (newActiveId) {
          localStorage.setItem('activeTournamentId', newActiveId);
          this.setupTournamentListener(newActiveId);
        } else {
          localStorage.removeItem('activeTournamentId');
        }
      }, (error) => {
        console.error("Error listening to active tournament ID:", error);
      });
      
      this.isInitialized = true;
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
    }
  }

  // Set up listener for a specific tournament with cleanup
  private setupTournamentListener(tournamentId: string): void {
    if (!database) return;
    
    // Clean up any existing listener for this tournament
    this.cleanupListener(`tournaments/${tournamentId}`);
    
    const tournamentRef = ref(database, `tournaments/${tournamentId}`);
    this.activeListeners[`tournaments/${tournamentId}`] = true;
    
    onValue(tournamentRef, (snapshot) => {
      const tournament = snapshot.val() as DbTournament | null;
      
      if (tournament) {
        // Проверяем, не является ли это обновление результатом нашего собственного изменения
        if (tournament.data.lastUpdated <= this.lastUpdateTime) {
          console.log("Ignoring own update");
          return;
        }
        
        // Notify all listeners of the change
        this.changeListeners.forEach(listener => {
          try {
            listener(tournament.data);
          } catch (error) {
            console.error("Error in tournament change listener:", error);
          }
        });
      }
    }, (error) => {
      console.error(`Error listening to tournament ${tournamentId}:`, error);
    });
  }

  // Clean up a specific listener
  private cleanupListener(path: string): void {
    if (!database || !this.activeListeners[path]) return;
    
    try {
      off(ref(database, path));
      delete this.activeListeners[path];
    } catch (error) {
      console.error(`Error cleaning up listener for ${path}:`, error);
    }
  }

  // Clean up all listeners
  public cleanupAllListeners(): void {
    Object.keys(this.activeListeners).forEach(path => {
      this.cleanupListener(path);
    });
  }

  // Create a new tournament with error handling
  public async createTournament(name: string, initialData: TournamentState): Promise<string> {
    await this.ensureInitialized();
    
    if (!database) throw new Error("Firebase database not initialized");
    
    const id = uuidv4();
    const timestamp = Date.now();
    
    const tournament: DbTournament = {
      id,
      name,
      createdAt: timestamp,
      lastUpdated: timestamp,
      data: initialData
    };
    
    try {
      // Save the tournament to Firebase
      await set(ref(database, `tournaments/${id}`), tournament);
      
      // Set as active tournament
      await set(ref(database, 'activeTournamentId'), id);
      
      return id;
    } catch (error) {
      console.error("Error creating tournament:", error);
      throw error;
    }
  }

  // Get the active tournament with timeout
  public async getActiveTournament(timeout = 15000): Promise<TournamentState | null> {
    await this.ensureInitialized();
    
    if (!database) return null;
    
    try {
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error("Firebase operation timed out")), timeout);
      });
      
      // Create the actual operation promise
      const operationPromise = async () => {
        try {
          // Get the active tournament ID
          const activeIdSnapshot = await get(ref(database, 'activeTournamentId'));
          const activeId = activeIdSnapshot.val();
          
          if (!activeId) {
            console.log("No active tournament ID found, creating a new one");
            return null;
          }
          
          // Get the tournament data
          const tournamentSnapshot = await get(ref(database, `tournaments/${activeId}`));
          const tournament = tournamentSnapshot.val() as DbTournament | null;
          
          if (!tournament) {
            console.log(`Tournament with ID ${activeId} not found`);
            return null;
          }
          
          console.log(`Successfully retrieved tournament: ${tournament.name}`);
          return tournament.data;
        } catch (error) {
          console.error("Error in operationPromise:", error);
          throw error;
        }
      };
      
      // Race the operation against the timeout
      return await Promise.race([operationPromise(), timeoutPromise]);
    } catch (error) {
      console.error("Error getting active tournament:", error);
      
      // Try to recover by checking if there's a locally stored active ID
      try {
        const localActiveId = localStorage.getItem('activeTournamentId');
        if (localActiveId && database) {
          console.log("Attempting recovery with locally stored tournament ID");
          const tournamentSnapshot = await get(ref(database, `tournaments/${localActiveId}`));
          const tournament = tournamentSnapshot.val() as DbTournament | null;
          
          if (tournament) {
            console.log("Recovery successful");
            return tournament.data;
          }
        }
      } catch (recoveryError) {
        console.error("Recovery attempt failed:", recoveryError);
      }
      
      return null;
    }
  }

  // Update the active tournament with improved error handling and logging
  public async updateActiveTournament(data: TournamentState): Promise<void> {
    // Сохраняем данные локально для резервной копии
    try {
      localStorage.setItem("tournamentState", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
    
    // Если Firebase не инициализирован, выходим
    if (!database) {
      console.log("Firebase not initialized, skipping update");
      return;
    }
    
    // Обновляем время последнего обновления
    this.lastUpdateTime = Date.now();
    
    try {
      // Выполняем обновление немедленно
      await this.performUpdate(data);
      console.log("Tournament data saved to Firebase");
    } catch (error) {
      console.error("Failed to save to Firebase:", error);
      
      // Сохраняем неудачное обновление для последующей повторной попытки
      localStorage.setItem("failedUpdate", JSON.stringify(data));
      
      // Повторяем попытку через 5 секунд
      setTimeout(async () => {
        try {
          await this.performUpdate(data);
          console.log("Retry successful: Tournament data saved to Firebase");
          localStorage.removeItem("failedUpdate");
        } catch (retryError) {
          console.error("Retry failed:", retryError);
        }
      }, 5000);
      
      throw error;
    }
  }
  
  private async performUpdate(data: TournamentState): Promise<void> {
    await this.ensureInitialized();
    
    if (!database) {
      throw new Error("Firebase database not initialized");
    }
    
    try {
      // Получаем ID активного турнира
      const activeIdSnapshot = await get(ref(database, 'activeTournamentId'));
      const activeId = activeIdSnapshot.val();
      
      if (!activeId) {
        console.log("No active tournament found, creating a new one");
        const newId = await this.createTournament("Новый турнир", data);
        console.log(`Created new tournament with ID: ${newId}`);
        return;
      }
      
      // Проверяем, что данные содержат все необходимые поля
      const safeData = this.ensureCompleteData(data);
      
      // Обновляем данные турнира с временной меткой
      const updates = {
        [`tournaments/${activeId}/data`]: safeData,
        [`tournaments/${activeId}/lastUpdated`]: Date.now()
      };
      
      await update(ref(database), updates);
      
      // Очищаем сохраненные неудачные обновления
      localStorage.removeItem('failedUpdate');
    } catch (error) {
      console.error("Error updating active tournament:", error);
      throw error;
    }
  }

  // Добавляем метод для проверки полноты данных
  private ensureCompleteData(data: TournamentState): TournamentState {
    // Загружаем дефолтное состояние из localStorage или используем встроенное
    let defaultState: TournamentState;
    try {
      const savedDefault = localStorage.getItem("defaultTournamentState");
      if (savedDefault) {
        defaultState = JSON.parse(savedDefault);
      } else {
        defaultState = this.defaultState;
      }
    } catch (error) {
      console.error("Error loading default state:", error);
      defaultState = this.defaultState;
    }
    
    // Проверяем и заполняем все поля
    return {
      levels: data.levels || defaultState.levels || [],
      currentLevelIndex: data.currentLevelIndex ?? defaultState.currentLevelIndex ?? 0,
      timeRemaining: data.timeRemaining ?? defaultState.timeRemaining ?? 900,
      isRunning: data.isRunning ?? defaultState.isRunning ?? false,
      players: data.players || defaultState.players || [],
      initialChips: data.initialChips ?? defaultState.initialChips ?? 10000,
      rebuyChips: data.rebuyChips ?? defaultState.rebuyChips ?? 10000,
      addonChips: data.addonChips ?? defaultState.addonChips ?? 15000,
      eliminationCount: data.eliminationCount ?? defaultState.eliminationCount ?? 0,
      backgroundImage: data.backgroundImage ?? defaultState.backgroundImage ?? null,
      clubLogo: data.clubLogo ?? defaultState.clubLogo ?? null,
      entryFee: data.entryFee ?? defaultState.entryFee ?? 1000,
      rebuyFee: data.rebuyFee ?? defaultState.rebuyFee ?? 1000,
      addonFee: data.addonFee ?? defaultState.addonFee ?? 1500,
      lastUpdated: data.lastUpdated ?? Date.now(),
    };
  }

  // Get all tournaments with error handling
  public async getAllTournaments(): Promise<{ id: string; name: string; createdAt: number }[]> {
    await this.ensureInitialized();
    
    if (!database) return [];
    
    try {
      const tournamentsSnapshot = await get(ref(database, 'tournaments'));
      const tournaments = tournamentsSnapshot.val() as Record<string, DbTournament> | null;
      
      if (!tournaments) return [];
      
      return Object.values(tournaments).map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        createdAt: tournament.createdAt
      }));
    } catch (error) {
      console.error("Error getting all tournaments:", error);
      return [];
    }
  }

  // Set the active tournament with error handling
  public async setActiveTournament(id: string): Promise<TournamentState | null> {
    await this.ensureInitialized();
    
    if (!database) return null;
    
    try {
      // Check if the tournament exists
      const tournamentSnapshot = await get(ref(database, `tournaments/${id}`));
      const tournament = tournamentSnapshot.val() as DbTournament | null;
      
      if (!tournament) return null;
      
      // Set as active tournament
      await set(ref(database, 'activeTournamentId'), id);
      
      return tournament.data;
    } catch (error) {
      console.error("Error setting active tournament:", error);
      return null;
    }
  }

  // Delete a tournament with error handling
  public async deleteTournament(id: string): Promise<void> {
    await this.ensureInitialized();
    
    if (!database) return;
    
    try {
      // Delete the tournament
      await remove(ref(database, `tournaments/${id}`));
      
      // If it was the active tournament, clear the active ID
      const activeIdSnapshot = await get(ref(database, 'activeTournamentId'));
      const activeId = activeIdSnapshot.val();
      
      if (activeId === id) {
        await set(ref(database, 'activeTournamentId'), null);
      }
    } catch (error) {
      console.error("Error deleting tournament:", error);
    }
  }

  // Добавляем метод для принудительного удаления данных
  public async forceDeleteTournament(id: string): Promise<boolean> {
    await this.ensureInitialized();
    
    if (!database) return false;
    
    try {
      // Принудительно удаляем турнир, игнорируя блокировки
      await remove(ref(database, `tournaments/${id}`));
      
      // Проверяем, был ли это активный турнир
      const activeIdSnapshot = await get(ref(database, 'activeTournamentId'));
      const activeId = activeIdSnapshot.val();
      
      if (activeId === id) {
        await set(ref(database, 'activeTournamentId'), null);
      }
      
      return true;
    } catch (error) {
      console.error("Error force deleting tournament:", error);
      return false;
    }
  }
  
  // Добавляем метод для сброса всех данных Firebase
  public async resetAllData(): Promise<boolean> {
    await this.ensureInitialized();
    
    if (!database) return false;
    
    try {
      // Удаляем все данные
      await set(ref(database), null);
      return true;
    } catch (error) {
      console.error("Error resetting all Firebase data:", error);
      return false;
    }
  }

  // Add a change listener
  public addChangeListener(listener: (data: TournamentState) => void): void {
    if (!this.changeListeners.includes(listener)) {
      this.changeListeners.push(listener);
    }
  }

  // Remove a change listener
  public removeChangeListener(listener: (data: TournamentState) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index !== -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  // Private method to ensure the database is initialized with retry
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    
    let retries = 3;
    while (retries > 0) {
      try {
        await this.init();
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error("Failed to initialize Firebase after multiple attempts:", error);
          throw error;
        }
        console.log(`Initialization failed, retrying... (${retries} attempts left)`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

export default FirebaseService;