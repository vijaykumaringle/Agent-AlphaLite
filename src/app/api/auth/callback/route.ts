
import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      throw new Error("Google API credentials are not configured in .env.local");
    }

    const client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Get the authorization code from the query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided by Google.' }, { status: 400 });
    }

    // Exchange the authorization code for tokens
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      console.warn('Refresh token was not received. Ensure "access_type=offline" and "prompt=consent" were used in the auth URL. You might need to revoke previous app access in your Google account settings and try again.');
       return NextResponse.json({
        message: 'Successfully obtained access token, but NO refresh token. See server logs.',
        accessToken: tokens.access_token,
        id_token: tokens.id_token,
        expiry_date: tokens.expiry_date,
        // DO NOT expose refresh token to client if received, it's for server-side storage.
      });
    } else {
      // IMPORTANT: Store the refresh token securely.
      // For this demo, we'll log it to the console. In a production app,
      // you would store this in a secure database associated with the user.
      console.log('********************************************************************************');
      console.log('Received REFRESH TOKEN. Copy this to your .env.local file as GOOGLE_REFRESH_TOKEN:');
      console.log(tokens.refresh_token);
      console.log('********************************************************************************');
      // It is critical that this refresh token is kept secret.
    }

    // Redirect user to a success page or back to the app
    // For now, just return a JSON response.
    // In a real app, you might redirect to the main page: return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.json({
      message: 'OAuth flow completed. If a refresh token was issued, it has been logged to the server console. Please copy it to your .env.local file.',
      accessToken: tokens.access_token, // For immediate use, usually stored in session
    });

  } catch (error) {
    console.error('Error in OAuth callback:', error);
    const message = error instanceof Error ? error.message : 'Failed to obtain tokens';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
