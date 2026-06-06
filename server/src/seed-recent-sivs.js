const db = require('./config/database');
const { v4: uuidv4 } = require('uuid');

async function seedRecentSIVs() {
  try {
    console.log('Seeding recent SIV records for forecasting validation...');

    // Fetch org
    const org = await db('organizations').first();
    if (!org) {
      console.log('No organization found. Please run initial migration and seed first.');
      process.exit(1);
    }
    const orgId = org.id;

    // Fetch users for creator/approver
    const adminUser = await db('users').where({ role: 'org_admin' }).first();
    const dtgUser = await db('users').where({ role: 'dtg_team' }).first();
    if (!adminUser || !dtgUser) {
      console.log('Users not found. Seed first.');
      process.exit(1);
    }

    // Fetch materials
    const materials = await db('materials').where({ org_id: orgId });
    if (materials.length === 0) {
      console.log('No materials found. Seed first.');
      process.exit(1);
    }

    // Let's seed SIVs for selected materials to simulate active consumption
    // 1. Copper Cable 25mm² (MAT-0001) - daily consumption around 5-10 meters
    // 2. Stainless Steel Bolts M16 (MAT-0004) - daily consumption around 50-100 pcs
    // 3. Hydraulic Oil ISO 46 (MAT-0007) - daily consumption around 0.5-2 liters
    // 4. Welding Electrodes E7018 (MAT-0010) - daily consumption around 3-8 kg

    const targetMaterials = [
      { sku: 'CC-25-001', dailyMin: 4, dailyMax: 12 },
      { sku: 'SS-M16-001', dailyMin: 60, dailyMax: 150 },
      { sku: 'HO-46-001', dailyMin: 0.5, dailyMax: 2.5 },
      { sku: 'WE-7018-001', dailyMin: 4, dailyMax: 10 }
    ];

    const today = new Date();
    let sivCount = await db('store_issue_vouchers').count('id as c').first();
    let currentSivIndex = parseInt(sivCount.c) || 10;

    const sivsToInsert = [];
    const transactionsToInsert = [];

    for (const target of targetMaterials) {
      const material = materials.find(m => m.sku === target.sku);
      if (!material) continue;

      console.log(`Generating SIVs for: ${material.name} (${material.material_id})`);

      // Generate random issues over the last 90 days
      // Let's generate issues roughly every 3-5 days
      for (let dayOffset = 90; dayOffset >= 1; dayOffset -= Math.floor(Math.random() * 3) + 2) {
        const issueDate = new Date();
        issueDate.setDate(today.getDate() - dayOffset);
        const issueDateStr = issueDate.toISOString().split('T')[0];

        const qtyIssued = +(Math.random() * (target.dailyMax - target.dailyMin) + target.dailyMin).toFixed(1);
        currentSivIndex++;

        const sivId = uuidv4();
        const sivNumber = `SIV-${issueDate.getFullYear()}-${String(currentSivIndex).padStart(4, '0')}`;

        sivsToInsert.push({
          id: sivId,
          org_id: orgId,
          siv_number: sivNumber,
          material_id: material.id,
          material_name: material.name,
          department: 'Assembly Line ' + (Math.floor(Math.random() * 3) + 1),
          requested_by: 'Operator ' + (Math.floor(Math.random() * 10) + 1),
          approved_by: adminUser.id,
          approved_by_name: adminUser.name,
          quantity_issued: qtyIssued,
          date_issued: issueDateStr,
          remarks: 'Daily production issuance',
          status: 'issued',
          created_by: dtgUser.id,
          created_at: issueDate.toISOString(),
          updated_at: issueDate.toISOString()
        });

        // Add corresponding inventory transaction to keep audit trails realistic
        transactionsToInsert.push({
          id: uuidv4(),
          org_id: orgId,
          material_id: material.id,
          type: 'stock_out',
          quantity: qtyIssued,
          unit_cost: material.cost,
          reference_number: sivNumber,
          notes: `SIV Issue to Production`,
          created_by: storeKeepId = adminUser.id, // safe fallback
          created_at: issueDate.toISOString()
        });
      }
    }

    if (sivsToInsert.length > 0) {
      await db('store_issue_vouchers').insert(sivsToInsert);
      await db('inventory_transactions').insert(transactionsToInsert);
      console.log(`Successfully seeded ${sivsToInsert.length} issued SIV records and inventory transactions!`);
    } else {
      console.log('No records generated.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding recent SIVs:', err);
    process.exit(1);
  }
}

seedRecentSIVs();
