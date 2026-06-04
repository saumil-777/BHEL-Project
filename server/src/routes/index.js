const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const mainCtrl = require('../controllers/mainController');
const materialsCtrl = require('../controllers/materialsController');
const reportsCtrl = require('../controllers/reportsController');
const filesCtrl = require('../controllers/filesController');
const cnoteCtrl = require('../controllers/cnoteController');
const sivCtrl = require('../controllers/sivController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const ADMIN_ROLES = ['super_admin', 'org_admin'];
const MANAGER_ROLES = ['super_admin', 'org_admin', 'inventory_manager', 'quality_manager', 'warehouse_manager'];
const MATERIAL_ROLES = ['super_admin', 'org_admin', 'inventory_manager', 'material_team'];
const SIV_ROLES = ['super_admin', 'org_admin', 'inventory_manager', 'warehouse_manager', 'dtg_team'];

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/logout', authenticate, authCtrl.logout);
router.get('/auth/me', authenticate, authCtrl.me);
router.put('/auth/profile', authenticate, authCtrl.updateProfile);
router.put('/auth/password', authenticate, authCtrl.changePassword);

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', authenticate, mainCtrl.getDashboard);

// ─── Materials ────────────────────────────────────────────────────────────────
router.get('/materials', authenticate, materialsCtrl.getAll);
router.get('/materials/categories', authenticate, materialsCtrl.getCategories);
router.get('/materials/low-stock', authenticate, materialsCtrl.getLowStock);
router.get('/materials/:id', authenticate, materialsCtrl.getOne);
router.post('/materials', authenticate, authorize(...MANAGER_ROLES), auditLog('CREATE', 'material'), materialsCtrl.create);
router.put('/materials/:id', authenticate, authorize(...MANAGER_ROLES), auditLog('UPDATE', 'material'), materialsCtrl.update);
router.delete('/materials/:id', authenticate, authorize(...ADMIN_ROLES), auditLog('DELETE', 'material'), materialsCtrl.deleteMaterial);
router.post('/materials/bulk-import', authenticate, authorize(...MANAGER_ROLES), materialsCtrl.bulkImport);

// ─── Vendors ──────────────────────────────────────────────────────────────────
router.get('/vendors', authenticate, mainCtrl.getAllVendors);
router.get('/vendors/:id', authenticate, mainCtrl.getVendor);
router.post('/vendors', authenticate, authorize(...MANAGER_ROLES), auditLog('CREATE', 'vendor'), mainCtrl.createVendor);
router.put('/vendors/:id', authenticate, authorize(...MANAGER_ROLES), auditLog('UPDATE', 'vendor'), mainCtrl.updateVendor);
router.delete('/vendors/:id', authenticate, authorize(...ADMIN_ROLES), auditLog('DELETE', 'vendor'), mainCtrl.deleteVendor);

// ─── Warehouses ───────────────────────────────────────────────────────────────
router.get('/warehouses', authenticate, mainCtrl.getAllWarehouses);
router.get('/warehouses/:id', authenticate, mainCtrl.getWarehouse);
router.post('/warehouses', authenticate, authorize(...ADMIN_ROLES), auditLog('CREATE', 'warehouse'), mainCtrl.createWarehouse);
router.put('/warehouses/:id', authenticate, authorize(...ADMIN_ROLES), mainCtrl.updateWarehouse);
router.post('/warehouses/:warehouseId/locations', authenticate, authorize(...ADMIN_ROLES), mainCtrl.createLocation);

// ─── Inventory ────────────────────────────────────────────────────────────────
router.get('/inventory/transactions', authenticate, mainCtrl.getTransactions);
router.post('/inventory/transactions', authenticate, authorize(...MANAGER_ROLES), auditLog('CREATE', 'inventory_transaction'), mainCtrl.createTransaction);

// ─── Quality ──────────────────────────────────────────────────────────────────
router.get('/quality/inspections', authenticate, mainCtrl.getInspections);
router.post('/quality/inspections', authenticate, authorize(...MANAGER_ROLES), auditLog('CREATE', 'inspection'), mainCtrl.createInspection);
router.put('/quality/inspections/:id', authenticate, authorize('super_admin', 'org_admin', 'quality_manager'), auditLog('UPDATE', 'inspection'), mainCtrl.updateInspection);

// ─── Purchase Orders ─────────────────────────────────────────────────────────
router.get('/purchase-orders', authenticate, mainCtrl.getAllPOs);
router.get('/purchase-orders/:id', authenticate, mainCtrl.getPO);
router.post('/purchase-orders', authenticate, authorize(...MANAGER_ROLES), auditLog('CREATE', 'purchase_order'), mainCtrl.createPO);
router.put('/purchase-orders/:id', authenticate, authorize(...MANAGER_ROLES), auditLog('UPDATE', 'purchase_order'), mainCtrl.updatePO);

// ─── C-Notes (Consignment Notes) ─────────────────────────────────────────────
router.get('/cnotes', authenticate, cnoteCtrl.getAll);
router.get('/cnotes/:id', authenticate, cnoteCtrl.getOne);
router.post('/cnotes', authenticate, authorize(...MATERIAL_ROLES), auditLog('CREATE', 'cnote'), cnoteCtrl.create);
router.put('/cnotes/:id', authenticate, authorize(...MATERIAL_ROLES), auditLog('UPDATE', 'cnote'), cnoteCtrl.update);
router.delete('/cnotes/:id', authenticate, authorize(...ADMIN_ROLES), auditLog('DELETE', 'cnote'), cnoteCtrl.deleteCNote);

// ─── SIVs (Store Issue Vouchers) ─────────────────────────────────────────────
router.get('/sivs', authenticate, sivCtrl.getAll);
router.get('/sivs/:id', authenticate, sivCtrl.getOne);
router.post('/sivs', authenticate, authorize(...SIV_ROLES), auditLog('CREATE', 'siv'), sivCtrl.create);
router.put('/sivs/:id', authenticate, authorize(...SIV_ROLES), auditLog('UPDATE', 'siv'), sivCtrl.update);
router.put('/sivs/:id/approve', authenticate, authorize(...ADMIN_ROLES), auditLog('UPDATE', 'siv'), sivCtrl.approve);
router.put('/sivs/:id/issue', authenticate, authorize(...SIV_ROLES), auditLog('UPDATE', 'siv'), sivCtrl.issue);
router.delete('/sivs/:id', authenticate, authorize(...ADMIN_ROLES), auditLog('DELETE', 'siv'), sivCtrl.deleteSIV);

// ─── Movements ────────────────────────────────────────────────────────────────
router.get('/movements', authenticate, mainCtrl.getMovements);
router.post('/movements', authenticate, authorize(...MANAGER_ROLES), auditLog('CREATE', 'movement'), mainCtrl.createMovement);

// ─── Notifications ────────────────────────────────────────────────────────────
router.get('/notifications', authenticate, mainCtrl.getNotifications);
router.put('/notifications/:id/read', authenticate, mainCtrl.markRead);
router.put('/notifications/read-all', authenticate, mainCtrl.markAllRead);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get('/audit-logs', authenticate, authorize(...ADMIN_ROLES), mainCtrl.getAuditLogs);

// ─── Search ───────────────────────────────────────────────────────────────────
router.get('/search', authenticate, mainCtrl.globalSearch);

// ─── Reports ─────────────────────────────────────────────────────────────────
router.get('/reports/materials', authenticate, reportsCtrl.materialsReport);
router.get('/reports/inventory', authenticate, reportsCtrl.inventoryReport);
router.get('/reports/audit', authenticate, authorize(...ADMIN_ROLES), reportsCtrl.auditReport);
router.get('/reports/quality', authenticate, reportsCtrl.qualityReport);
router.get('/reports/cnotes', authenticate, reportsCtrl.cnoteReport);
router.get('/reports/sivs', authenticate, reportsCtrl.sivReport);

// ─── Files ───────────────────────────────────────────────────────────────────
router.post('/files', authenticate, filesCtrl.upload.single('file'), filesCtrl.uploadFile);
router.get('/files', authenticate, filesCtrl.getFiles);
router.delete('/files/:id', authenticate, filesCtrl.deleteFile);
router.use('/files/serve', authenticate, express.static('uploads'));

// ─── Users (Admin) ────────────────────────────────────────────────────────────
router.get('/users', authenticate, authorize(...ADMIN_ROLES), mainCtrl.getUsers);
router.post('/users', authenticate, authorize(...ADMIN_ROLES), auditLog('CREATE', 'user'), mainCtrl.createUser);
router.put('/users/:id', authenticate, authorize(...ADMIN_ROLES), auditLog('UPDATE', 'user'), mainCtrl.updateUser);

// ─── Workflows ────────────────────────────────────────────────────────────────
router.get('/workflows', authenticate, mainCtrl.getWorkflows);
router.post('/workflows', authenticate, authorize(...ADMIN_ROLES), mainCtrl.createWorkflow);
router.put('/workflows/:id', authenticate, authorize(...ADMIN_ROLES), mainCtrl.updateWorkflow);

// ─── Organization ─────────────────────────────────────────────────────────────
router.get('/organization', authenticate, mainCtrl.getOrg);
router.put('/organization', authenticate, authorize(...ADMIN_ROLES), mainCtrl.updateOrg);

module.exports = router;
