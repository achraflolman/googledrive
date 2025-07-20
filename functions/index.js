// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();
const db = admin.firestore();

// --- Configuratie voor Google OAuth (opgehaald uit Firebase Functions Environment Variables) ---
const CLIENT_ID = functions.config().googleapi.client_id;
const CLIENT_SECRET = functions.config().googleapi.client_secret;
const REDIRECT_URI = functions.config().googleapi.redirect_uri;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// --- Cloud Function 1: getGoogleAuthUrl ---
exports.getGoogleAuthUrl = functions.https.onCall(async (data, context) => { // Terug naar async function
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist om Google Drive te koppelen.');
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.file', // Toegang tot bestanden die de app maakt en opent
    'https://www.googleapis.com/auth/userinfo.email', // Om het e-mailadres van de gebruiker te krijgen
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Belangrijk: om een refresh_token te krijgen voor langdurige toegang
    prompt: 'consent', // Zorgt ervoor dat de gebruiker altijd toestemming geeft (nodig voor refresh_token bij de eerste keer)
    scope: scopes,
    state: context.auth.uid, // Stuur de Firebase user ID mee als 'state' voor beveiliging
  });

  return { authUrl: authUrl };
});

// --- Cloud Function 2: saveGoogleDriveTokens ---
exports.saveGoogleDriveTokens = functions.https.onCall(async (data, context) => { // Terug naar async function
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist.');
  }
  const userId = context.auth.uid;
  const code = data.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);

    await db.collection('users').doc(userId).set({
      googleDriveRefreshToken: tokens.refresh_token,
      googleDriveLinked: true,
      googleDriveLastLinked: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error("Fout bij opslaan Google Drive tokens:", error);
    // Zorg ervoor dat de error correct wordt doorgegeven als HttpsError
    throw new functions.https.HttpsError('internal', 'Fout bij koppelen Google Drive.', error.message);
  }
});

// --- Cloud Function 3: uploadFileToGoogleDrive ---
exports.uploadFileToGoogleDrive = functions.https.onCall(async (data, context) => { // Terug naar async function
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist om bestanden te uploaden.');
  }
  const userId = context.auth.uid;
  const { fileName, fileContentBase64, mimeType, folderName = 'Schoolmaps Uploads' } = data;

  const userDoc = await db.collection('users').doc(userId).get();
  const refreshToken = userDoc.data()?.googleDriveRefreshToken;

  if (!refreshToken) {
    throw new functions.https.HttpsError('failed-precondition', 'Google Drive is niet gekoppeld voor deze gebruiker. Koppel je account opnieuw.');
  }

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    let folderId = null;
    const searchFolderRes = await drive.files.list({
      q: `'root' in parents and mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
      fields: 'files(id)',
    });

    if (searchFolderRes.data.files.length > 0) {
      folderId = searchFolderRes.data.files[0].id;
    } else {
      const createFolderRes = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = createFolderRes.data.id;
    }

    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: Buffer.from(fileContentBase64, 'base64'),
      },
      fields: 'id,webViewLink,webContentLink',
    });

    await drive.permissions.create({
      fileId: uploadResponse.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      fields: 'id',
    });

    const directDownloadLink = `https://drive.google.com/uc?export=download&id=${uploadResponse.data.id}`;

    return {
      fileId: uploadResponse.data.id,
      webViewLink: uploadResponse.data.webViewLink,
      directDownloadLink: directDownloadLink,
    };

  } catch (error) {
    console.error("Fout bij uploaden naar Google Drive:", error);
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
