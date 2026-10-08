import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ExchangeRates {
  currency: string;
  /** Segmento I — tasa oficial del sector estatal/gobierno. */
  segmentoI: number | null;
  /** Segmento II — tasa pública (CADECA / población). */
  segmentoII: number | null;
  /** Segmento III — tasa especial. */
  segmentoIII: number | null;
  /** Mercado informal según elToque. */
  informal: number | null;
  fechaBcc: string | null;
  fechaInformal: string | null;
  fetchedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/exchange-rates`;

  rates = signal<ExchangeRates | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  async load(force = false): Promise<void> {
    if (!force && this.rates()) return;
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<ExchangeRates>(this.apiUrl),
      );
      this.rates.set(data);
    } catch {
      this.error.set('No se pudieron obtener las tasas de cambio');
    } finally {
      this.loading.set(false);
    }
  }
}
