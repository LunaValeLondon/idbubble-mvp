// Import required packages
const admin = require('firebase-admin');
const fetch = require('node-fetch'); // Used to send data to Wix

// --- Firebase Admin Initialization ---
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

// --- Netlify Serverless Function Handler ---
exports.handler = async (event, context) => {
  // --- CORS Preflight Check ---
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // We only want to handle POST requests for the main logic.
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { alias, email, timestamp, deviceName, deviceType } = data;

    if (!alias || !timestamp) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required fields: alias and timestamp' }),
      };
    }

    // FIX: Create one complete data object that includes the alias from the start.
    // This ensures the 'alias' field is sent to both Wix and Firebase correctly.
    const aliasData = {
      alias: alias,
      email: email || '',
      timestamp,
      deviceName: deviceName || '',
      deviceType: deviceType || '',
    };
    
    console.log("Attempting to save data:", JSON.stringify(aliasData));

    const wixApiUrl = process.env.WIX_API_URL;
    const wixApiKey = process.env.WIX_API_KEY;

    if (!wixApiUrl || !wixApiKey) {
        console.error('Wix API URL or Key is not configured in Netlify environment variables.');
        return { 
            statusCode: 500, 
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Server configuration error.' }) 
        };
    }

    // --- Run operations and log results individually for better debugging ---
    let wixSuccess = false;
    let firebaseSuccess = false;
    let wixError = null;
    let firebaseError = null;

    // Operation 1: Send data to the new Wix API endpoint
    try {
        console.log("Sending data to Wix...");
        const wixResponse = await fetch(wixApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': wixApiKey },
            body: JSON.stringify(aliasData) // Send the complete data object
        });
        if (wixResponse.ok) {
            wixSuccess = true;
            console.log("Successfully sent data to Wix.");
        } else {
            const errorText = await wixResponse.text();
            wixError = `Wix API returned status: ${wixResponse.status} - ${errorText}`;
            console.error(wixError);
        }
    } catch (error) {
        wixError = `Error calling Wix API: ${error.message}`;
        console.error(wixError);
    }

    // Operation 2: Set data in Firebase
    try {
        console.log("Sending data to Firebase...");
        const fireMasterDataRef = db.ref(`fire-masterdata/aliases/${alias}`);
        await fireMasterDataRef.set(aliasData);
        firebaseSuccess = true;
        console.log("Successfully sent data to Firebase.");
    } catch (error) {
        firebaseError = `Error calling Firebase API: ${error.message}`;
        console.error(firebaseError);
    }

    // --- Final Response ---
    if (wixSuccess && firebaseSuccess) {
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ success: true, message: 'Alias saved in both databases' }),
        };
    } else {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ 
                success: false, 
                message: 'One or more database updates failed.',
                errors: { wix: wixError, firebase: firebaseError }
            }),
        };
    }

  } catch (error) {
    console.error('Error saving alias:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};