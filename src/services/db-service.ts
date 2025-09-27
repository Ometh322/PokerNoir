import { Low } from 'lowdb';
// import { JSONFile } from 'lowdb/node'; // This is causing the error - Node.js specific
import { v4 as uuidv4 } from 'uuid';
import type { TournamentState } from '../components/tournament-context';

// Define the database schema
interface DbData {
  tournaments: {
    id: string;
    name: string;
    createdAt: number;
    lastUpdated: number;
    data: TournamentState;
  }[];
  activeTournamentId: string | null;
}

// Initialize the database with default data
const defaultData: DbData = {
  tournaments: [],
  activeTournamentId: null
};

// Create a browser-compatible storage adapter
class LocalStorageAdapter {
  private key: string;
  
  constructor(key: string) {
    this.key = key;
  }
  
  async read(): Promise<DbData | null> {
    const data = localStorage.getItem(this.key);
    if (data) {
      try {
        return JSON.parse(data) as DbData;
      } catch (error) {
        return null;
      }
    }
    return null;
  }
  
  async write(data: DbData): Promise<void> {
    localStorage.setItem(this.key, JSON.stringify(data));
  }
}

// Create a class to handle database operations
class DbService {
  private db: Low<DbData>;
  private static instance: DbService;
  private isInitialized = false;
  private changeListeners: ((data: TournamentState) => void)[] = [];
  private storageKey = 'poker-tournament-db';

  private constructor() {
    // Create or load the database from localStorage
    const adapter = new LocalStorageAdapter(this.storageKey);
    this.db = new Low<DbData>(adapter, defaultData);
  }

  public static getInstance(): DbService {
    if (!DbService.instance) {
      DbService.instance = new DbService();
    }
    return DbService.instance;
  }

  // Initialize the database
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.db.read();
      
      // If the database is empty, initialize it with default data
      if (!this.db.data) {
        this.db.data = defaultData;
        await this.db.write();
      }
      
      this.isInitialized = true;
      console.log('Database initialized successfully');
      
      // Start polling for changes
      this.startPolling();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Fallback to memory-only operation
      this.db.data = defaultData;
      this.isInitialized = true;
    }
  }

  // Create a new tournament
  public async createTournament(name: string, initialData: TournamentState): Promise<string> {
    await this.ensureInitialized();
    
    const id = uuidv4();
    const timestamp = Date.now();
    
    this.db.data.tournaments.push({
      id,
      name,
      createdAt: timestamp,
      lastUpdated: timestamp,
      data: initialData
    });
    
    this.db.data.activeTournamentId = id;
    await this.db.write();
    
    return id;
  }

  // Get the active tournament
  public async getActiveTournament(): Promise<TournamentState | null> {
    await this.ensureInitialized();
    
    const activeId = this.db.data.activeTournamentId;
    if (!activeId) return null;
    
    const tournament = this.db.data.tournaments.find(t => t.id === activeId);
    return tournament ? tournament.data : null;
  }

  // Update the active tournament
  public async updateActiveTournament(data: TournamentState): Promise<void> {
    await this.ensureInitialized();
    
    const activeId = this.db.data.activeTournamentId;
    if (!activeId) return;
    
    const tournamentIndex = this.db.data.tournaments.findIndex(t => t.id === activeId);
    if (tournamentIndex === -1) return;
    
    this.db.data.tournaments[tournamentIndex].data = data;
    this.db.data.tournaments[tournamentIndex].lastUpdated = Date.now();
    
    await this.db.write();
  }

  // Get all tournaments
  public async getAllTournaments(): Promise<{ id: string; name: string; createdAt: number }[]> {
    await this.ensureInitialized();
    
    return this.db.data.tournaments.map(t => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt
    }));
  }

  // Set the active tournament
  public async setActiveTournament(id: string): Promise<TournamentState | null> {
    await this.ensureInitialized();
    
    const tournament = this.db.data.tournaments.find(t => t.id === id);
    if (!tournament) return null;
    
    this.db.data.activeTournamentId = id;
    await this.db.write();
    
    return tournament.data;
  }

  // Delete a tournament
  public async deleteTournament(id: string): Promise<void> {
    await this.ensureInitialized();
    
    const index = this.db.data.tournaments.findIndex(t => t.id === id);
    if (index === -1) return;
    
    this.db.data.tournaments.splice(index, 1);
    
    // If the deleted tournament was active, set active to null
    if (this.db.data.activeTournamentId === id) {
      this.db.data.activeTournamentId = null;
    }
    
    await this.db.write();
  }

  // Add a change listener
  public addChangeListener(listener: (data: TournamentState) => void): void {
    this.changeListeners.push(listener);
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

  // Poll for changes in the database
  private startPolling(): void {
    setInterval(async () => {
      try {
        // Read the latest data from the database
        await this.db.read();
        
        // Get the active tournament
        const activeId = this.db.data.activeTournamentId;
        if (!activeId) return;
        
        const tournament = this.db.data.tournaments.find(t => t.id === activeId);
        if (!tournament) return;
        
        // Notify all listeners of the change
        this.changeListeners.forEach(listener => {
          listener(tournament.data);
        });
      } catch (error) {
        console.error('Error polling for changes:', error);
      }
    }, 2000); // Poll every 2 seconds
  }
}

export default DbService;
