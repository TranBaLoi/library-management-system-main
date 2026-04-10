import { ConflictError, NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { PasswordUtils } from '@/lib/utils';
import { CreateUserData, PublicUser, UserQueryFilters } from '@/types/user';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { GorseService } from './gorse.service';

export class UserService {
  // Get users with pagination and filters
  static async getUsers(filters: UserQueryFilters) {
    const { search = '', role, status, page = 1, limit = 10, sortBy, sortOrder } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phoneNumber: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    // Build orderBy clause
    let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: 'desc' };

    if (sortBy && sortOrder) {
      // Map frontend sort keys to database fields
      const sortFieldMap: Record<string, string> = {
        id: 'id',
        fullName: 'fullName',
        email: 'email',
        role: 'role',
        status: 'status',
        violationPoints: 'violationPoints',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      };

      const dbField = sortFieldMap[sortBy];
      if (dbField) {
        orderBy = { [dbField]: sortOrder };
      }
    }

    // Execute queries in parallel
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          address: true,
          avatarUrl: true,
          role: true,
          status: true,
          violationPoints: true,
          createdAt: true,
          updatedAt: true,
          inactiveAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users as PublicUser[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get user by ID
  static async getUserById(id: number): Promise<PublicUser | null> {
    const user = await prisma.user.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        address: true,
        avatarUrl: true,
        role: true,
        status: true,
        violationPoints: true,
        createdAt: true,
        updatedAt: true,
        inactiveAt: true,
        firstLoginAt: true,
        interest: true,
      },
    });

    return user as PublicUser | null;
  }

  // Get multiple users by IDs
  static async getUsersByIds(ids: number[]): Promise<PublicUser[]> {
    const users = await prisma.user.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        address: true,
        avatarUrl: true,
        role: true,
        status: true,
        violationPoints: true,
        createdAt: true,
        updatedAt: true,
        inactiveAt: true,
      },
    });

    return users as PublicUser[];
  }

  // Create new user
  static async createUser(userData: CreateUserData): Promise<PublicUser> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already exists');
    }

    // Hash password before saving to database
    const hashedPassword = await PasswordUtils.hash(userData.password);

    const user = await prisma.user.create({
      data: {
        fullName: userData.fullName,
        email: userData.email,
        password: hashedPassword,
        phoneNumber: userData.phoneNumber || null,
        address: userData.address || null,
        role: userData.role || Role.READER,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        address: true,
        avatarUrl: true,
        role: true,
        status: true,
        violationPoints: true,
        createdAt: true,
        updatedAt: true,
        inactiveAt: true,
      },
    });

    // Sync user to Gorse (only READER role for recommendations)
    // Fail silently to not block user creation if Gorse is unavailable
    if (user.role === Role.READER) {
      try {
        await GorseService.insertUser(
          GorseService.createUserPayload(user.id, {
            comment: user.fullName,
          })
        );
      } catch (error) {
        // Log error but don't fail user creation
        console.error('Failed to sync user to Gorse:', error);
      }
    }

    return user as PublicUser;
  }

  // Update user
  static async updateUser(id: number, userData: Prisma.UserUpdateInput): Promise<PublicUser> {
    // Check if user exists
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Extract email value from Prisma update input format
    // Can be: { set: string }, { unset: true }, or string
    let newEmail: string | undefined;
    if (userData.email) {
      if (typeof userData.email === 'string') {
        newEmail = userData.email;
      } else if (userData.email.set) {
        newEmail = userData.email.set;
      }
    }

    // Check email uniqueness if email is being changed
    if (newEmail && newEmail !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: newEmail },
      });

      if (emailExists) {
        throw new ConflictError('Email already exists');
      }
    }

    // Extract status value from Prisma update input format
    // Can be: { set: UserStatus }, { unset: true }, or UserStatus
    let newStatus: UserStatus | undefined;
    if (userData.status) {
      if (typeof userData.status === 'string') {
        newStatus = userData.status as UserStatus;
      } else if (userData.status.set) {
        newStatus = userData.status.set as UserStatus;
      }
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = { ...userData };

    // Set inactiveAt based on status
    if (newStatus !== undefined) {
      if (newStatus === UserStatus.INACTIVE) {
        updateData.inactiveAt = new Date();
      } else if (newStatus === UserStatus.ACTIVE) {
        updateData.inactiveAt = null;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        address: true,
        avatarUrl: true,
        role: true,
        status: true,
        violationPoints: true,
        createdAt: true,
        updatedAt: true,
        inactiveAt: true,
        firstLoginAt: true,
        interest: true,
      },
    });

    // Sync user update to Gorse (only READER role for recommendations)
    // Fail silently to not block user update if Gorse is unavailable
    if (updatedUser.role === Role.READER) {
      try {
        const gorseUserId = GorseService.toGorseUserId(updatedUser.id);

        // Prepare update payload
        const updatePayload: Partial<{
          Labels: string[];
          Subscribe: string[];
          Comment: string;
        }> = {};

        // Extract fullName from Prisma update input format
        // Can be: { set: string }, { unset: true }, or string
        let newFullName: string | undefined;
        if (userData.fullName) {
          if (typeof userData.fullName === 'string') {
            newFullName = userData.fullName;
          } else if (userData.fullName.set) {
            newFullName = userData.fullName.set;
          }
        }

        // Update comment if fullName changed
        if (newFullName && newFullName !== existingUser.fullName) {
          updatePayload.Comment = updatedUser.fullName;
        }

        // Only update if there are changes
        if (Object.keys(updatePayload).length > 0) {
          await GorseService.updateUser(gorseUserId, updatePayload);
        }
      } catch (error) {
        // Log error but don't fail user update
        console.error('Failed to sync user update to Gorse:', error);
      }
    }

    return updatedUser as PublicUser;
  }

  // Bulk soft delete users
  static async deleteBulkUsers(ids: number[]): Promise<{
    deletedCount: number;
    notFoundIds: number[];
  }> {
    // Find existing users
    const existingUsers = await prisma.user.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
      select: { id: true },
    });

    const existingIds = existingUsers.map(user => user.id);
    const notFoundIds = ids.filter(id => !existingIds.includes(id));

    // Bulk update to soft delete
    if (existingIds.length > 0) {
      await prisma.user.updateMany({
        where: {
          id: { in: existingIds },
        },
        data: {
          isDeleted: true,
          status: UserStatus.INACTIVE,
          inactiveAt: new Date(),
        },
      });

      // Delete users from Gorse (only READER role)
      // Fail silently to not block deletion if Gorse is unavailable
      try {
        // Get user roles to filter only READER users
        const usersToDelete = await prisma.user.findMany({
          where: {
            id: { in: existingIds },
            role: Role.READER, // Only delete READER users from Gorse
          },
          select: { id: true },
        });

        // Delete from Gorse in parallel
        const deletePromises = usersToDelete.map(user =>
          GorseService.deleteUser(GorseService.toGorseUserId(user.id)).catch(error => {
            // Log individual errors but continue with other deletions
            console.error(`Failed to delete user ${user.id} from Gorse:`, error);
          })
        );

        await Promise.all(deletePromises);
      } catch (error) {
        // Log error but don't fail deletion
        console.error('Failed to sync user deletion to Gorse:', error);
      }
    }

    return {
      deletedCount: existingIds.length,
      notFoundIds,
    };
  }

  // Check if email exists
  static async emailExists(email: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.UserWhereInput = { email };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const user = await prisma.user.findFirst({ where });
    return !!user;
  }
}
