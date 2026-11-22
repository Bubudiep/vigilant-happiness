import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("templates")
@Controller("templates")
export class TemplatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiQuery({ name: "category", required: false })
  @ApiOperation({ summary: "Lấy danh sách mẫu Mini App" })
  async findAll(@Query("category") category?: string) {
    return this.prisma.template.findMany({
      where: {
        status: "live",
        ...(category ? { categories: { has: category } } : {}),
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết một mẫu Mini App" })
  async findOne(@Param("id") id: string) {
    const template = await this.prisma.template.findUnique({ where: { id: id.toLowerCase() } });
    if (!template) throw new NotFoundException(`Không tìm thấy mẫu "${id}"`);
    return template;
  }
}
