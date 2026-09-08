import { db } from './index.ts';
import { assets } from './schema.ts';
import { eq, inArray } from 'drizzle-orm';
import { AssetItem } from '../types/index.ts';

export function dbRowToAssetItem(row: typeof assets.$inferSelect): AssetItem {
  return {
    id: row.id,
    alasHak: (row.alasHak || '') as any,
    tahapan: row.tahapan,
    statusDisplay: row.statusDisplay,
    upt: row.upt,
    ultg: row.ultg,
    penghantar: row.penghantar,
    asetLapangan: row.asetLapangan,
    desa: row.desa,
    kecamatan: row.kecamatan,
    bpn: row.bpn,
    luas: row.luas,
    persil: row.persil || '',
    noSertifikat: row.noSertifikat || '-',
    asset: row.asset || '-',
    nib: row.nib || '-',
    sps1: {
      spsNo: row.sps1No || '',
      tanggalSps: row.sps1PaymentDate || '',
      amount: row.sps1Amount || 0,
      isPaid: Boolean(row.sps1IsPaid || (row.sps1PaymentDate && row.sps1PaymentDate !== '-')),
      paymentDate: row.sps1PaymentDate || '',
      receiptNumber: row.sps1ReceiptNumber || '',
    },
    sps2: {
      spsNo: row.sps2No || '',
      tanggalSps: row.sps2PaymentDate || '',
      amount: row.sps2Amount || 0,
      isPaid: Boolean(row.sps2IsPaid || (row.sps2PaymentDate && row.sps2PaymentDate !== '-')),
      paymentDate: row.sps2PaymentDate || '',
      receiptNumber: row.sps2ReceiptNumber || '',
    },
    sps3: {
      spsNo: row.sps3No || '',
      tanggalSps: row.sps3PaymentDate || '',
      amount: row.sps3Amount || 0,
      isPaid: Boolean(row.sps3IsPaid || (row.sps3PaymentDate && row.sps3PaymentDate !== '-')),
      paymentDate: row.sps3PaymentDate || '',
      receiptNumber: row.sps3ReceiptNumber || '',
    },
    totalPnbp: row.totalPnbp || 0,
    tanggalTerbit: row.tanggalTerbit || '-',
    tanggalAkhir: row.tanggalAkhir || '-',
    kategori: row.kategori as any,
    tahun: row.tahun,
    kendala: row.kendala || '',
    koordinat: row.koordinat || '',
    pic: row.pic || '',
    catatan: row.catatan || '',
  };
}

export function assetItemToDbValues(item: AssetItem) {
  return {
    id: item.id,
    alasHak: item.alasHak,
    tahapan: item.tahapan,
    statusDisplay: item.statusDisplay,
    upt: item.upt || 'UPT MADIUN',
    ultg: item.ultg,
    penghantar: item.penghantar,
    asetLapangan: item.asetLapangan,
    desa: item.desa || '',
    kecamatan: item.kecamatan || '',
    bpn: item.bpn || '',
    luas: item.luas || 0,
    persil: item.persil || '',
    noSertifikat: item.noSertifikat || '-',
    asset: item.asset || '-',
    nib: item.nib || '-',
    sps1No: item.sps1?.spsNo || '',
    sps1Amount: item.sps1?.amount || 0,
    sps1IsPaid: item.sps1?.isPaid ?? Boolean(item.sps1?.tanggalSps && item.sps1?.tanggalSps !== '-'),
    sps1PaymentDate: item.sps1?.tanggalSps || item.sps1?.paymentDate || '',
    sps1ReceiptNumber: item.sps1?.receiptNumber || '',
    sps2No: item.sps2?.spsNo || '',
    sps2Amount: item.sps2?.amount || 0,
    sps2IsPaid: item.sps2?.isPaid ?? Boolean(item.sps2?.tanggalSps && item.sps2?.tanggalSps !== '-'),
    sps2PaymentDate: item.sps2?.tanggalSps || item.sps2?.paymentDate || '',
    sps2ReceiptNumber: item.sps2?.receiptNumber || '',
    sps3No: item.sps3?.spsNo || '',
    sps3Amount: item.sps3?.amount || 0,
    sps3IsPaid: item.sps3?.isPaid ?? Boolean(item.sps3?.tanggalSps && item.sps3?.tanggalSps !== '-'),
    sps3PaymentDate: item.sps3?.tanggalSps || item.sps3?.paymentDate || '',
    sps3ReceiptNumber: item.sps3?.receiptNumber || '',
    totalPnbp: item.totalPnbp || 0,
    tanggalTerbit: item.tanggalTerbit || '-',
    tanggalAkhir: item.tanggalAkhir || '-',
    kategori: item.kategori,
    tahun: item.tahun || 0,
    kendala: item.kendala || '',
    koordinat: item.koordinat || '',
    pic: item.pic || '',
    catatan: item.catatan || '',
    updatedAt: new Date(),
  };
}

