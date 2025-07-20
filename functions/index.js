// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const cors = require('cors')({ origin: true }); // NIEUW: Importeer en initialiseer CORS

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
exports.getGoogleAuthUrl = functions.https.onCall((data, context) => {
  // CORS handler toevoegen
  return new Promise((resolve, reject) => {
    cors(context.req, context.res, async () => { // context.req en context.res zijn beschikbaar in onCall
      if (!context.auth) {
        return reject(new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist om Google Drive te koppelen.'));
      }

      const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
        state: context.auth.uid,
      });

      resolve({ authUrl: authUrl });
    });
  });
});

// --- Cloud Function 2: saveGoogleDriveTokens ---
exports.saveGoogleDriveTokens = functions.https.onCall(async (data, context) => {
  // CORS handler toevoegen
  return new Promise((resolve, reject) => {
    cors(context.req, context.res, async () => {
      if (!context.auth) {
        return reject(new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist.'));
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

        resolve({ success: true });
      } catch (error) {
        console.error("Fout bij opslaan Google Drive tokens:", error);
        // Controleer of de fout een HttpsError is, anders maak er een
        const httpsError = error instanceof functions.https.HttpsError ? error : new functions.https.HttpsError('internal', 'Fout bij koppelen Google Drive.', error.message);
        reject(httpsError);
      }
    });
  });
});

// --- Cloud Function 3: uploadFileToGoogleDrive ---
exports.uploadFileToGoogleDrive = functions.https.onCall(async (data, context) => {
  // CORS handler toevoegen
  return new Promise((resolve, reject) => {
    cors(context.req, context.res, async () => {
      if (!context.auth) {
        return reject(new functions.https.HttpsError('unauthenticated', 'Authenticatie vereist om bestanden te uploaden.'));
      }
      const userId = context.auth.uid;
      const { fileName, fileContentBase64, mimeType, folderName = 'Schoolmaps Uploads' } = data;

      const userDoc = await db.collection('users').doc(userId).get();
      const refreshToken = userDoc.data()?.googleDriveRefreshToken;

      if (!refreshToken) {
        return reject(new functions.https.HttpsError('failed-precondition', 'Google Drive is niet gekoppeld voor deze gebruiker. Koppel je account opnieuw.'));
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

        resolve({
          fileId: uploadResponse.data.id,
          webViewLink: uploadResponse.data.webViewLink,
          directDownloadLink: directDownloadLink,
        });

      } catch (error) {
        console.error("Fout bij uploaden naar Google Drive:", error);
        if (error.code === 401 || (error.message && error.message.includes('invalid_grant'))) {
          await db.collection('users').doc(userId).update({
            googleDriveRefreshToken: admin.firestore.FieldValue.delete(),
            googleDriveLinked: false,
          });
          return reject(new functions.https.HttpsError('unauthenticated', 'Google Drive-verbinding verlopen. Koppel je account opnieuw.'));
        }
        const httpsError = error instanceof functions.https.HttpsError ? error : new functions.https.HttpsError('internal', 'Fout bij uploaden naar Google Drive.', error.message);
        reject(httpsError);
      }
    });
  });
});
