const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  try {
    console.log('🔄 Starting test upload...');

    // Initialize Google Drive API with Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    console.log('✅ Auth initialized');

    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    console.log('📁 Folder ID:', folderId);

    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Save test image temporarily
    const testImagePath = path.join(__dirname, 'test-image.png');
    fs.writeFileSync(testImagePath, testImageBuffer);
    console.log('✅ Test image created');

    // Upload file to Google Drive
    const fileMetadata = {
      name: 'TEST_UPLOAD.png',
      parents: [folderId],
    };

    const media = {
      mimeType: 'image/png',
      body: fs.createReadStream(testImagePath),
    };

    console.log('🔄 Uploading to Drive...');

    const driveFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log('✅ Upload successful!');
    console.log('📄 File ID:', driveFile.data.id);
    console.log('📄 File Name:', driveFile.data.name);
    console.log('🔗 View Link:', driveFile.data.webViewLink);

    // Make file publicly accessible
    console.log('🔄 Setting public permissions...');
    await drive.permissions.create({
      fileId: driveFile.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    console.log('✅ Permissions set');

    // Generate direct image link
    const directLink = `https://drive.google.com/thumbnail?id=${driveFile.data.id}&sz=w1000`;
    console.log('🖼️  Direct Image Link:', directLink);

    // Clean up test file
    fs.unlinkSync(testImagePath);
    console.log('✅ Test file cleaned up');

    console.log('\n🎉 TEST SUCCESSFUL! Upload works correctly.');

  } catch (error) {
    console.error('❌ TEST FAILED:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Load environment variables manually
const envPath = require('path').join(__dirname, '.env.local');
const envContent = require('fs').readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

envLines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

testUpload();
