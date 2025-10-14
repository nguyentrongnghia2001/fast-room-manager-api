
export const successHandle = (statusCode, data, message = 'Success') => ({
  statusCode,
  status: 'success',
  data,
  message,
});
