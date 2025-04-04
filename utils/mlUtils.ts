import * as FileSystem from 'expo-file-system';

export const loadBinaryFile = async (path: string): Promise<Uint8Array> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Convert base64 to Uint8Array instead of Buffer
    const binary = Buffer.from(base64, 'base64');
    return new Uint8Array(binary);
  } catch (error) {
    // Proper error typing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load binary file: ${errorMessage}`);
  }
};

export const loadTextFile = async (path: string): Promise<string> => {
  try {
    return await FileSystem.readAsStringAsync(path);
  } catch (error) {
    // Proper error typing
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load text file: ${errorMessage}`);
  }
};

// Add a helper function to convert Uint8Array to ArrayBuffer if needed
export const toArrayBuffer = (uint8Array: Uint8Array): ArrayBuffer => {
  return uint8Array.buffer.slice(
    uint8Array.byteOffset,
    uint8Array.byteOffset + uint8Array.byteLength
  );
};