import {
  Injectable,
  OnModuleDestroy,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { ConsultaAfpDto, TipoDocumento } from '../dto/consulta-afp.dto';
import { ConsultaAfpResponseDto } from '../dto/consulta-afp-response.dto';

const SBS_URL =
  'https://servicios.sbs.gob.pe/reportesituacionprevisional/afil_consulta.aspx';

const TIPO_DOC_MAP: Record<TipoDocumento, string> = {
  DNI: 'DNI/Lib.Electoral',
  CE: 'Carné Extranj.',
  CM: 'Carné Mil/Pol',
  CT: 'Carné Min.trab',
  PAS: 'Pasaporte',
};

const MAX_CONCURRENT = 3;
const TIMEOUT_MS = 30000;

@Injectable()
export class SbsScraperService implements OnModuleDestroy {
  private readonly logger = new Logger(SbsScraperService.name);
  private browser: Browser | null = null;
  private activeRequests = 0;
  private queue: Array<{
    resolve: (value: void) => void;
    reject: (reason: Error) => void;
  }> = [];

  private async acquireSemaphore(): Promise<void> {
    if (this.activeRequests < MAX_CONCURRENT) {
      this.activeRequests++;
      return;
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  private releaseSemaphore(): void {
    this.activeRequests--;
    const next = this.queue.shift();
    if (next) {
      this.activeRequests++;
      next.resolve();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.logger.log('Iniciando navegador Playwright...');
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions',
        ],
      });
    }
    return this.browser;
  }

  async consultarAfp(dto: ConsultaAfpDto): Promise<ConsultaAfpResponseDto> {
    await this.acquireSemaphore();

    let context: BrowserContext | null = null;

    try {
      const browser = await this.getBrowser();

      context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'es-PE',
      });

      const page = await context.newPage();
      page.setDefaultTimeout(TIMEOUT_MS);

      this.logger.log(`Consultando AFP para documento: ${dto.numeroDocumento}`);

      // 1. Navegar a la página
      await page.goto(SBS_URL, { waitUntil: 'networkidle' });

      // 2. Seleccionar tipo de documento
      const tipoDocValue = TIPO_DOC_MAP[dto.tipoDocumento];
      await page.selectOption(
        '#ctl00_ContentPlaceHolder1_cboTipoDoc',
        { label: tipoDocValue },
      );

      // 3. Llenar el formulario
      await page.fill(
        '#ctl00_ContentPlaceHolder1_txtNumeroDoc',
        dto.numeroDocumento,
      );
      await page.fill(
        '#ctl00_ContentPlaceHolder1_txtAp_pat',
        this.normalizeText(dto.apellidoPaterno),
      );
      await page.fill(
        '#ctl00_ContentPlaceHolder1_txtAp_mat',
        this.normalizeText(dto.apellidoMaterno),
      );
      await page.fill(
        '#ctl00_ContentPlaceHolder1_txtPri_nom',
        this.normalizeText(dto.primerNombre),
      );

      if (dto.segundoNombre) {
        await page.fill(
          '#ctl00_ContentPlaceHolder1_txtSeg_nom',
          this.normalizeText(dto.segundoNombre),
        );
      }

      // 4. Click en Buscar y esperar respuesta
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('#ctl00_ContentPlaceHolder1_btnBuscar'),
      ]);

      // 5. Parsear respuesta
      const result = await this.parseResponse(page);

      this.logger.log(
        `Consulta exitosa. Afiliado: ${result.afiliado}, AFP: ${result.afp}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Error en consulta: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Error al consultar la SBS',
          detail: error.message,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } finally {
      if (context) {
        await context.close();
      }
      this.releaseSemaphore();
    }
  }

  private async parseResponse(page: Page): Promise<ConsultaAfpResponseDto> {
    // Verificar si hay mensaje de error
    const errorElement = await page.$('.error, .mensaje-error');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      return ConsultaAfpResponseDto.noAfiliado(
        errorText?.trim() || 'Error desconocido',
      );
    }

    // Verificar si está afiliado buscando el texto característico
    const pageContent = await page.content();

    // Caso: No afiliado al SPP
    if (
      pageContent.includes('no se encuentra afiliado') ||
      pageContent.includes('No se encontró información')
    ) {
      const mensajeElement = await page.$('td, .mensaje');
      const mensaje = mensajeElement
        ? await mensajeElement.textContent()
        : 'No se encuentra afiliado al Sistema Privado de Pensiones';

      return ConsultaAfpResponseDto.noAfiliado(mensaje?.trim() || '');
    }

    // Caso: Afiliado - extraer datos
    try {
      // Buscar AFP
      const afpCell = await page.$('td:has-text("Actualmente se encuentra afiliado(a) a") + td');
      const afp = afpCell ? (await afpCell.textContent())?.trim() : null;

      // Buscar CUSPP
      const cusppCell = await page.$('td:has-text("Su Código de Identificación del SPP es") + td');
      const cuspp = cusppCell ? (await cusppCell.textContent())?.trim() : null;

      // Buscar fecha de afiliación
      const fechaCell = await page.$('td:has-text("Se encuentra afiliado(a) al SPP desde el") + td');
      const fechaAfiliacion = fechaCell
        ? (await fechaCell.textContent())?.trim()
        : null;

      // Buscar situación
      const situacionCell = await page.$('td:has-text("Su situación actual es") + td');
      const situacion = situacionCell
        ? (await situacionCell.textContent())?.trim()
        : null;

      // Buscar último aporte
      const aporteCell = await page.$('td:has-text("La fecha de devengue de su último aporte es") + td');
      const ultimoAporte = aporteCell
        ? (await aporteCell.textContent())?.trim()
        : null;

      if (!afp || !cuspp) {
        // Si no encontramos los datos esperados, puede que el formato haya cambiado
        this.logger.warn('No se pudieron extraer todos los datos. Verificar formato de página.');

        return ConsultaAfpResponseDto.noAfiliado(
          'No se pudo interpretar la respuesta de la SBS',
        );
      }

      return ConsultaAfpResponseDto.afiliado({
        afp,
        cuspp,
        fechaAfiliacion: fechaAfiliacion || 'No disponible',
        situacion: situacion || 'No disponible',
        ultimoAporte: ultimoAporte || null,
      });
    } catch (error) {
      this.logger.error(`Error parseando respuesta: ${error.message}`);
      throw new HttpException(
        'Error al interpretar la respuesta de la SBS',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private normalizeText(text: string): string {
    // Convertir a mayúsculas y remover tildes
    return text
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      this.logger.log('Cerrando navegador Playwright...');
      await this.browser.close();
      this.browser = null;
    }
  }
}
