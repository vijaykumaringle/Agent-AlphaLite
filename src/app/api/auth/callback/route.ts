import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

export async function GET(request: Request) {
  try {
    const client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Get the authorization code from the query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    // Exchange the authorization code for tokens
    const { tokens } = await client.getToken(code);

    // Store the refresh token in your environment
    // You'll need to copy this to your .env.local file
    console.log('Refresh token:', tokens.refresh_token);

    return NextResponse.json({
      message: 'Successfully obtained refresh token',
      tokens,
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.json({ error: 'Failed to obtain refresh token' }, { status: 500 });
  }
}
