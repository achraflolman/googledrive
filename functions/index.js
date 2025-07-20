// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
// BELANGRIJK: GEEN 'const cors = require('cors')' HIER!
// https.onCall functies handelen CORS automatisch af.

admin.initializeApp();
const db = admin.firestore();

// --- Configuratie voor Google OAuth (opgehaald uit Firebase Functions Environment Variables) ---
// Zorg ervoor dat deze variabelen correct zijn ingesteld in je Firebase project.
const CLIENT_ID = functions.config().googleapi.client_id;
const CLIENT_SECRET = functions.config().googleapi.client_secret;
const REDIRECT_URI = functions.config().googleapi.redirect_uri;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// --- Cloud Function 1: getGoogleAuthUrl (https.onCall) ---
// Deze functie genereert de Google OAuth autorisatie URL.
// Firebase https.onCall handhaaft automatisch CORS op basis van geautoriseerde domeinen.
exports.getGoogleAuthUrl = functions.https.onCall(async (data, context) => {
  // Controleer of de gebruiker is geauthenticeerd.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist om Google Drive te koppelen.');
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: context.auth.uid, // Stuur de Firebase user ID mee als 'state'
  });

  return { authUrl: authUrl };
});

// --- Cloud Function 2: saveGoogleDriveTokens (https.onCall) ---
// Deze functie wisselt de autorisatiecode in voor tokens en slaat deze op.
exports.saveGoogleDriveTokens = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist.');
  }
  const userId = context.auth.uid;
  const code = data.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Sla de refresh token op in Firestore voor de gebruiker
    await db.collection('users').doc(userId).set({
      googleDriveRefreshToken: tokens.refresh_token,
      googleDriveLinked: true,
      googleDriveLastLinked: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }); // Gebruik merge: true om bestaande velden te behouden

    return { success: true };
  } catch (error) {
    console.error("Fout bij opslaan Google Drive tokens:", error);
    // Werp een HttpsError die de frontend kan opvangen
    throw new functions.https.HttpsError('internal', 'Fout bij koppelen Google Drive.', error.message);
  }
});

// --- Cloud Function 3: uploadFileToGoogleDrive (https.onCall) ---
// Deze functie uploadt een bestand naar Google Drive.
exports.uploadFileToGoogleDrive = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist om bestanden te uploaden.');
  }
  const userId = context.auth.uid;
  const { fileName, fileContentBase64, mimeType, folderName = 'Schoolmaps Uploads' } = data;

  // Haal de refresh token van de gebruiker op uit Firestore
  const userDoc = await db.collection('users').doc(userId).get();
  const refreshToken = userDoc.data()?.googleDriveRefreshToken;

  if (!refreshToken) {
    throw new functions.https.HttpsError('failed-precondition', 'Google Drive is niet gekoppeld voor deze gebruiker. Koppel je account opnieuw.');
  }

  // Stel de credentials in voor de OAuth2 client
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Zoek of maak de uploadmap in Google Drive
    let folderId = null;
    const searchFolderRes = await drive.files.list({
      q: `'root' in parents and mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
      fields: 'files(id)',
    });

    if (searchFolderRes.data.files.length > 0) {
      folderId = searchFolderRes.data.files[0].id; // Map gevonden
    } else {
      // Map niet gevonden, maak een nieuwe map
      const createFolderRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = createFolderRes.data.id;
    }

    // Upload het bestand naar de gevonden of gemaakte map
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: Buffer.from(fileContentBase64, 'base64'), // Converteer base64 string naar Buffer
      },
      fields: 'id,webViewLink,webContentLink', // Vraag specifieke velden op
    });

    // Maak het bestand publiekelijk leesbaar
    await drive.permissions.create({
      fileId: uploadResponse.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      fields: 'id',
    });

    // Genereer een directe downloadlink
    const directDownloadLink = `https://drive.google.com/uc?export=download&id=${uploadResponse.data.id}`;

    return {
      fileId: uploadResponse.data.id,
      webViewLink: uploadResponse.data.webViewLink,
      directDownloadLink: directDownloadLink,
    };

  } catch (error) {
    console.error("Fout bij uploaden naar Google Drive:", error);
    // Als de refresh token ongeldig is, verwijder deze en vraag de gebruiker om opnieuw te koppelen
    if (error.code === 401 || (error.message && error.message.includes('invalid_grant'))) {
      await db.collection('users').doc(userId).update({
        googleDriveRefreshToken: admin.firestore.FieldValue.delete(),
        googleDriveLinked: false,
      });
      throw new functions.https.HttpsError('unauthenticated', 'Google Drive-verbinding verlopen. Koppel je account opnieuw.');
    }
    throw new functions.https.HttpsError('internal', 'Fout bij uploaden naar Google Drive.', error.message);
  }
});