export async function getDbAssets(): Promise<AssetItem[]> {
  try {
    const rows = await db.select().from(assets);
    return rows.map(dbRowToAssetItem);
  } catch (error) {
    console.error('Database query failed in getDbAssets:', error);
    throw new Error('Gagal mengambil data aset dari database.', { cause: error });
  }
}

export async function upsertDbAsset(item: AssetItem): Promise<AssetItem> {
  try {
    const values = assetItemToDbValues(item);
    const result = await db
      .insert(assets)
      .values(values)
      .onConflictDoUpdate({
        target: assets.id,
        set: values,
      })
      .returning();
    return dbRowToAssetItem(result[0]);
  } catch (error) {
    console.error('Database query failed in upsertDbAsset:', error);
    throw new Error('Gagal menyimpan data aset ke database.', { cause: error });
  }
}

export async function bulkUpsertDbAssets(items: AssetItem[]): Promise<number> {
  if (items.length === 0) return 0;
  try {
    let count = 0;
    // Process in batches of 25 to be safe
    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25).map(assetItemToDbValues);
      for (const val of chunk) {
        await db.insert(assets).values(val).onConflictDoUpdate({
          target: assets.id,
          set: val,
        });
        count++;
      }
    }
    return count;
  } catch (error) {
    console.error('Database query failed in bulkUpsertDbAssets:', error);
    throw new Error('Gagal melakukan bulk import aset ke database.', { cause: error });
  }
}

export async function deleteDbAsset(id: string): Promise<boolean> {
  try {
    const found = await db.select().from(assets).where(eq(assets.id, id));
    if (found.length > 0) {
      const item = found[0];
      if (item.statusDisplay === 'TERBIT' || (item.tahapan !== null && item.tahapan >= 17)) {
        throw new Error('Aset berstatus TERBIT tidak dapat dihapus karena telah berkekuatan hukum tetap (sertifikat terbit).');
      }
    }
    await db.delete(assets).where(eq(assets.id, id));
    return true;
  } catch (error) {
    console.error('Database query failed in deleteDbAsset:', error);
    throw error;
  }
}

export async function deleteDbAssets(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  try {
    const targets = await db
      .select({ id: assets.id, statusDisplay: assets.statusDisplay, tahapan: assets.tahapan })
      .from(assets)
      .where(inArray(assets.id, ids));

    const deletableIds = targets
      .filter((t) => t.statusDisplay !== 'TERBIT' && (t.tahapan === null || t.tahapan < 17))
      .map((t) => t.id);

    if (deletableIds.length === 0) {
      return 0;
    }

    await db.delete(assets).where(inArray(assets.id, deletableIds));
    return deletableIds.length;
  } catch (error) {
    console.error('Database query failed in deleteDbAssets:', error);
    throw error;
  }
}

export async function clearAllDbAssets(): Promise<void> {
  try {
    await db.delete(assets);
  } catch (error) {
    console.error('Database query failed in clearAllDbAssets:', error);
    throw new Error('Gagal mengosongkan seluruh data aset dari database.', { cause: error });
  }
}

