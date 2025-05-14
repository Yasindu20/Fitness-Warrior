import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Alert } from 'react-native';

interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  similarity?: number;
}

interface ModelPaths {
  vectorizer: string;
  vectors: string;
  database: string;
}

interface VectorizerData {
  transform: (input: string[]) => number[][];
  vocabulary: { [key: string]: number };
  idf: number[];
  maxFeatures: number;
}

interface FoodVector {
  data: number[][]; // Change this from number[] to number[][]
  shape: [number, number];
  get: (i: number, j: number) => number;
}

interface VectorizedData {
  vocabulary: { [key: string]: number };
  idf: number[];
  maxFeatures: number;
}

interface FoodVectorData {
  vectors: number[][];
  dimensions: [number, number]; // [numRows, numCols]
}


class FoodSearchService {
  private vectorizer: VectorizerData | null;
  private foodVectors: FoodVector | null;
  private foodDatabase: FoodItem[] | null;
  private isInitialized: boolean;
  private lastInitAttempt: number;
  private initRetryDelay: number;
  private debugMode: boolean;
  private modelPaths: ModelPaths;
  private cacheDir: string;

  constructor() {
    this.vectorizer = null;
    this.foodVectors = null;
    this.foodDatabase = null;
    this.isInitialized = false;
    this.lastInitAttempt = 0;
    this.initRetryDelay = 5000; // 5 seconds
    this.debugMode = true; // Set to true for debugging
    this.cacheDir = `${FileSystem.cacheDirectory}ml/`;

    // Define model paths - fixed this part to use proper asset references
    this.modelPaths = {
      vectorizer: 'vectorizer.json',
      vectors: 'food_vectors.json',
      database: 'food_database.json'
    };
  }

  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[FoodSearchService]', ...args);
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const now = Date.now();
    if (this.lastInitAttempt && (now - this.lastInitAttempt) < this.initRetryDelay) {
      throw new Error('Please wait before retrying initialization');
    }
    this.lastInitAttempt = now;

