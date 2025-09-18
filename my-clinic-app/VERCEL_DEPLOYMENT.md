# Vercel Deployment Guide

## Environment Variables Setup

Copy the following environment variables to Vercel Dashboard > Project > Settings > Environment Variables:

### NextAuth Configuration
```
NEXTAUTH_URL=https://tonggiaduong.vercel.app
NEXTAUTH_SECRET=05UGIVzF2EL+H4noLBl/m3ZnJqk07eZRrPKJpVAwQV8=
```

### Google OAuth
Copy these values from your `.env.local` file:
```
GOOGLE_CLIENT_ID=your-client-id-from-env-local
GOOGLE_CLIENT_SECRET=your-client-secret-from-env-local
```

### Google Sheets API
Copy these values from your `.env.local` file:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email
GOOGLE_PRIVATE_KEY=your-private-key
GOOGLE_SHEET_ID=your-sheet-id
```

### Application Settings
```
NODE_ENV=production
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Select your OAuth 2.0 Client ID
4. Add **Authorized redirect URIs**:
   ```
   https://tonggiaduong.vercel.app/api/auth/callback/google
   ```

## Deployment Steps

1. Set all environment variables in Vercel Dashboard
2. Update Google OAuth redirect URIs
3. Deploy or redeploy the project
4. Test the Google login functionality

## Troubleshooting

### Common Issues

1. **NextAuth Errors (CLIENT_FETCH_ERROR)**
   - Check that `NEXTAUTH_URL` exactly matches your Vercel domain
   - Ensure `NEXTAUTH_SECRET` is set correctly
   - Verify Google OAuth credentials are properly configured
   - Check that redirect URI is added to Google Cloud Console

2. **API returning 500 errors**
   - Check that all Google Sheets environment variables are set correctly in Vercel
   - Verify the Google Service Account has access to the spreadsheet
   - Check Vercel function logs for specific error messages

3. **Authentication Issues**
   - Ensure all environment variables are correctly set
   - Verify the redirect URI matches exactly in Google Cloud Console
   - Make sure NEXTAUTH_URL matches your actual Vercel domain (no trailing slash)

3. **Google Sheets Access Issues**
   - Verify GOOGLE_PRIVATE_KEY is properly formatted (should include newlines)
   - Ensure the service account email has edit permissions on the spreadsheet
   - Check that the spreadsheet ID is correct

### Checking Logs

1. Go to Vercel Dashboard > Your Project > Functions
2. Click on any failing function to see detailed logs
3. Look for environment variable validation messages:
   - `🔧 Validating Google Sheets credentials...`
   - Check if any variables show as `MISSING`

### Environment Variable Checklist

- [ ] `NEXTAUTH_URL` - Your actual Vercel domain
- [ ] `NEXTAUTH_SECRET` - Generated secret key
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Service account email
- [ ] `GOOGLE_PRIVATE_KEY` - Full private key with proper formatting
- [ ] `GOOGLE_SHEET_ID` - Your Google Sheets ID
- [ ] `NODE_ENV=production`

### Testing Steps

1. Deploy with updated environment variables
2. Check function logs in Vercel dashboard
3. Test login functionality
4. Verify API endpoints are working