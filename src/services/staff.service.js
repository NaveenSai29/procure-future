import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Default permissions for supplier staff roles
export const SUPPLIER_PERMISSIONS = {
  PRODUCTS: {
    label: 'Products',
    permissions: [
      { key: 'products.view', label: 'View Products' },
      { key: 'products.create', label: 'Create Products' },
      { key: 'products.edit', label: 'Edit Products' },
      { key: 'products.delete', label: 'Delete Products' },
      { key: 'products.bulk_import', label: 'Bulk Import' },
      { key: 'products.approve', label: 'Approve Products' },
    ]
  },
  ORDERS: {
    label: 'Orders',
    permissions: [
      { key: 'orders.view', label: 'View Orders' },
      { key: 'orders.update_status', label: 'Update Status' },
      { key: 'orders.cancel', label: 'Cancel Orders' },
      { key: 'orders.process', label: 'Process Orders' },
    ]
  },
  INVENTORY: {
    label: 'Inventory',
    permissions: [
      { key: 'inventory.view', label: 'View Inventory' },
      { key: 'inventory.manage', label: 'Manage Stock' },
      { key: 'inventory.transfer', label: 'Transfer Stock' },
      { key: 'inventory.adjust', label: 'Adjust Stock' },
    ]
  },
  WAREHOUSE: {
    label: 'Warehouse',
    permissions: [
      { key: 'warehouse.view', label: 'View Warehouse' },
      { key: 'warehouse.manage_zones', label: 'Manage Zones' },
      { key: 'warehouse.manage_shelves', label: 'Manage Shelves' },
      { key: 'warehouse.manage_bins', label: 'Manage Bins' },
    ]
  },
  RFQ: {
    label: 'RFQ & Quotations',
    permissions: [
      { key: 'rfq.view', label: 'View RFQs' },
      { key: 'rfq.respond', label: 'Submit Quotations' },
      { key: 'rfq.negotiate', label: 'Negotiate' },
    ]
  },
  RETURNS: {
    label: 'Returns & Refunds',
    permissions: [
      { key: 'returns.view', label: 'View Returns' },
      { key: 'returns.approve', label: 'Approve Returns' },
      { key: 'returns.reject', label: 'Reject Returns' },
      { key: 'returns.process_refund', label: 'Process Refunds' },
    ]
  },
  FINANCE: {
    label: 'Finance',
    permissions: [
      { key: 'finance.view', label: 'View Finance' },
      { key: 'finance.manage_invoices', label: 'Manage Invoices' },
      { key: 'finance.view_settlements', label: 'View Settlements' },
      { key: 'finance.export_reports', label: 'Export Reports' },
    ]
  },
  CUSTOMERS: {
    label: 'Customers',
    permissions: [
      { key: 'customers.view', label: 'View Customers' },
      { key: 'customers.manage', label: 'Manage Customers' },
      { key: 'customers.export', label: 'Export Customers' },
    ]
  },
  DELIVERY: {
    label: 'Delivery',
    permissions: [
      { key: 'delivery.view', label: 'View Deliveries' },
      { key: 'delivery.assign', label: 'Assign Deliveries' },
      { key: 'delivery.track', label: 'Track Deliveries' },
    ]
  },
  ANALYTICS: {
    label: 'Analytics',
    permissions: [
      { key: 'analytics.view', label: 'View Analytics' },
      { key: 'analytics.export', label: 'Export Reports' },
    ]
  },
  SETTINGS: {
    label: 'Settings',
    permissions: [
      { key: 'settings.view', label: 'View Settings' },
      { key: 'settings.edit', label: 'Edit Settings' },
      { key: 'settings.manage_staff', label: 'Manage Staff' },
      { key: 'settings.manage_roles', label: 'Manage Roles' },
    ]
  },
};

export class StaffService {
  // ============================================
  // STAFF MANAGEMENT
  // ============================================

