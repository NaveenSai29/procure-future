import prisma from '@/lib/prisma';

export class WarehouseService {
  // ============================================
  // ZONE MANAGEMENT
  // ============================================
  
  static async getZones(warehouseId) {
    return prisma.warehouseZone.findMany({
      where: { warehouseId },
      include: {
        shelves: {
          include: {
            bins: {
              include: {
                product: { select: { id: true, name: true, sku: true } }
              }
            }
          }
        }
      },
      orderBy: { zoneName: 'asc' }
    });
  }

  static async getZone(zoneId) {
    return prisma.warehouseZone.findUnique({
      where: { id: zoneId },
      include: {
        warehouse: true,
        shelves: {
          include: {
            bins: {
              include: {
                product: { select: { id: true, name: true, sku: true } }
              }
            }
          }
        }
      }
    });
  }

  static async createZone(warehouseId, { zoneName, zoneType }) {
    return prisma.warehouseZone.create({
      data: {
        warehouseId,
        zoneName,
        zoneType: zoneType || 'STORAGE'
      }
    });
  }

  static async updateZone(zoneId, data) {
    return prisma.warehouseZone.update({
      where: { id: zoneId },
      data
    });
  }

  static async deleteZone(zoneId) {
    // Check if zone has shelves
    const shelfCount = await prisma.warehouseShelf.count({ where: { zoneId } });
    if (shelfCount > 0) {
      throw new Error(`Cannot delete zone with ${shelfCount} shelves. Remove shelves first.`);
    }
    return prisma.warehouseZone.delete({ where: { id: zoneId } });
  }

  // ============================================
  // SHELF MANAGEMENT
  // ============================================

  static async getShelves(zoneId) {
    return prisma.warehouseShelf.findMany({
      where: { zoneId },
      include: {
        bins: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      },
      orderBy: { shelfCode: 'asc' }
    });
  }

