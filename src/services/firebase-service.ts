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

class FirebaseService {
  private static instance: FirebaseService;
  private isInitialized = false;
  private changeListeners: ((data: TournamentState) => void)[] = [];
  private activeListeners: { [path: string]: boolean } = {};

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
  public async getActiveTournament(timeout = 5000): Promise<TournamentState | null> {
    await this.ensureInitialized();
    
    if (!database) return null;
    
    try {
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error("Firebase operation timed out")), timeout);
      });
      
      // Create the actual operation promise
      const operationPromise = async () => {
        // Get the active tournament ID
        const activeIdSnapshot = await get(ref(database, 'activeTournamentId'));
        const activeId = activeIdSnapshot.val();
        
        if (!activeId) return null;
        
        // Get the tournament data
        const tournamentSnapshot = await get(ref(database, `tournaments/${activeId}`));
        const tournament = tournamentSnapshot.val() as DbTournament | null;
        
        return tournament ? tournament.data : null;
      };
      
      // Race the operation against the timeout
      return await Promise.race([operationPromise(), timeoutPromise]);
    } catch (error) {
      console.error("Error getting active tournament:", error);
      return null;
    }
  }

  // Update the active tournament with debounce
  private updateDebounceTimer: NodeJS.Timeout | null = null;
  private pendingUpdate: TournamentState | null = null;
  
  public async updateActiveTournament(data: TournamentState): Promise<void> {
    // Store the latest update
    this.pendingUpdate = data;
    
    // Clear existing timer
    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer);
    }
    
    // Set a new timer
    this.updateDebounceTimer = setTimeout(async () => {
      if (!this.pendingUpdate) return;
      
      await this.performUpdate(this.pendingUpdate);
      this.pendingUpdate = null;
    }, 300); // 300ms debounce
  }
  
  private async performUpdate(data: TournamentState): Promise<void> {
    await this.ensureInitialized();
    
    if (!database) return;
    
    try {
      // Get the active tournament ID
      const activeIdSnapshot = await get(ref(database, 'activeTournamentId'));
      const activeId = activeIdSnapshot.val();
      
      if (!activeId) return;
      
      // Update the tournament data with timestamp
      const updates = {
        [`tournaments/${activeId}/data`]: data,
        [`tournaments/${activeId}/lastUpdated`]: Date.now()
      };
      
      await update(ref(database), updates);
    } catch (error) {
      console.error("Error updating active tournament:", error);
    }
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

  // Private method to ensure the database is initialized
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }
}

export default FirebaseService;