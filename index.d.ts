export default discoverRelPaymentUrl;

declare function discoverRelPaymentUrl(
  url: URL | string,
  options?: discoverRelPaymentUrl.Options
): Promise<discoverRelPaymentUrl.Results>;

declare namespace discoverRelPaymentUrl {
  export interface PaymentUrl {
    url: URL;
    title: string;
  }

  export interface Results {
    fromLinkHeaders: PaymentUrl[];
    fromAnchors: PaymentUrl[];
    fromLinks: PaymentUrl[];
  }

  export interface Options {
    allowHttp?: Boolean;
  }
}