  static async getShelf(shelfId) {
    return prisma.warehouseShelf.findUnique({
      where: { id: shelfId },
      include: {
        zone: { include: { warehouse: true } },
        bins: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          },
          orderBy: { binCode: 'asc' }
        }
      }
    });
  }

  static async createShelf(zoneId, { shelfCode, shelfType, capacity }) {
    return prisma.warehouseShelf.create({
      data: {
        zoneId,
        shelfCode,
        shelfType: shelfType || 'STANDARD',
        capacity: capacity || 100
      }
    });
  }

  static async updateShelf(shelfId, data) {
    return prisma.warehouseShelf.update({
      where: { id: shelfId },
      data
    });
  }

  static async deleteShelf(shelfId) {
    const binCount = await prisma.warehouseBin.count({ where: { shelfId } });
    if (binCount > 0) {
      throw new Error(`Cannot delete shelf with ${binCount} bins. Remove bins first.`);
    }
    return prisma.warehouseShelf.delete({ where: { id: shelfId } });
  }

  // ============================================
  // BIN MANAGEMENT
  // ============================================

  static async getBins(shelfId) {
    return prisma.warehouseBin.findMany({
      where: { shelfId },
      include: {
        product: { select: { id: true, name: true, sku: true } }
      },
      orderBy: { binCode: 'asc' }
    });
  }

  static async getBin(binId) {
    return prisma.warehouseBin.findUnique({
      where: { id: binId },
      include: {
        shelf: { include: { zone: { include: { warehouse: true } } } },
        product: { select: { id: true, name: true, sku: true, images: { take: 1 } } }
      }
    });
  }

  static async createBin(shelfId, { binCode, binType, capacity, productId }) {
    return prisma.warehouseBin.create({
      data: {
        shelfId,
        binCode,
        binType: binType || 'STANDARD',
        capacity: capacity || 50,
        productId: productId || null
      }
    });
  }

  static async updateBin(binId, data) {
    return prisma.warehouseBin.update({
      where: { id: binId },
      data,
      include: {
        product: { select: { id: true, name: true } }
      }
    });
  }

  static async deleteBin(binId) {
    return prisma.warehouseBin.delete({ where: { id: binId } });
  }

  static async assignProductToBin(binId, productId) {
    return prisma.warehouseBin.update({
      where: { id: binId },
      data: { productId }
    });
  }

  // ============================================
  // INVENTORY MOVEMENTS
  // ============================================

  static async recordMovement(inventoryId, { type, quantity, referenceType, referenceId, notes }) {
    const inventory = await prisma.warehouseInventory.findUnique({
      where: { id: inventoryId }
    });

    if (!inventory) throw new Error('Inventory record not found');

    let newAvailable = inventory.availableQty;
    let newReserved = inventory.reservedQty;
    let newDamaged = inventory.damagedQty;

    switch (type) {
      case 'IN':
        newAvailable += quantity;
        break;
      case 'OUT':
        if (newAvailable < quantity) throw new Error('Insufficient stock');
        newAvailable -= quantity;
        break;
      case 'TRANSFER':
        newAvailable -= quantity;
        break;
      case 'DAMAGE':
        if (newAvailable < quantity) throw new Error('Insufficient stock');
        newAvailable -= quantity;
        newDamaged += quantity;
        break;
      case 'RETURN':
        newAvailable += quantity;
        break;
      case 'ADJUSTMENT':
        newAvailable = quantity;
        break;
      case 'RESERVE':
        if (newAvailable < quantity) throw new Error('Insufficient stock');
        newAvailable -= quantity;
        newReserved += quantity;
        break;
      default:
        throw new Error(`Unknown movement type: ${type}`);
    }

    const [movement] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          inventoryId,
          type,
          quantity,
          referenceType,
          referenceId,
          notes
        }
      }),
      prisma.warehouseInventory.update({
        where: { id: inventoryId },
        data: {
          availableQty: newAvailable,
          reservedQty: newReserved,
          damagedQty: newDamaged
        }
      })
    ]);

    return movement;
  }

  static async getMovements(inventoryId, { page = 1, limit = 20 } = {}) {
    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where: { inventoryId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.inventoryMovement.count({ where: { inventoryId } })
    ]);

    return {
      movements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  // ============================================
  // WAREHOUSE ANALYTICS
  // ============================================

  static async getWarehouseAnalytics(warehouseId) {
    const [zoneCount, inventory, totalStock, lowStock, outOfStock] = await Promise.all([
      prisma.warehouseZone.count({ where: { warehouseId } }),
      prisma.warehouseInventory.findMany({
        where: { warehouseId },
        include: {
          product: { select: { id: true, name: true, sku: true } }
        }
      }),
      prisma.warehouseInventory.aggregate({
        where: { warehouseId },
        _sum: { availableQty: true, reservedQty: true, damagedQty: true }
      }),
      prisma.warehouseInventory.count({
        where: {
          warehouseId,
          availableQty: { lte: prisma.warehouseInventory.fields.minStockLevel },
          availableQty: { gt: 0 }
        }
      }),
      prisma.warehouseInventory.count({
        where: { warehouseId, availableQty: 0 }
      })
    ]);

    const shelfCount = await prisma.warehouseShelf.count({
      where: { zone: { warehouseId } }
    });
    const binCount = await prisma.warehouseBin.count({
      where: { shelf: { zone: { warehouseId } } }
    });

    return {
      zones: zoneCount,
      shelves: shelfCount,
      bins: binCount,
      totalProducts: inventory.length,
      totalStock: {
        available: totalStock._sum.availableQty || 0,
        reserved: totalStock._sum.reservedQty || 0,
        damaged: totalStock._sum.damagedQty || 0
      },
      alerts: {
        lowStock,
        outOfStock
      }
    };
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  static async bulkCreateShelves(zoneId, shelves) {
    return prisma.$transaction(
      shelves.map(s => prisma.warehouseShelf.create({
        data: { zoneId, ...s }
      }))
    );
  }

  static async bulkCreateBins(shelfId, bins) {
    return prisma.$transaction(
      bins.map(b => prisma.warehouseBin.create({
        data: { shelfId, ...b }
      }))
    );
  }

  static async getStorageUtilization(warehouseId) {
    const bins = await prisma.warehouseBin.findMany({
      where: { shelf: { zone: { warehouseId } } },
      select: { capacity: true, currentQty: true }
    });

    const totalCapacity = bins.reduce((sum, b) => sum + b.capacity, 0);
    const totalUsed = bins.reduce((sum, b) => sum + b.currentQty, 0);

    return {
      totalCapacity,
      totalUsed,
      utilizationPercent: totalCapacity > 0 ? ((totalUsed / totalCapacity) * 100).toFixed(1) : 0,
      availableCapacity: totalCapacity - totalUsed,
      totalBins: bins.length
    };
  }
}