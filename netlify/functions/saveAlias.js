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
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Allow': 'POST' },
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { alias, email, timestamp, deviceName, deviceType } = data;

    if (!alias || !timestamp) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: alias and timestamp' }),
      };
    }

    // This is the data object we will send to both Wix and Firebase
    const aliasData = {
      email: email || '',
      timestamp,
      deviceName: deviceName || '',
      deviceType: deviceType || '',
    };

    // --- Get Wix API details from environment variables ---
    const wixApiUrl = process.env.WIX_API_URL;
    const wixApiKey = process.env.WIX_API_KEY;

    if (!wixApiUrl || !wixApiKey) {
        console.error('Wix API URL or Key is not configured in Netlify environment variables.');
        return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error.' }) };
    }

    // --- Define Database and API Operations ---

    // Operation 1: Send data to the new Wix API endpoint
    const wixPromise = fetch(wixApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': wixApiKey // Send the secret key for authentication
        },
        body: JSON.stringify({ alias, ...aliasData }) // Send the full data object
    });

    // Operation 2: Set data in Firebase
    const fireMasterDataRef = db.ref(`fire-masterdata/aliases/${alias}`);
    const firebasePromise = fireMasterDataRef.set(aliasData);

    // Use Promise.allSettled to wait for both operations to complete
    const results = await Promise.allSettled([wixPromise, firebasePromise]);

    // Check the results of both operations
    const wixResult = results[0];
    const firebaseResult = results[1];
    
    let errors = [];
    if (wixResult.status === 'rejected' || (wixResult.status === 'fulfilled' && !wixResult.value.ok)) {
        const errorMsg = `Wix update failed: ${wixResult.reason || wixResult.value.statusText}`;
        console.error(errorMsg);
        errors.push(errorMsg);
    }
     if (firebaseResult.status === 'rejected') {
        const errorMsg = `Firebase update failed: ${firebaseResult.reason}`;
        console.error(errorMsg);
        errors.push(errorMsg);
    }

    if (errors.length > 0) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'One or more database updates failed.', errors: errors }),
        };
    }

    // --- Success Response ---
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Alias saved in both databases' }),
    };

  } catch (error) {
    console.error('Error saving alias:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
