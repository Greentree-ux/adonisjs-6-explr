import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

interface Roleskill {
  fnid: number
  roleno: number
  fnName: string
  roleName: string
}

interface KsDefinition {
  id: number
  fnid: number
  catid: number
  catord: number
  roleno: number
  ksdefinition: string | null
  catName?: string | null
  ksColor?: string | null
}

interface ApiResponse<T> {
  data: T
}

@Injectable({
  providedIn: 'root'
})
export class RoleskillsService {
  private apiUrl = '/api/roleskills'

  constructor(private http: HttpClient) {}

  private toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.toCamelCase(item))
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        acc[camelKey] = this.toCamelCase(obj[key])
        return acc
      }, {} as any)
    }
    return obj
  }

  list(): Observable<ApiResponse<Roleskill[]>> {
    return this.http.get<ApiResponse<any[]>>(this.apiUrl).pipe(
      map(response => ({
        data: this.toCamelCase(response.data)
      }))
    )
  }

  show(fnid: number, roleno: number): Observable<ApiResponse<{ roleskill: Roleskill; ksdefinitions: KsDefinition[] }>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${fnid}/${roleno}`
    ).pipe(
      map(response => ({
        data: this.toCamelCase(response.data)
      }))
    )
  }
}
