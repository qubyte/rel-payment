export = discoverRelPaymentUrl;

declare function discoverRelPaymentUrl(
  url: string,
  options?: discoverRelPaymentUrl.Options
): Promise<discoverRelPaymentUrl.PaymentUrl[]>;

declare namespace discoverRelPaymentUrl {
  export interface PaymentUrl {
    uri: string;
    title: string;
  }
  export interface Options {
    allowHttp?: Boolean;
  }
}
