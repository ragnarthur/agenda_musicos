type HttpErrorResponse = {
  status?: number;
  data?: {
    detail?: string;
    message?: string;
  };
};

type HttpErrorLike = {
  response?: HttpErrorResponse;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

export const getHttpErrorResponse = (error: unknown): HttpErrorResponse | undefined => {
  if (!isObject(error)) return undefined;
  const maybeResponse = (error as HttpErrorLike).response;
  if (!isObject(maybeResponse)) return undefined;
  return maybeResponse as HttpErrorResponse;
};

export const getHttpErrorStatus = (error: unknown): number | undefined => {
  const response = getHttpErrorResponse(error);
  return typeof response?.status === 'number' ? response.status : undefined;
};

export const getHttpErrorDetail = (error: unknown): string | undefined => {
  const response = getHttpErrorResponse(error);
  const detail = response?.data?.detail ?? response?.data?.message;
  return typeof detail === 'string' ? detail : undefined;
};
