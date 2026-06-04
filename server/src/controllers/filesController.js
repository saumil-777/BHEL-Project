const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads', req.user.org_id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.xlsx', '.xls', '.csv', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('File type not allowed'));
};

exports.upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { entity_type, entity_id } = req.body;
    const [file] = await db('files').insert({
      org_id: req.user.org_id,
      entity_type,
      entity_id,
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploaded_by: req.user.id,
    }).returning('*');
    res.status(201).json(file);
  } catch (e) { res.status(500).json({ error: 'File upload failed' }); }
};

exports.getFiles = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    const files = await db('files').where({ org_id: req.user.org_id, entity_type, entity_id }).orderBy('created_at', 'desc');
    res.json(files);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch files' }); }
};

exports.deleteFile = async (req, res) => {
  try {
    const file = await db('files').where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    await db('files').where({ id: req.params.id }).delete();
    res.json({ message: 'File deleted' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete file' }); }
};
