
import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

export async function GET() {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      throw new Error("Google API credentials are not configured in .env.local");
    }

    const client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Define the scopes we need
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly', // General Drive access if needed to find files by name (not used in current sheet ID approach)
      'https://www.googleapis.com/auth/spreadsheets.readonly', // Specific for reading sheets
    ];

    // Generate the authorization URL
    const authUrl = client.generateAuthUrl({
      access_type: 'offline', // Essential for getting a refresh token
      scope: scopes,
      prompt: 'consent', // Ensures the user is prompted for consent even if they've authorized before
    });

    // Redirect to Google's OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate OAuth URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
