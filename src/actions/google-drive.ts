import { fetchDataFromGoogleSheetTool } from '@/ai/tools/google-drive-tools';
import { FetchDataFromGoogleSheetOutput } from '@/ai/tools/google-drive-tools';

export async function fetchGoogleDriveData(fileName: string): Promise<FetchDataFromGoogleSheetOutput> {
  try {
    const result = await fetchDataFromGoogleSheetTool({
      fileName,
    });
    return result;
  } catch (error) {
    console.error('Error fetching Google Drive data:', error);
    throw error;
  }
}
