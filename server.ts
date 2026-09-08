import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  getSupabaseAssets,
  upsertSupabaseAsset,
  bulkUpsertSupabaseAssets,
  deleteSupabaseAsset,
  deleteSupabaseAssets,
  clearAllSupabaseAssets,
  checkSupabaseAssetsTable,
  seedSupabaseWithCurrentData,
  SUPABASE_URL,
} from './src/db/supabaseAssets.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Health check - Supabase is the primary database
  app.get('/api/health', async (req, res) => {
    const tableStatus = await checkSupabaseAssetsTable();
    res.json({
      status: 'ok',
      database: 'supabase',
      url: SUPABASE_URL,
      tableExists: tableStatus.tableExists,
      rowCount: tableStatus.rowCount,
    });
  });

  // Supabase Table & Connection Status endpoint
  app.get('/api/supabase/status', async (req, res) => {
    try {
      const status = await checkSupabaseAssetsTable();
      res.json({ success: true, ...status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Gagal memeriksa status Supabase' });
    }
  });

  // Supabase Seed/Sync endpoint to populate Supabase with current data
  app.post('/api/supabase/seed', async (req, res) => {
    try {
      const result = await seedSupabaseWithCurrentData();
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, count: result.count, message: `Berhasil menyinkronkan ${result.count} data persil ke Supabase` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Gagal menyinkronkan data ke Supabase' });
    }
  });

  // Get Supabase Migration SQL text
  app.get('/api/supabase/migration-sql', (req, res) => {
    try {
      const sqlPath = path.join(process.cwd(), 'public', 'supabase_schema_and_data.sql');
      if (fs.existsSync(sqlPath)) {
        const content = fs.readFileSync(sqlPath, 'utf8');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(content);
      }
      res.status(404).json({ success: false, error: 'File SQL migrasi tidak ditemukan' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get all assets from Supabase
  app.get('/api/assets', async (req, res) => {
    try {
      const assets = await getSupabaseAssets();
      res.json({ success: true, count: assets.length, data: assets });
    } catch (error: any) {
      console.error('Error fetching assets from Supabase:', error.message || error);
      res.status(500).json({ success: false, error: error.message || 'Gagal mengambil data aset dari database Supabase' });
    }
  });

  // Clear all assets from Supabase
  app.post('/api/assets/clear-all', async (req, res) => {
    try {
      await clearAllSupabaseAssets();
      res.json({ success: true, message: 'Seluruh data aset berhasil dibersihkan dari Supabase' });
    } catch (error: any) {
      console.error('Error clearing all assets:', error);
      res.status(500).json({ success: false, error: error.message || 'Gagal membersihkan data aset' });
    }
  });

  // Re-seed with initial 91 real assets
  app.post('/api/assets/seed-sample', async (req, res) => {
    try {
      const result = await seedSupabaseWithCurrentData();
      res.json({ success: true, count: result.count, message: `${result.count} data aset persil berhasil dimuat ke Supabase` });
    } catch (error: any) {
      console.error('Error seeding assets to Supabase:', error);
      res.status(500).json({ success: false, error: error.message || 'Gagal memuat data sampel ke Supabase' });
    }
  });

  // Create or upsert asset in Supabase
  app.post('/api/assets', async (req, res) => {
    try {
      const assetData = req.body;
      if (!assetData || !assetData.id) {
        return res.status(400).json({ success: false, error: 'Data aset tidak valid (ID diperlukan)' });
      }
      const savedAsset = await upsertSupabaseAsset(assetData);
      res.json({ success: true, data: savedAsset });
    } catch (error: any) {
      console.error('Error saving asset to Supabase:', error);
      res.status(500).json({ success: false, error: error.message || 'Gagal menyimpan data aset ke Supabase' });
    }
  });

  // Bulk upsert assets in Supabase (Excel import)
  app.post('/api/assets/bulk', async (req, res) => {
    try {
      const { assets: items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Daftar aset tidak boleh kosong' });
      }
      const count = await bulkUpsertSupabaseAssets(items);
      res.json({ success: true, count });
    } catch (error: any) {
      console.error('Error bulk saving assets to Supabase:', error);
      res.status(500).json({ success: false, error: error.message || 'Gagal menyimpan data massal ke Supabase' });
    }
  });

  // Delete single asset in Supabase
  app.delete('/api/assets/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID persil diperlukan' });
      }
      await deleteSupabaseAsset(id);
      res.json({ success: true, message: `Aset ${id} berhasil dihapus dari Supabase` });
    } catch (error: any) {
      console.error('Error deleting asset from Supabase:', error);
      res.status(400).json({ success: false, error: error.message || 'Gagal menghapus aset' });
    }
  });

  // Delete multiple assets in Supabase
  app.post('/api/assets/delete-multiple', async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Daftar ID diperlukan' });
      }
      const count = await deleteSupabaseAssets(ids);
      res.json({ success: true, count, message: `${count} aset berhasil dihapus dari Supabase` });
    } catch (error: any) {
      console.error('Error deleting multiple assets from Supabase:', error);
      res.status(500).json({ success: false, error: error.message || 'Gagal menghapus aset massal' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} (Supabase Database Mode)`);
    // Inspect Supabase table on boot
    checkSupabaseAssetsTable().then(async (status) => {
      console.log('Supabase Status Check:', status);
      if (status.tableExists && status.rowCount === 0) {
        console.log('Table assets exists in Supabase and is empty. Auto-seeding initial 91 assets...');
        const seedResult = await seedSupabaseWithCurrentData();
        console.log('Auto-seed result:', seedResult);
      }
    }).catch((err) => {
      console.warn('Supabase status check warning on boot:', err.message || err);
    });
  });
}

startServer();
