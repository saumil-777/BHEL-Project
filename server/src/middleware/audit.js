const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to log every state-changing request to audit_logs table
 */
const auditLog = (action, entityType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode < 400 && req.user) {
      try {
        const isSQLite = db.client.config.client === 'better-sqlite3';
        await db('audit_logs').insert({
          id: uuidv4(),
          org_id: req.user.org_id,
          user_id: req.user.id,
          user_name: req.user.name,
          user_email: req.user.email,
          action,
          entity_type: entityType,
          entity_id: data?.id || req.params?.id || null,
          prev_value: isSQLite ? JSON.stringify(req._prevValue || null) : (req._prevValue || null),
          new_value: isSQLite ? JSON.stringify(data || null) : (data || null),
          ip_address: req.ip,
        });
      } catch (e) {
        // Non-blocking — audit failure must not break response
        console.error('Audit log error:', e.message);
      }
    }
    return originalJson(data);
  };
  next();
};

module.exports = { auditLog };
