import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FixedAssetsService } from '../../core/services/fixed-assets.service';
import { FixedAsset, DepreciationGroup } from '../../core/services/fixed-assets.service';

export interface FixedAssetsResolvedData {
  assets: FixedAsset[];
  catalog: DepreciationGroup[];
}

export const fixedAssetsResolver: ResolveFn<FixedAssetsResolvedData> = () => {
  const service = inject(FixedAssetsService);

  return forkJoin({
    assets: service.getFixedAssets().pipe(catchError(() => of([]))),
    catalog: service.getDepreciationCatalog().pipe(catchError(() => of([])))
  }).pipe(
    map(data => ({
      assets: data.assets || [],
      catalog: data.catalog || []
    }))
  );
};
