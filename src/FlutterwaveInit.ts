import {STANDARD_URL} from './configs';
import ResponseParser from './utils/ResponseParser';
import FlutterwaveInitError from './utils/FlutterwaveInitError';

interface FlutterwavePaymentMeta {
  [k: string]: any;
}

export interface InitCustomer {
  email: string;
  phonenumber?: string;
  name?: string;
}

export interface InitCustomizations {
  title?: string;
  logo?: string;
  description?: string;
}

export interface FlutterwaveInitOptions {
  authorization: string;
  tx_ref: string;
  amount: number;
  currency?: string;
  integrity_hash?: string;
  payment_options: string;
  payment_plan?: number;
  redirect_url: string;
  customer: InitCustomer;
  subaccounts?: Array<number>;
  meta?: Array<FlutterwavePaymentMeta>;
  customizations: InitCustomizations;
}

interface FlutterwaveInitConfig {
  canceller?: AbortController;
}
export type FlutterwaveInitResult = FlutterwaveInitError | string | null;

export interface FieldError {
  field: string;
  message: string;
}

export interface ResponseData {
  status?: 'success' | 'error';
  message: string;
  error_id?: string;
  errors?: Array<FieldError>;
  code?: string;
  data?: {
    link: string;
  };
}

interface FetchOptions {
  method: 'POST';
  body: string;
  headers: Headers;
  signal?: AbortSignal; 
}

/**
 * This function is responsible for making the request to
 * initialize a Flutterwave payment.
 * @param options FlutterwaveInitOptions
 * @return Promise<FlutterwaveInitError | string | null>
 */
export default async function FlutterwaveInit(
  options: FlutterwaveInitOptions,
  config: FlutterwaveInitConfig = {},
): Promise<FlutterwaveInitResult> {
  try {
    // get request body and authorization
    const {authorization, ...body} = options;

    // make request headers
    const headers = new Headers;
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization',  `Bearer ${authorization}`);

    // make fetch options
    const fetchOptions: FetchOptions = {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers,
    }

    // add canceller if defined
    if (config.canceller) {
      fetchOptions.signal = config.canceller.signal
    };

    // initialize payment
    const response = await fetch(STANDARD_URL, fetchOptions);

    // get response data
    const responseData: ResponseData = await response.json();

    // get response json
    const parsedResponse = ResponseParser(responseData);

    // thow error if parsed response is instance of Flutterwave Init Error
    if (parsedResponse instanceof FlutterwaveInitError) {
      throw parsedResponse;
    }

    // resolve with the payment link
    return Promise.resolve(parsedResponse);
  } catch (error) {
    // user error name as code if code is available
    const code = error.code || error.name.toUpperCase();
    // resolve to null if fetch was aborted
    if (code === 'ABORTERROR') {
      return Promise.resolve(null);
    }
    // resolve with error
    return Promise.resolve({...error, code: code});
  }
}
