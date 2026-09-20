/** Generic shape of a DRF PageNumberPagination response, as returned by
 *  the paginated list endpoints (Forum-Beiträge, Kommentare, Termine). */
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
