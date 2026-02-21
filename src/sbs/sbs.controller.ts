import { Controller, Post, Body, Get } from '@nestjs/common';
import { SbsService } from './sbs.service';
import { ConsultaAfpDto } from './dto/consulta-afp.dto';
import { ConsultaAfpResponseDto } from './dto/consulta-afp-response.dto';

@Controller('sbs')
export class SbsController {
  constructor(private readonly sbsService: SbsService) {}

  @Get('health')
  health(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('consulta-afp')
  async consultarAfp(
    @Body() dto: ConsultaAfpDto,
  ): Promise<ConsultaAfpResponseDto> {
    return this.sbsService.consultarAfp(dto);
  }
}
