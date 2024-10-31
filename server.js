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
app.use(cors({
  origin: '*', // 모든 출처 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // 허용할 HTTP 메소드
  credentials: true // 쿠키를 포함하여 요청할 수 있게 설정
}));

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

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String
});

const clockLogsSchema = new mongoose.Schema({
  timestamp: Date,
  type: String,
  note: String,
  username: String,
  clockin: Date,
  clockout: Date,
  breakin: Date,
  breakout: Date
});

const Announcement = mongoose.model('Announcement', announcementSchema);
const User = mongoose.model('User', userSchema);
const clocklog = mongoose.model('clocklogs', clockLogsSchema);


app.get('/announcements', async (req, res) => {
  const announcements = await Announcement.find();
  res.json(announcements);
});

app.post('/announcements', async (req, res) => {
  const newAnnouncement = new Announcement(req.body);
  await newAnnouncement.save();
  res.json(newAnnouncement);
});

// 출근 시간 저장
app.post('/clocklogs/clockin', async (req, res) => {
  console.log('Clock-in request received:', req.body);
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).send('Username is required');
    }
    const newClockIn = new clocklog({
      username: username,
      clockin: new Date(), // 현재 시간을 출근 시간으로 저장
      type: 'clockin'
    });

    await newClockIn.save();
    res.status(201).json(newClockIn); // 201 Created 응답 코드 사용
  } catch (error) {
    console.error('Error saving clock in:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 퇴근 시간 저장
app.post('/clocklogs/clockout', async (req, res) => {
  console.log('Clock-out request received:', req.body);
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).send('Username is required');
    }
    const lastClockIn = new clocklog(
      { 
        username: username,
        clockout: new Date(), // 현재 시간을 출근 시간으로 저장
        type: 'clockout'
      }
    );
  await lastClockIn.save();
    res.status(201).json(lastClockIn); // 201 Created 응답 코드 사용
  } catch (error) {
    console.error('Error saving clock out:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 休憩開始 시간 저장
app.post('/clocklogs/breakin', async (req, res) => {
  console.log('break-in request received:', req.body);
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).send('Username is required');
    }
    const newClockBreakIn = new clocklog({
      username: username,
      breakin: new Date(), // 현재 시간을 출근 시간으로 저장
      type: 'clockin'
    });

    await newClockBreakIn.save();
    res.status(201).json(newClockBreakIn); // 201 Created 응답 코드 사용
  } catch (error) {
    console.error('Error saving clock in:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 休憩終了 시간 저장
app.post('/clocklogs/breakout', async (req, res) => {
  console.log('break-out request received:', req.body);
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).send('Username is required');
    }
    const lastClockBreakOut = new clocklog(
      { 
        username: username,
        breakout: new Date(), // 현재 시간을 출근 시간으로 저장
        type: 'clockout'
      }
    );
  await lastClockBreakOut.save();
    res.status(201).json(lastClockBreakOut); // 201 Created 응답 코드 사용
  } catch (error) {
    console.error('Error saving clock out:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/user', async (req, res) => {
  console.log('User endpoint hit'); // Add this line
  try {
    const userinfo = await User.find();
    console.log('Retrieved users:', userinfo); // 여기서 데이터를 콘솔에 출력
    res.json(userinfo);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).send('Error retrieving users');
  }
});

// 로그인 API
app.post('/user', async (req, res) => {
  const { username, password } = req.body;

  res.json({ username: username, password: password });
});

app.delete('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Announcement.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).send('Announcement not found.');
    }
    res.status(200).send('削除しました。');
  } catch (error) {
    console.error('エラーが発生しました :', error);
    res.status(500).send('削除に失敗しました。');
  }
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