  static async getStaff(supplierId, { page = 1, limit = 50 } = {}) {
    const [staff, total] = await Promise.all([
      prisma.supplierStaff.findMany({
        where: { supplierId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              isActive: true,
              lastLogin: true,
            }
          },
          warehouse: { select: { id: true, name: true } },
          staffRoles: {
            include: {
              role: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.supplierStaff.count({ where: { supplierId } })
    ]);

    return {
      staff,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getStaffMember(staffId) {
    return prisma.supplierStaff.findUnique({
      where: { id: staffId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            isActive: true,
            lastLogin: true,
          }
        },
        warehouse: true,
        staffRoles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  static async addStaffMember(supplierId, { name, email, password, mobile, role, warehouseId }) {
    // Check if email exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      // Check if already staff
      const existingStaff = await prisma.supplierStaff.findFirst({
        where: { userId: existingUser.id }
      });
      if (existingStaff) {
        throw new Error('User is already a staff member');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      // Create or get user
      let user = existingUser;
      if (!user) {
        user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            mobile,
            emailVerified: true,
          }
        });
      }

      // Create staff record
      const staff = await tx.supplierStaff.create({
        data: {
          supplierId,
          userId: user.id,
          role: role || 'STAFF',
          warehouseId: warehouseId || null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          warehouse: true
        }
      });

      // Assign default role if exists
      const defaultRole = await tx.supplierRole.findFirst({
        where: { supplierId, isDefault: true }
      });
      if (defaultRole) {
        await tx.supplierStaffRole.create({
          data: { staffId: staff.id, roleId: defaultRole.id }
        });
      }

      return staff;
    });

    return result;
  }

  static async updateStaffMember(staffId, { role, warehouseId, isActive }) {
    return prisma.supplierStaff.update({
      where: { id: staffId },
      data: {
        ...(role && { role }),
        ...(warehouseId !== undefined && { warehouseId }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        warehouse: true,
        staffRoles: {
          include: { role: true }
        }
      }
    });
  }

  static async removeStaffMember(staffId) {
    const staff = await prisma.supplierStaff.findUnique({
      where: { id: staffId },
      include: { staffRoles: true }
    });

    if (!staff) throw new Error('Staff member not found');

    // Remove role assignments
    if (staff.staffRoles.length > 0) {
      await prisma.supplierStaffRole.deleteMany({
        where: { staffId }
      });
    }

    // Soft delete staff
    return prisma.supplierStaff.update({
      where: { id: staffId },
      data: { isActive: false }
    });
  }

  static async assignRole(staffId, roleId) {
    return prisma.supplierStaffRole.upsert({
      where: { staffId_roleId: { staffId, roleId } },
      create: { staffId, roleId },
      update: {}
    });
  }

  static async removeRole(staffId, roleId) {
    return prisma.supplierStaffRole.deleteMany({
      where: { staffId, roleId }
    });
  }

  // ============================================
  // ROLE MANAGEMENT
  // ============================================

  static async getRoles(supplierId) {
    return prisma.supplierRole.findMany({
      where: { supplierId },
      include: {
        staff: {
          include: {
            staff: {
              include: {
                user: { select: { name: true, email: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  static async getRole(roleId) {
    return prisma.supplierRole.findUnique({
      where: { id: roleId },
      include: {
        staff: {
          include: {
            staff: {
              include: {
                user: { select: { name: true, email: true } }
              }
            }
          }
        }
      }
    });
  }

  static async createRole(supplierId, { name, description, permissions }) {
    // Check duplicate name
    const existing = await prisma.supplierRole.findFirst({
      where: { supplierId, name }
    });
    if (existing) throw new Error(`Role "${name}" already exists`);

    return prisma.supplierRole.create({
      data: {
        supplierId,
        name,
        description,
        permissions: permissions || []
      }
    });
  }

  static async updateRole(roleId, { name, description, permissions, isDefault }) {
    return prisma.supplierRole.update({
      where: { id: roleId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(permissions && { permissions }),
        ...(isDefault !== undefined && { isDefault }),
      }
    });
  }

  static async deleteRole(roleId) {
    const role = await prisma.supplierRole.findUnique({
      where: { id: roleId },
      include: { staff: true }
    });

    if (!role) throw new Error('Role not found');
    if (role.staff.length > 0) {
      throw new Error(`Cannot delete role assigned to ${role.staff.length} staff members`);
    }

    return prisma.supplierRole.delete({ where: { id: roleId } });
  }

  static async getPermissions() {
    return SUPPLIER_PERMISSIONS;
  }

  static async getStaffPermissions(staffId) {
    const staff = await prisma.supplierStaff.findUnique({
      where: { id: staffId },
      include: {
        staffRoles: {
          include: { role: true }
        }
      }
    });

    if (!staff) throw new Error('Staff not found');

    // Merge permissions from all assigned roles
    const mergedPermissions = new Set();
    staff.staffRoles.forEach(sr => {
      if (sr.role.permissions) {
        const perms = typeof sr.role.permissions === 'string'
          ? JSON.parse(sr.role.permissions)
          : sr.role.permissions;
        perms.forEach(p => mergedPermissions.add(p));
      }
    });

    return Array.from(mergedPermissions);
  }

  static async checkPermission(staffId, permission) {
    const permissions = await this.getStaffPermissions(staffId);
    return permissions.includes(permission);
  }
}