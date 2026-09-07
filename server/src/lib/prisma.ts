import { PrismaClient } from '@prisma/client';

// 全项目共用这一个数据库连接实例
const prisma = new PrismaClient();

export default prisma;
