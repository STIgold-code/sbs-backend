import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MaxLength,
  Matches,
} from 'class-validator';

export type TipoDocumento = 'DNI' | 'CE' | 'CM' | 'CT' | 'PAS';

export class ConsultaAfpDto {
  @IsString()
  @IsNotEmpty({ message: 'El tipo de documento es requerido' })
  @IsIn(['DNI', 'CE', 'CM', 'CT', 'PAS'], {
    message: 'Tipo de documento inválido. Use: DNI, CE, CM, CT o PAS',
  })
  tipoDocumento: TipoDocumento;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es requerido' })
  @MaxLength(15, { message: 'El número de documento no puede exceder 15 caracteres' })
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'El número de documento solo puede contener letras y números',
  })
  numeroDocumento: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido paterno es requerido' })
  @MaxLength(50, { message: 'El apellido paterno no puede exceder 50 caracteres' })
  apellidoPaterno: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido materno es requerido' })
  @MaxLength(50, { message: 'El apellido materno no puede exceder 50 caracteres' })
  apellidoMaterno: string;

  @IsString()
  @IsNotEmpty({ message: 'El primer nombre es requerido' })
  @MaxLength(50, { message: 'El primer nombre no puede exceder 50 caracteres' })
  primerNombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'El segundo nombre no puede exceder 50 caracteres' })
  segundoNombre?: string;
}
