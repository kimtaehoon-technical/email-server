const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const iconv = require('iconv-lite');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());
app.use(cors());

app.use((req, res, next) => {
  console.log('Received request: ', req.method, req.url);
  next();
});

mongoose.connect('mongodb+srv://dxprosol:kim650323!@dxpro.ealx5.mongodb.net/dxpro?retryWrites=true&w=majority')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
  
const announcementSchema = new mongoose.Schema({
  title: String,
  summary: String,
  dateTime: String
});

const Announcement = mongoose.model('Announcement', announcementSchema);

app.get('/announcements', async (req, res) => {
  const announcements = await Announcement.find();
  res.json(announcements);
});

app.post('/announcements', async (req, res) => {
  const newAnnouncement = new Announcement(req.body);
  await newAnnouncement.save();
  res.json(newAnnouncement);
});

app.post('/send-email', upload.single('file'), async (req, res) => {
  console.log('Request body: ', req.body);
  console.log('Received file: ', req.file);

  const { name, telephone, email, saiyoselect, message, consent, formType } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).send('File upload failed.');
  }

  const decodedFileName = iconv.decode(Buffer.from(file.originalname, 'latin1'), 'utf8');

  const transporter = nodemailer.createTransport({
    host: 'mail1022.onamae.ne.jp',
    port: 587,
    secure: false,
    auth: {
      user: 'info@dxpro-sol.com',
      pass: 'dxpro-sol2024'
    }
  });

  let mailOptions;

  if (formType === 'inquiry') {
    mailOptions = {
      from: email,
      to: 'info@dxpro-sol.com',
      subject: `お問い合わせ from ${name}`,
      html: `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              h1 { color: #333; }
              .container { width: 100%; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; }
              .section { margin-bottom: 20px; }
              .label { font-weight: bold; color: #555; }
              .value { margin-left: 10px; color: #333; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>お問い合わせ内容</h1>
              <div class="section">
                <span class="label">お名前:</span>
                <span class="value">${name}</span>
              </div>
              <div class="section">
                <span class="label">メールアドレス:</span>
                <span class="value">${email}</span>
              </div>
              <div class="section">
                <span class="label">内容:</span>
                <span class="value">${message}</span>
              </div>
            </div>
          </body>
        </html>`
    };
  } else if (formType === 'application') {
    mailOptions = {
      from: email,
      to: 'info@dxpro-sol.com',
      subject: `応募フォーム from ${name}`,
      html: `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              h1 { color: #333; }
              .container { width: 100%; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; }
              .section { margin-bottom: 20px; }
              .label { font-weight: bold; color: #555; }
              .value { margin-left: 10px; color: #333; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>応募内容</h1>
              <div class="section">
                <span class="label">お名前:</span>
                <span class="value">${name}</span>
              </div>
              <div class="section">
                <span class="label">電話番号:</span>
                <span class="value">${telephone}</span>
              </div>
              <div class="section">
                <span class="label">メールアドレス:</span>
                <span class="value">${email}</span>
              </div>
              <div class="section">
                <span class="label">応募希望:</span>
                <span class="value">${saiyoselect}</span>
              </div>
              <div class="section">
                <span class="label">希望年収:</span>
                <span class="value">${message}</span>
              </div>
              <div class="section">
                <span class="label">個人情報の取扱規定に同意する:</span>
                <span class="value">${consent ? '同意する' : '同意しない'}</span>
              </div>
            </div>
          </body>
        </html>`,
      attachments: [
        {
          filename: decodedFileName,
          path: path.resolve(file.path)
        }
      ]
    };
  }

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send('メールが送信されました。');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('メール送信に失敗しました。');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});