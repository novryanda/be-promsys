export class PagingResponse {
  current_page: number;
  total_page: number;
  size: number;
}

export class WebResponse<T> {
  data: T;
  paging?: PagingResponse;
  errors?: string;
}
