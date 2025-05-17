
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ServerCrash, CheckCircle, ExternalLink } from 'lucide-react';

interface FetchedData {
  stockData: any[];
  ordersData: any[];
  message: string;
  error?: string; 
}

export default function TestGoogleDrivePage() {
  const [data, setData] = useState<FetchedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthSetup, setIsAuthSetup] = useState(false);

  useEffect(() => {
    // Simple check, in a real app this would be more robust
    // For instance, try a quiet API call or check for a session token
    async function checkAuth() {
        // This is a placeholder. A real check might involve trying a lightweight authenticated API call
        // or checking if GOOGLE_REFRESH_TOKEN seems to be set (though client can't see .env directly)
        // For now, we'll just provide links.
    }
    checkAuth();
  }, []);


  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await fetch('/api/google-drive');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `API responded with status ${response.status}`);
      }
      setData(result);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during fetch.');
    } finally {
      setLoading(false);
    }
  };
  
  const authUrl = "/api/auth/authorize";

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Drive Integration Test</CardTitle>
          <CardDescription>
            Test the connection to your Google Sheet and data parsing.
            Ensure you have configured your <code>.env.local</code> file and performed the OAuth authorization flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertTitle>OAuth Authorization</AlertTitle>
            <AlertDescription>
              If you haven't authorized the application or need to re-authorize to get a refresh token:
              <br />
              1. Ensure <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and <code>GOOGLE_REDIRECT_URI</code> are in your <code>.env.local</code>.
              <br />
              2. Click here: <a href={authUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Authorize with Google</a>.
              <br />
              3. After authorizing, check your server terminal logs for the <code>GOOGLE_REFRESH_TOKEN</code>.
              <br />
              4. Add this token to your <code>.env.local</code> file and restart the server.
            </AlertDescription>
          </Alert>

          <Button onClick={fetchData} disabled={loading} className="w-full md:w-auto">
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching Data...</>
            ) : (
              "Fetch Data from Google Sheet"
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>Error Fetching Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && !data.error && (
         <Alert variant="default">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Data Fetch Successful!</AlertTitle>
          <AlertDescription>{data.message}</AlertDescription>
        </Alert>
      )}
      
      {data && data.error && (
         <Alert variant="destructive">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>API Reported an Error</AlertTitle>
          <AlertDescription>{data.message || data.error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Data ({data.stockData?.length || 0} items)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.stockData?.length > 0 ? (
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                  {JSON.stringify(data.stockData, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No stock data returned or an error occurred.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orders Data ({data.ordersData?.length || 0} items)</CardTitle>
            </CardHeader>
            <CardContent>
               {data.ordersData?.length > 0 ? (
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                  {JSON.stringify(data.ordersData, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No orders data returned or an error occurred.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
