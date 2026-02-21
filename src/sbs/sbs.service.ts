import { Injectable, Logger } from '@nestjs/common';
import { SbsScraperService } from './scraper/sbs-scraper.service';
import { ConsultaAfpDto } from './dto/consulta-afp.dto';
import { ConsultaAfpResponseDto } from './dto/consulta-afp-response.dto';

@Injectable()
export class SbsService {
  private readonly logger = new Logger(SbsService.name);

  constructor(private readonly scraperService: SbsScraperService) {}

  async consultarAfp(dto: ConsultaAfpDto): Promise<ConsultaAfpResponseDto> {
    this.logger.log(
      `Iniciando consulta AFP: ${dto.tipoDocumento} ${dto.numeroDocumento}`,
    );

    const startTime = Date.now();

    try {
      const result = await this.scraperService.consultarAfp(dto);

      const duration = Date.now() - startTime;
      this.logger.log(`Consulta completada en ${duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Consulta fallida después de ${duration}ms: ${error.message}`);
      throw error;
    }
  }
}
