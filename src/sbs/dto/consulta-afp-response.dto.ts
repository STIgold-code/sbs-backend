export class ConsultaAfpResponseDto {
  afiliado: boolean;
  afp: string | null;
  cuspp: string | null;
  fechaAfiliacion: string | null;
  situacion: string | null;
  ultimoAporte: string | null;
  mensaje: string | null;

  constructor(partial: Partial<ConsultaAfpResponseDto>) {
    Object.assign(this, partial);
  }

  static noAfiliado(mensaje: string): ConsultaAfpResponseDto {
    return new ConsultaAfpResponseDto({
      afiliado: false,
      afp: null,
      cuspp: null,
      fechaAfiliacion: null,
      situacion: null,
      ultimoAporte: null,
      mensaje,
    });
  }

  static afiliado(data: {
    afp: string;
    cuspp: string;
    fechaAfiliacion: string;
    situacion: string;
    ultimoAporte: string | null;
  }): ConsultaAfpResponseDto {
    return new ConsultaAfpResponseDto({
      afiliado: true,
      afp: data.afp,
      cuspp: data.cuspp,
      fechaAfiliacion: data.fechaAfiliacion,
      situacion: data.situacion,
      ultimoAporte: data.ultimoAporte,
      mensaje: null,
    });
  }
}
