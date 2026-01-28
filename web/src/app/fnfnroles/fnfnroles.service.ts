import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

interface FnFnrole {
  fnid: number
  roleno: number
  fnName: string
  roleName: string
}

interface Roletaskset {
  fnid: number
  fnName: string
  subfnid: number
  subfnName: string
  sub2Fnord: number
  subSubFnName: string
  roleno: number
  roleName: string
  taskset: string
  ei: string
  lmh: string
}

interface ApiResponse<T> {
  data: T
}

@Injectable({
  providedIn: 'root'
})
export class FnfnrolesService {
  private apiUrl = '/api/fnfnroles'

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

  list(): Observable<ApiResponse<FnFnrole[]>> {
    return this.http.get<ApiResponse<any[]>>(this.apiUrl).pipe(
      map(response => ({
        data: this.toCamelCase(response.data)
      }))
    )
  }

  show(fnid: number, roleno: number): Observable<ApiResponse<{ fnfnrole: FnFnrole; roletasksets: any[] }>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/${fnid}/${roleno}`
    ).pipe(
      map(response => ({
        data: this.toCamelCase(response.data)
      }))
    )
  }
}
