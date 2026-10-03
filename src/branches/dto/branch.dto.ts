import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import { MaxLen, LengthBetween } from '../../common/validators/length.validator';
import { IsNumeric } from '../../common/validators/is-numeric.validator';

const LAT_MESSAGE = 'Latitude must be between -90 and 90';
const LNG_MESSAGE = 'Longitude must be between -180 and 180';

// phone is optional({ checkFalsy: true })
const hasPhone = (o: { phone?: string }) => Boolean(o.phone);

export class LocationDto {
  @IsNumeric({ min: -90, max: 90 }, { message: LAT_MESSAGE })
  lat: number | string;

  @IsNumeric({ min: -180, max: 180 }, { message: LNG_MESSAGE })
  lng: number | string;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsNumeric({ min: -90, max: 90 }, { message: LAT_MESSAGE })
  lat?: number | string;

  @IsOptional()
  @IsNumeric({ min: -180, max: 180 }, { message: LNG_MESSAGE })
  lng?: number | string;
}

export class CreateBranchDto {
  @IsNotEmpty({ message: 'Branch name required' })
  @MaxLen(60, { message: 'Too long branch name' })
  name: string;

  @IsNotEmpty({ message: 'Branch city required' })
  city: string;

  @IsNotEmpty({ message: 'Branch address required' })
  address: string;

  // default instance so a missing location reports location.lat / location.lng
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto = new LocationDto();

  @ValidateIf(hasPhone)
  @LengthBetween(5, 20, { message: 'Invalid phone number' })
  phone?: string;

  // not validated, stored as sent
  nameAr?: string;
  cityAr?: string;
  addressAr?: string;
  workingHours?: string;
  isMain?: boolean;
  active?: boolean;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsNotEmpty({ message: 'Branch name required' })
  @MaxLen(60, { message: 'Too long branch name' })
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocationDto)
  location?: UpdateLocationDto;

  @ValidateIf(hasPhone)
  @LengthBetween(5, 20, { message: 'Invalid phone number' })
  phone?: string;
}