    try {
      this.log('Starting initialization...');
      await this.ensureDirectoryExists(this.cacheDir);

      // Try to load from cache first
      const cachedData = await Promise.all([
        this.loadFromCache('vectorizer'),
        this.loadFromCache('vectors'),
        this.loadFromCache('database')
      ]);

      if (cachedData.every(data => data !== null)) {
        this.log('Loading from cache...');
        [this.vectorizer, this.foodVectors, this.foodDatabase] = cachedData;
        this.isInitialized = true;
        return;
      }

      // If cache missing or invalid, load and process from assets
      await this.loadAndCacheModels();
      this.isInitialized = true;
      this.log('Initialization complete');
    } catch (error) {
      this.log('Initialization failed:', error);
      this.isInitialized = false;
      throw new Error(`Failed to initialize food search service: ${(error as Error).message}`);
    }
  }

  private async loadAndCacheModels(): Promise<void> {
    try {
      // Load JSON files directly
      const vectorizer = require('../assets/ml/vectorizer.json');
      const vectors = require('../assets/ml/food_vectors.json');
      const database = require('../assets/ml/food_database.json');

      // Process the data directly
      this.vectorizer = this.createVectorizerFromData(vectorizer);
      this.foodVectors = this.createVectorsFromData(vectors);
      this.foodDatabase = database;

      // Save processed data to cache for future use
      await this.saveToCache('vectorizer', this.vectorizer);
      await this.saveToCache('vectors', this.foodVectors);
      await this.saveToCache('database', this.foodDatabase);

      this.log('Models loaded and processed successfully');
    } catch (error) {
      throw new Error(`Failed to load and cache models: ${(error as Error).message}`);
    }
  }

  private async loadSingleModel(key: string, assetModule: any): Promise<void> {
    this.log(`Loading ${key} from asset module`);

    // Create asset object from the module
    const asset = Asset.fromModule(assetModule);

    // Download the asset
    await asset.downloadAsync();

    if (!asset.localUri) {
      throw new Error(`Failed to get local URI for ${key}`);
    }

    const destination = `${this.cacheDir}${key}.json`;

    // Copy to our cache location
    await FileSystem.copyAsync({
      from: asset.localUri,
      to: destination
    });

    this.log(`Cached ${key} to:`, destination);

    // Read the file from cache
    const fileContent = await FileSystem.readAsStringAsync(destination);
    const data = JSON.parse(fileContent);

    // Process the data based on model type
    this.initializeModel(key, data);
  }

  private initializeModel(key: string, data: any): void {
    switch (key) {
      case 'vectorizer':
        this.vectorizer = this.createVectorizerFromData(data);
        break;
      case 'vectors':
        this.foodVectors = this.createVectorsFromData(data);
        break;
      case 'database':
        this.foodDatabase = data;
        break;
      default:
        throw new Error(`Unknown model type: ${key}`);
    }
  }

  private createVectorizerFromData(data: any): VectorizerData {
    try {
      // Make sure data.vocabulary is an object and not null/undefined
      const vocabulary = data.vocabulary || {};
      const idf = data.idf || [];
      const maxFeatures = data.maxFeatures || idf.length;

      return {
        transform: (input: string[]): number[][] => {
          return input.map(text => {
            // Initialize zero vector with maxFeatures length
            const vector = new Array(maxFeatures).fill(0);

            // Tokenize input text
            const tokens = this.tokenizeText(text);

            // Calculate TF (Term Frequency)
            const tf: { [key: string]: number } = {};
            tokens.forEach(token => {
              // Check if vocabulary is an object and token exists in it
              if (vocabulary && typeof vocabulary === 'object' && token in vocabulary) {
                tf[token] = (tf[token] || 0) + 1;
              }
            });

            // Calculate TF-IDF
            Object.entries(tf).forEach(([token, frequency]) => {
              const index = vocabulary[token];
              if (index !== undefined && index < maxFeatures && idf[index] !== undefined) {
                // TF-IDF = TF * IDF
                vector[index] = frequency * idf[index];
              }
            });

            return vector;
          });
        },
        // Store these properties so they are available when we load from cache
        vocabulary: vocabulary,
        idf: idf,
        maxFeatures: maxFeatures
      };
    } catch (error) {
      this.log('Error creating vectorizer:', error);
      throw new Error(`Failed to create vectorizer: ${(error as Error).message}`);
    }
  }

  private createVectorsFromData(data: any): FoodVector {
    try {
      return {
        data: data.vectors,
        shape: data.dimensions,
        get: (i: number, j: number): number => {
          if (i < 0 || i >= data.dimensions[0] ||
            j < 0 || j >= data.dimensions[1]) {
            return 0;
          }
          return data.vectors[i][j] || 0;
        }
      };
    } catch (error) {
      this.log('Error creating vectors:', error);
      throw new Error(`Failed to create vectors: ${(error as Error).message}`);
    }
  }

  // Add helper methods for text processing
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .split(/\s+/) // Split on whitespace
      .filter(token => token.length > 1); // Remove single-character tokens
  }

  async searchFood(query: string, limit: number = 15): Promise<FoodItem[]> {
    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Invalid search query');
      }

      // Add detailed logging
      console.log('Searching for:', query);

      if (!this.isInitialized) {
        console.log('Service not initialized, initializing...');
        await this.initialize();
      }

      console.log('Service initialized, processing query...');
      const processedQuery = this.preprocessQuery(query);

      // For short queries, use prefix matching instead of vector similarity
      if (processedQuery.length < 3 && this.foodDatabase) {
        console.log('Using prefix matching for short query:', processedQuery);
        return this.prefixSearch(processedQuery, limit);
      }

      if (!this.vectorizer) {
        console.log('Vectorizer not initialized, falling back to prefix search');
        return this.prefixSearch(processedQuery, limit);
      }

      try {
        const queryVector = this.vectorizer.transform([processedQuery]);

        if (!this.foodVectors) {
          console.log('Food vectors not initialized, falling back to prefix search');
          return this.prefixSearch(processedQuery, limit);
        }

        // Use a hybrid approach - combine vector similarity with prefix matching
        const vectorResults = this.calculateCosineSimilarity(queryVector, this.foodVectors);
        const prefixResults = this.prefixSearch(processedQuery, limit);

        // Combine results, giving priority to prefix matches
        return this.combineSearchResults(vectorResults, prefixResults, limit);
      } catch (error) {
        console.log('Vector search failed, falling back to prefix search:', error);
        return this.prefixSearch(processedQuery, limit);
      }
    } catch (error) {
      console.error('Search failed:', error);
      throw new Error(`Food search failed: ${(error as Error).message}`);
    }
  }

  private prefixSearch(query: string, limit: number): FoodItem[] {
    if (!this.foodDatabase) return [];

    const lowerQuery = query.toLowerCase();

    // Find all foods that start with the query prefix
    const prefixMatches = this.foodDatabase
      .filter(food => food.name.toLowerCase().startsWith(lowerQuery))
      .map(food => ({
        ...food,
        similarity: 1.0 - (lowerQuery.length / food.name.length) // Higher similarity for closer length matches
      }))
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);

    // If we didn't find enough matches, look for food items containing the query
    if (prefixMatches.length < limit && lowerQuery.length > 1) {
      const containsMatches = this.foodDatabase
        .filter(food =>
          !food.name.toLowerCase().startsWith(lowerQuery) &&
          food.name.toLowerCase().includes(lowerQuery)
        )
        .map(food => ({
          ...food,
          similarity: 0.7 - (food.name.toLowerCase().indexOf(lowerQuery) * 0.01) // Higher similarity for earlier occurrences
        }))
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, limit - prefixMatches.length);

      return [...prefixMatches, ...containsMatches];
    }

    return prefixMatches;
  }

  private combineSearchResults(vectorSimilarities: number[], prefixResults: FoodItem[], limit: number): FoodItem[] {
    if (!this.foodDatabase) return [];

    // Get vector-based results
    const vectorResults = vectorSimilarities
      .map((similarity, index) => ({
        ...this.foodDatabase![index],
        similarity,
        source: 'vector'
      }))
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit)
      .filter(item => (item.similarity || 0) > 0.1);

    // Map of food item IDs to avoid duplicates
    const resultMap = new Map<string, FoodItem>();

    // Add prefix matches first (they get priority)
    prefixResults.forEach(item => {
      resultMap.set(item.id, item);
    });

    // Add vector matches if not already in results
    vectorResults.forEach(item => {
      if (!resultMap.has(item.id)) {
        resultMap.set(item.id, item);
      }
    });

    // Convert map back to array and sort by similarity
    return Array.from(resultMap.values())
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);
  }

  private preprocessQuery(query: string): string {
    return query.toLowerCase().trim();
  }

  private calculateCosineSimilarity(queryVector: number[][], foodVectors: FoodVector): number[] {
    try {
      const queryArray = queryVector[0];
      const foodArray = this.convertToArray(foodVectors);

      // Pre-calculate query vector magnitude
      const queryMagnitude = Math.sqrt(
        queryArray.reduce((sum, val) => sum + val * val, 0)
      );

      // Pre-calculate food vector magnitudes
      const foodMagnitudes = foodArray.map(vector =>
        Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
      );

      // Calculate similarities using vectorized operations
      return foodArray.map((foodVector, index) => {
        const dotProduct = this.calculateDotProduct(queryArray, foodVector);
        const magnitude = queryMagnitude * foodMagnitudes[index];

        return magnitude === 0 ? 0 : dotProduct / magnitude;
      });
    } catch (error) {
      throw new Error(`Similarity calculation failed: ${(error as Error).message}`);
    }
  }

  private calculateDotProduct(queryArray: number[], foodVector: number[]): number {
    return queryArray.reduce((sum, qi, i) => sum + (qi * foodVector[i]), 0);
  }

  private getTopResults(similarities: number[], limit: number): FoodItem[] {
    if (!this.foodDatabase) return [];

    return similarities
      .map((similarity, index) => ({
        ...this.foodDatabase![index],
        similarity
      }))
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit)
      .filter(item => (item.similarity || 0) > 0.1);
  }

  private convertToArray(matrix: FoodVector): number[][] {
    const numRows = matrix.shape[0];
    const numCols = matrix.shape[1];
    const result: number[][] = [];

    for (let i = 0; i < numRows; i++) {
      const row = new Array(numCols).fill(0);
      for (let j = 0; j < numCols; j++) {
        row[j] = matrix.get(i, j) || 0;
      }
      result.push(row);
    }

    return result;
  }

  // Add method to save processed data to cache
  private async saveToCache(key: string, data: any): Promise<void> {
    try {
      const cachePath = `${this.cacheDir}${key}_processed.json`;

      // For vectorizer, only save the data needed to recreate it
      let dataToSave = data;
      if (key === 'vectorizer' && this.vectorizer) {
        // Store only the data fields, not the functions
        dataToSave = {
          vocabulary: data.vocabulary,
          idf: data.idf,
          maxFeatures: data.maxFeatures
        };
      }

      await FileSystem.writeAsStringAsync(
        cachePath,
        JSON.stringify(dataToSave),
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      this.log(`Saved processed ${key} data to cache`);
    } catch (error) {
      this.log(`Warning: Failed to cache ${key} data:`, error);
    }
  }

  // Add method to load from cache
  private async loadFromCache(key: string): Promise<any | null> {
    try {
      const cachePath = `${this.cacheDir}${key}_processed.json`;
      const fileInfo = await FileSystem.getInfoAsync(cachePath);

      if (fileInfo.exists) {
        const data = await FileSystem.readAsStringAsync(cachePath);
        const parsedData = JSON.parse(data);

        // Reconstruct objects with their methods
        if (key === 'vectorizer' && parsedData) {
          return this.createVectorizerFromData(parsedData);
        } else if (key === 'vectors' && parsedData) {
          return this.createVectorsFromData(parsedData);
        }

        return parsedData;
      }
      return null;
    } catch (error) {
      this.log(`Warning: Failed to load ${key} from cache:`, error);
      return null;
    }
  }

  dispose(): void {
    this.vectorizer = null;
    this.foodVectors = null;
    this.foodDatabase = null;
    this.isInitialized = false;
    this.log('Resources disposed');
  }
}

export default new FoodSearchService();